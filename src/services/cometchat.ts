import "@/src/polyfills/native-event-emitter";
import { CometChatUIKit, UIKitSettings } from "@cometchat/chat-uikit-react-native";
import { CometChat } from "@cometchat/chat-sdk-react-native";
import { CometChatCalls } from "@cometchat/calls-sdk-react-native";
import * as SecureStore from "expo-secure-store";

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

let isUIKitInitialized = false;
const LOGIN_WAIT_TIMEOUT_MS = 60000;
const LOGIN_IN_PROGRESS_WAIT_BASE_MS = 12000;

let uiKitInitPromise: Promise<void> | null = null;

// Initialize UI Kit (replaces separate Chat and Calls SDK init)
const initUIKit = async () => {
  console.log("[CometChat] initUIKit called, checking promise...");
  if (uiKitInitPromise) {
    console.log("[CometChat] Reusing existing init promise");
    return uiKitInitPromise;
  }

  console.log("[CometChat] Creating new init promise");
  uiKitInitPromise = (async () => {
    try {
      const envStatus = getCometChatEnvStatus();
      console.log("[CometChat] Env status:", envStatus);
      if (!envStatus.ok) {
        throw new Error(`Missing CometChat configuration: ${envStatus.missing.join(", ")}`);
      }

      const appId = process.env.EXPO_PUBLIC_COMETCHAT_APP_ID || "167166294e6dd0180";
      const region = (process.env.EXPO_PUBLIC_COMETCHAT_REGION || "us").toLowerCase();
      const authKey = process.env.EXPO_PUBLIC_COMETCHAT_AUTH_KEY || "69eb85b8b28dbd77670ea910c6f54d4b4faeb92d";

      console.log("[CometChat] Initializing UI Kit...");
      console.log("  APP_ID:", appId);
      console.log("  REGION:", region);

      if (!isUIKitInitialized) {
        console.log("[CometChat] Creating UIKitSettings...");
        const uiKitSettings: UIKitSettings = {
          appId,
          region,
          authKey,
          subscriptionType: "ALL_USERS",
          autoEstablishSocketConnection: true,
        };
        console.log("[CometChat] UIKitSettings created:", { appId, region, subscriptionType: "ALL_USERS" });

        // UI Kit automatically initializes the raw SDK internally
        // DO NOT call CometChat.init() - it causes prototype conflicts
        console.log("[CometChat] Calling CometChatUIKit.init()...");
        await CometChatUIKit.init(uiKitSettings);
        console.log("[CometChat] UI Kit initialized successfully!");

        isUIKitInitialized = true;
      } else {
        console.log("[CometChat] UI Kit already initialized");
      }
    } catch (error) {
      console.error("[CometChat] UI Kit init failed:", error);
      // Reset promise so retry is possible
      uiKitInitPromise = null;
      throw error;
    }
  })();

  return uiKitInitPromise;
};

// Export UI Kit init as the main init function
export const initCometChat = initUIKit;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const withTimeout = <T>(promise: Promise<T>, ms: number, label = "timeout"): Promise<T> =>
  Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(label)), ms),
    ),
  ]);

