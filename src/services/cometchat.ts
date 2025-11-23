import "@/src/polyfills/native-event-emitter";
import { CometChat } from "@cometchat/chat-sdk-react-native";
import type { CallSettings } from "@cometchat/calls-sdk-react-native";
import { CometChatCalls } from "@cometchat/calls-sdk-react-native";

const CALL_LISTENER_ID = "ISU_CALL_LISTENER";

type GlobalCometChatState = {
  loginPromise: Promise<any> | null;
  loginTargetUid: string | null;
};

// Keep login state on globalThis so it survives Fast Refresh / HMR in dev.
const globalCometChatState: GlobalCometChatState =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).__ISU_COMETCHAT_STATE__ ??
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ((globalThis as any).__ISU_COMETCHAT_STATE__ = {
    loginPromise: null,
    loginTargetUid: null,
  } satisfies GlobalCometChatState);

type CallListenerCallback = (call: CometChat.Call) => void;

export type CallListenerCallbacks = {
  onIncomingCallReceived?: CallListenerCallback;
  onOutgoingCallAccepted?: CallListenerCallback;
  onOutgoingCallRejected?: CallListenerCallback;
  onIncomingCallCancelled?: CallListenerCallback;
  onCallEnded?: CallListenerCallback;
};

const REQUIRED_COMETCHAT_KEYS = [
  "EXPO_PUBLIC_COMETCHAT_APP_ID",
  "EXPO_PUBLIC_COMETCHAT_REGION",
  "EXPO_PUBLIC_COMETCHAT_AUTH_KEY",
] as const;

export const getCometChatEnvStatus = () => {
  const missing = REQUIRED_COMETCHAT_KEYS.filter((key) => !process.env[key]);
  return {
    ok: missing.length === 0,
    missing,
  };
};

const getRequiredEnv = (key: keyof NodeJS.ProcessEnv): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(
      `Missing required CometChat env variable: ${key}. Please set it in .env or app config to enable calls.`,
    );
  }
  return value;
};

let isChatInitialized = false;
let isCallsInitialized = false;

const ensureInitialized = async () => {
  const envStatus = getCometChatEnvStatus();
  if (!envStatus.ok) {
    throw new Error(`Missing CometChat configuration: ${envStatus.missing.join(", ")}`);
  }

  const appId = getRequiredEnv("EXPO_PUBLIC_COMETCHAT_APP_ID");
  const region = getRequiredEnv("EXPO_PUBLIC_COMETCHAT_REGION").toLowerCase();

  if (!isChatInitialized) {
    const appSettings = new CometChat.AppSettingsBuilder()
      .setRegion(region)
      .subscribePresenceForAllUsers()
      .build();

    await CometChat.init(appId, appSettings);
    isChatInitialized = true;
  }

  if (!isCallsInitialized) {
    const callAppSettings = new CometChatCalls.CallAppSettingsBuilder()
      .setAppId(appId)
      .setRegion(region)
      .build();
    await CometChatCalls.init(callAppSettings);
    isCallsInitialized = true;
  }
};

export const initCometChat = ensureInitialized;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const waitForOngoingLogin = async () => {
  if (globalCometChatState.loginPromise) {
    try {
      await globalCometChatState.loginPromise;
    } catch {
      // ignore – caller will re-attempt login if needed
    }
  }

  try {
    return await CometChat.getLoggedinUser();
  } catch {
    return null;
  }
};

export const loginCometChatUser = async (uid: string) => {
  if (!uid) {
    throw new Error("Missing CometChat UID");
  }

  await ensureInitialized();

  const existingUser = await waitForOngoingLogin();
  if (existingUser && typeof existingUser.getUid === "function" && existingUser.getUid() === uid) {
    return existingUser;
  }

  if (globalCometChatState.loginPromise && globalCometChatState.loginTargetUid === uid) {
    return globalCometChatState.loginPromise;
  }

  if (globalCometChatState.loginPromise && globalCometChatState.loginTargetUid && globalCometChatState.loginTargetUid !== uid) {
    // Wait for ongoing different-UID login to settle before starting another.
    try {
      await globalCometChatState.loginPromise;
    } catch {
      // ignore
    }
  }

  const authKey = getRequiredEnv("EXPO_PUBLIC_COMETCHAT_AUTH_KEY");
  globalCometChatState.loginTargetUid = uid;

  const attemptLogin = async (retry = 0): Promise<any> => {
    try {
      const logged = await CometChat.login(uid, authKey);
      const sessionUser = await CometChat.getLoggedinUser().catch(() => null);
      if (!sessionUser) {
        throw new Error("Login succeeded but no CometChat session is active.");
      }
      console.log("[CometChat] login success", sessionUser.getUid?.() ?? uid);
      return logged;
    } catch (error: any) {
      console.warn("[CometChat] login error", { code: error?.code, name: error?.name, message: error?.message, retry });

      const code = error?.code || error?.name;

      // If user is missing, try to create and login once.
      const userNotFound =
        code === "ERR_UID_NOT_FOUND" ||
        code === "USER_NOT_FOUND" ||
        code === "UID_NOT_FOUND" ||
        code === "ERR_USER_NOT_FOUND" ||
        code === "ERR_UID_MISSING";

      if (userNotFound && retry === 0) {
        try {
          const newUser = new CometChat.User(uid);
          newUser.setName(uid);
          await CometChat.createUser(newUser, authKey);
          console.log("[CometChat] created user", uid);
          return await CometChat.login(uid, authKey);
        } catch (createErr: any) {
          console.warn("[CometChat] create user failed", {
            code: createErr?.code,
            name: createErr?.name,
            message: createErr?.message,
          });
          throw createErr;
        }
      }

      const isLoginInProgress =
        error?.code === "LOGIN_IN_PROGRESS" || error?.name === "LOGIN_IN_PROGRESS";

      if (isLoginInProgress && retry < 3) {
        // Another login is still running (often happens during Fast Refresh). Wait and retry.
        await sleep(300);
        return attemptLogin(retry + 1);
      }

      throw error;
    }
  };

  globalCometChatState.loginPromise = attemptLogin().finally(() => {
    globalCometChatState.loginPromise = null;
    globalCometChatState.loginTargetUid = null;
  });

  return globalCometChatState.loginPromise;
};

