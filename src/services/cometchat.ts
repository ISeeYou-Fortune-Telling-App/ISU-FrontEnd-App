import { CometChat } from "@cometchat/chat-sdk-react-native";
import type { CallSettings } from "@cometchat/calls-sdk-react-native";
import { CometChatCalls } from "@cometchat/calls-sdk-react-native";

const CALL_LISTENER_ID = "ISU_CALL_LISTENER";

type CallListenerCallback = (call: CometChat.Call) => void;

export type CallListenerCallbacks = {
  onIncomingCallReceived?: CallListenerCallback;
  onOutgoingCallAccepted?: CallListenerCallback;
  onOutgoingCallRejected?: CallListenerCallback;
  onIncomingCallCancelled?: CallListenerCallback;
  onCallEnded?: CallListenerCallback;
};

const getRequiredEnv = (key: keyof NodeJS.ProcessEnv): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required CometChat env variable: ${key}`);
  }
  return value;
};

let isChatInitialized = false;
let isCallsInitialized = false;

const ensureInitialized = async () => {
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

export const loginCometChatUser = async (uid: string) => {
  if (!uid) {
    throw new Error("Missing CometChat UID");
  }

  await ensureInitialized();

  const existingUser = await CometChat.getLoggedinUser();
  if (existingUser && typeof existingUser.getUid === "function" && existingUser.getUid() === uid) {
    return existingUser;
  }

  const authKey = getRequiredEnv("EXPO_PUBLIC_COMETCHAT_AUTH_KEY");
  return CometChat.login(uid, authKey);
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

export const startVideoCall = async (receiverUid: string) => {
  await ensureInitialized();

  const call = new CometChat.Call(
    receiverUid,
    CometChat.CALL_TYPE.VIDEO,
    CometChat.RECEIVER_TYPE.USER,
  );

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

export const getCallTokenForSession = async (sessionId: string) => {
  const user = await CometChat.getLoggedinUser();
  const authToken = (user as any)?.authToken;

  if (!sessionId) {
    throw new Error("Missing CometChat session id");
  }

  if (!authToken) {
    throw new Error("Missing CometChat auth token");
  }

  return CometChatCalls.generateToken(sessionId, authToken);
};

export const getDefaultCallSettings = (): CallSettings =>
  new CometChatCalls.CallSettingsBuilder()
    .enableDefaultLayout(true)
    .setIsAudioOnlyCall(false)
    .build();

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