export const waitForOngoingLogin = async () => {
  if (globalCometChatState.loginPromise) {
    console.log("[CometChat] waiting for ongoing login promise");
    try {
      await withTimeout(globalCometChatState.loginPromise, 10000, "WAIT_LOGIN_TIMEOUT");
    } catch (err) {
      console.warn("[CometChat] timed out waiting for ongoing login, ignoring stuck promise");
      globalCometChatState.loginPromise = null;
      globalCometChatState.loginTargetUid = null;
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

  // 1. Initialize UI Kit first
  await initUIKit();

  // If a different caller is already logging in, wait for it to finish first.
  const existingUser = await waitForOngoingLogin();
  console.log("[CometChat] waitForOngoingLogin returned", existingUser?.getUid?.() ?? "none");
  if (existingUser && typeof existingUser.getUid === "function" && existingUser.getUid() === uid) {
    console.log("[CometChat] reuse existing session", uid);
    return existingUser;
  }

  if (globalCometChatState.loginPromise && globalCometChatState.loginTargetUid === uid) {
    console.log("[CometChat] waiting for ongoing login", uid);
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

  globalCometChatState.loginTargetUid = uid;

  // Simplified login logic using UIKit
  const attemptLogin = async () => {
    try {
      // Check current session
      const current = await CometChat.getLoggedinUser().catch(() => null);
      if (current?.getUid?.() === uid) {
        console.log("[CometChat] Already logged in as", uid);
        return current;
      }

      // Logout if different user
      if (current) {
        console.log("[CometChat] Logging out current user before login");
        await CometChat.logout().catch(() => { });
      }

      console.log("[CometChat] Calling UIKit.login() for", uid);

      // UIKit login is much simpler - auth key already set in init
      const logged = await CometChatUIKit.login({ uid });
      console.log("[CometChat] login() returned successfully!");

      const sessionUser = await CometChat.getLoggedinUser().catch(() => null);
      if (!sessionUser) {
        throw new Error("Login succeeded but no CometChat session is active.");
      }

      const authToken =
        (sessionUser as any)?.getAuthToken?.() ??
        (sessionUser as any)?.authToken ??
        (logged as any)?.getAuthToken?.() ??
        (logged as any)?.authToken ??
        null;
      if (authToken) {
        await SecureStore.setItemAsync("cometAuthToken", authToken).catch(() => { });
      }

      return logged;
    } catch (error: any) {
      // If user is missing, try to create and login once.
      const code = error?.code || error?.name;
      const userNotFound =
        code === "ERR_UID_NOT_FOUND" ||
        code === "USER_NOT_FOUND" ||
        code === "UID_NOT_FOUND" ||
        code === "ERR_USER_NOT_FOUND" ||
        code === "ERR_UID_MISSING";

      if (userNotFound) {
        try {
          const newUser = new CometChat.User(uid);
          newUser.setName(uid);
          // UIKit handles user creation internally, just retry login
          await CometChatUIKit.createUser(newUser);
          console.log("[CometChat] created user", uid);
          const logged = await CometChatUIKit.login({ uid });
          return logged;
        } catch (createErr: any) {
          console.warn("[CometChat] create user failed", {
            code: createErr?.code,
            name: createErr?.name,
            message: createErr?.message,
          });
          throw createErr;
        }
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
  // Avoid interrupting an in-flight login, which can leave the SDK stuck in LOGIN_IN_PROGRESS.
  if (globalCometChatState.loginPromise) {
    try {
      await withTimeout(globalCometChatState.loginPromise, LOGIN_WAIT_TIMEOUT_MS, "LOGOUT_WAIT_LOGIN");
    } catch {
      // ignore and proceed to logout
    }
  }

  try {
    await CometChat.logout();
  } catch (error: any) {
    const isNotLoggedIn =
      error?.code === "USER_NOT_LOGED_IN" || error?.name === "USER_NOT_LOGED_IN";
    if (!isNotLoggedIn) {
      console.warn("CometChat logout failed", error);
    }
  } finally {
    // Clear cached auth token used for call-token generation.
    await SecureStore.deleteItemAsync("cometAuthToken").catch(() => { });
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

export const extractSessionIdFromCall = (call: CometChat.Call | null): string | null => {
  if (!call) return null;
  const sessionId =
    typeof call?.getSessionId === "function" ? call.getSessionId() : (call as any)?.sessionId;
  return sessionId || null;
};

export const startVideoCall = async (
  receiverId: string,
  receiverType: typeof CometChat.RECEIVER_TYPE[keyof typeof CometChat.RECEIVER_TYPE] = CometChat.RECEIVER_TYPE.USER,
) => {
  // UI Kit already initialized calls
  const call = new CometChat.Call(receiverId, CometChat.CALL_TYPE.VIDEO, receiverType);

  return CometChat.initiateCall(call);
};

export const acceptIncomingCall = async (sessionId: string) => {
  return CometChat.acceptCall(sessionId);
};

export const rejectIncomingCall = async (sessionId: string) => {
  return CometChat.rejectCall(sessionId, CometChat.CALL_STATUS.REJECTED);
};

export const cancelOutgoingCall = async (sessionId: string) => {
  return CometChat.rejectCall(sessionId, CometChat.CALL_STATUS.CANCELLED);
};

export const endCurrentCall = async (sessionId: string) => {
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

  // UI Kit already initialized calls
  const user = await CometChat.getLoggedinUser();
  const authToken =
    (user as any)?.getAuthToken?.() ??
    (user as any)?.authToken ??
    (await SecureStore.getItemAsync("cometAuthToken")) ??
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

export const getDefaultCallSettings = (options: CallSettingsOptions = {}) => {
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

export const createOngoingCallListener = (callbacks: {
  onRecordingStarted?: (recording: any) => void;
  onRecordingStopped?: (recording: any) => void;
  onCallEnded?: () => void;
  onSessionTimeout?: () => void;
  onCallEndButtonPressed?: () => void;
  onError?: (error: any) => void;
}) => {
  return new CometChatCalls.OngoingCallListener({
    onRecordingStarted: callbacks.onRecordingStarted,
    onRecordingStopped: callbacks.onRecordingStopped,
    onCallEnded: callbacks.onCallEnded,
    onError: callbacks.onError,
    onCallEndButtonPressed: callbacks.onCallEndButtonPressed,
    onSessionTimeout: callbacks.onSessionTimeout,
    onUserJoined: (user: any) => console.log("User joined:", user),
    onUserLeft: (user: any) => console.log("User left:", user),
    onAudioModesUpdated: (modes: any) => console.log("Audio modes:", modes),
  });
};

export const startCallRecording = async () => {
  console.log("[CometChat] Starting call recording...");
  return CometChatCalls.startRecording();
};

export const stopCallRecording = async () => {
  console.log("[CometChat] Stopping call recording...");
  return CometChatCalls.stopRecording();
};

export const getCometChatVariantId = () => process.env.EXPO_PUBLIC_COMETCHAT_VARIANT_ID ?? null;

export const validateCometChatEnv = () => {
  const status = getCometChatEnvStatus();
  if (!status.ok) {
    console.warn("CometChat env missing: ", status.missing.join(", "));
  }
  return status;
};