export const logoutCometChatUser = async () => {
  try {
    await CometChat.logout();
  } catch (error) {
    console.warn("CometChat logout failed", error);
  }
};

export const addCometChatCallListeners = (callbacks: CallListenerCallbacks = {}) => {
  const listener = new CometChat.CallListener({
    onIncomingCallReceived: (call: CometChat.Call) => callbacks.onIncomingCallReceived?.(call),
    onOutgoingCallAccepted: (call: CometChat.Call) => callbacks.onOutgoingCallAccepted?.(call),
    onOutgoingCallRejected: (call: CometChat.Call) => callbacks.onOutgoingCallRejected?.(call),
    onIncomingCallCancelled: (call: CometChat.Call) => callbacks.onIncomingCallCancelled?.(call),
    onCallEndedMessageReceived: (call: CometChat.Call) => callbacks.onCallEnded?.(call),
  });

  CometChat.removeCallListener(CALL_LISTENER_ID);
  CometChat.addCallListener(CALL_LISTENER_ID, listener);

  return () => {
    CometChat.removeCallListener(CALL_LISTENER_ID);
  };
};

const ensureSessionId = (call: CometChat.Call) => {
  const sessionId =
    typeof call?.getSessionId === "function" ? call.getSessionId() : (call as any)?.sessionId;
  if (!sessionId) {
    throw new Error("Missing CometChat session id");
  }
  return sessionId;
};

export const startVideoCall = async (
  receiverId: string,
  receiverType: typeof CometChat.RECEIVER_TYPE[keyof typeof CometChat.RECEIVER_TYPE] = CometChat.RECEIVER_TYPE.USER,
) => {
  await ensureInitialized();

  const call = new CometChat.Call(receiverId, CometChat.CALL_TYPE.VIDEO, receiverType);

  return CometChat.initiateCall(call);
};

export const acceptIncomingCall = async (sessionId: string) => {
  await ensureInitialized();
  return CometChat.acceptCall(sessionId);
};

export const rejectIncomingCall = async (sessionId: string) => {
  await ensureInitialized();
  return CometChat.rejectCall(sessionId, CometChat.CALL_STATUS.REJECTED);
};

export const cancelOutgoingCall = async (sessionId: string) => {
  await ensureInitialized();
  return CometChat.rejectCall(sessionId, CometChat.CALL_STATUS.CANCELLED);
};

export const endCurrentCall = async (sessionId: string) => {
  await ensureInitialized();
  return CometChat.endCall(sessionId);
};

/**
 * Generate a Calls token for the given session.
 *
 * The web frontend uses the logged-in user's auth token (via `getAuthToken()`) when calling
 * `CometChatCalls.generateToken`. The React Native SDK exposes the same method, but the
 * value is not always available on the `authToken` property. Using the method fallback
 * aligns behaviour with the working web implementation and prevents "Missing auth token"
 * errors that block the call UI from loading.
 */
export const getCallTokenForSession = async (sessionId: string) => {
  if (!sessionId) {
    throw new Error("Missing CometChat session id");
  }

  await ensureInitialized();

  const user = await CometChat.getLoggedinUser();
  const authToken =
    (user as any)?.getAuthToken?.() ??
    (user as any)?.authToken ??
    null;

  if (!authToken) {
    throw new Error("Missing CometChat auth token");
  }

  return CometChatCalls.generateToken(sessionId, authToken);
};

type CallSettingsOptions = {
  callEventListener?: InstanceType<typeof CometChatCalls.OngoingCallListener>;
  showRecordingButton?: boolean;
  startRecordingOnCallStart?: boolean;
  isAudioOnly?: boolean;
};

export const getDefaultCallSettings = (options: CallSettingsOptions = {}): CallSettings => {
  const builder = new CometChatCalls.CallSettingsBuilder()
    .enableDefaultLayout(true)
    .setIsAudioOnlyCall(options.isAudioOnly ?? false);

  if (options.callEventListener) {
    builder.setCallEventListener(options.callEventListener);
  }

  builder.showRecordingButton(options.showRecordingButton ?? true);

  if (typeof options.startRecordingOnCallStart === "boolean") {
    builder.startRecordingOnCallStart(options.startRecordingOnCallStart);
  }

  return builder.build();
};

export const createOngoingCallListener = (
  events: ConstructorParameters<typeof CometChatCalls.OngoingCallListener>[0],
) => new CometChatCalls.OngoingCallListener(events);

export const startCallRecording = async () => CometChatCalls.startRecording();

export const stopCallRecording = async () => CometChatCalls.stopRecording();

export const extractSessionIdFromCall = (call: CometChat.Call | null | undefined) => {
  if (!call) {
    return null;
  }
  try {
    return ensureSessionId(call);
  } catch {
    return null;
  }
};

export const getCometChatVariantId = () => process.env.EXPO_PUBLIC_COMETCHAT_VARIANT_ID ?? null;

export const validateCometChatEnv = () => {
  const status = getCometChatEnvStatus();
  if (!status.ok) {
    console.warn("CometChat env missing: ", status.missing.join(", "));
  }
  return status;
};
