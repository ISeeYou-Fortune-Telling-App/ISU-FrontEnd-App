import Colors from "@/src/constants/colors";
import InCallScreen from "@/src/screens/InCallScreen";
import {
  acceptIncomingCall,
  addCometChatCallListeners,
  cancelOutgoingCall,
  endCurrentCall,
  extractSessionIdFromCall,
  getCallTokenForSession,
  getDefaultCallSettings,
  initCometChat,
  loginCometChatUser,
  waitForOngoingLogin,
  startCallRecording,
  stopCallRecording,
  createOngoingCallListener,
  rejectIncomingCall,
  startVideoCall,
} from "@/src/services/cometchat";
import { CometChat } from "@cometchat/chat-sdk-react-native";
import type { CallSettings } from "@cometchat/calls-sdk-react-native";
import { Ionicons } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";
import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Alert,
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type CallStatus = "idle" | "connecting" | "ringingOut" | "ringingIn" | "inCall" | "ending";

type CallContextValue = {
  status: CallStatus;
  incomingCall: CometChat.Call | null;
  hasActiveCall: boolean;
  startVideoCall: (
    receiverId: string,
    receiverType?: typeof CometChat.RECEIVER_TYPE[keyof typeof CometChat.RECEIVER_TYPE],
  ) => Promise<void>;
  acceptIncomingCall: () => Promise<void>;
  rejectIncomingCall: () => Promise<void>;
  endCall: () => Promise<void>;
  toggleRecording: () => Promise<void>;
  isRecording: boolean;
  isRecordingBusy: boolean;
  isReady: boolean;
};

const CallContext = createContext<CallContextValue | undefined>(undefined);

const getCallParticipantInfo = (
  call: CometChat.Call | null,
  type: "initiator" | "receiver",
) => {
  if (!call) {
    return { name: undefined, avatar: undefined };
  }

  const entity =
    type === "initiator"
      ? (call as any)?.getCallInitiator?.() ??
        (call as any)?.callInitiator ??
        (call as any)?.sender
      : (call as any)?.getCallReceiver?.() ??
        (call as any)?.callReceiver ??
        (call as any)?.receiver;

  const name =
    entity?.getName?.() ??
    entity?.name ??
    entity?.fullName ??
    entity?.uid ??
    entity?.getUid?.() ??
    undefined;

  const avatar = entity?.getAvatar?.() ?? entity?.avatar ?? undefined;
  return { name, avatar };
};

const useEnsureCometChatUser = () => {
  return useCallback(async () => {
    const existing = await waitForOngoingLogin();
    if (existing) {
      return existing;
    }

    const [authToken] = await Promise.all([SecureStore.getItemAsync("authToken")]);
    const storedUid =
      (await SecureStore.getItemAsync("cometChatUid")) ||
      (await SecureStore.getItemAsync("userId"));

    if (!storedUid || !authToken) {
      throw new Error("Missing CometChat credentials");
    }

    return loginCometChatUser(storedUid);
  }, []);
};

export const CallProvider = ({ children }: { children: ReactNode }) => {
  const [status, setStatus] = useState<CallStatus>("idle");
  const [incomingCall, setIncomingCall] = useState<CometChat.Call | null>(null);
  const [outgoingCall, setOutgoingCall] = useState<CometChat.Call | null>(null);
  const [activeCall, setActiveCall] = useState<CometChat.Call | null>(null);
  const [callSettings, setCallSettings] = useState<CallSettings>(() => getDefaultCallSettings());
  const [callToken, setCallToken] = useState<string | null>(null);
  const [callError, setCallError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isRecordingBusy, setIsRecordingBusy] = useState(false);
  const ensureCometChatUser = useEnsureCometChatUser();

  const resetState = useCallback(() => {
    setStatus("idle");
    setIncomingCall(null);
    setOutgoingCall(null);
    setActiveCall(null);
    setCallToken(null);
    setIsRecording(false);
    setIsRecordingBusy(false);
    setCallSettings(getDefaultCallSettings());
  }, []);

  const prepareInCallView = useCallback(
    async (call: CometChat.Call | null) => {
      if (!call) {
        resetState();
        return;
      }

      setActiveCall(call);
      const sessionId = extractSessionIdFromCall(call);

      if (!sessionId) {
        setCallError("Không thể xác định cuộc gọi hiện tại.");
        resetState();
        return;
      }

      try {
        const callEventListener = createOngoingCallListener({
          onRecordingStarted: () => setIsRecording(true),
          onRecordingStopped: () => setIsRecording(false),
          onCallEnded: () => setIsRecording(false),
          onSessionTimeout: () => setIsRecording(false),
        });

        const isAudioOnly = (call as any)?.getType?.() === "audio";

        setCallSettings(
          getDefaultCallSettings({
            callEventListener,
            showRecordingButton: true,
            startRecordingOnCallStart: false,
            isAudioOnly,
          }),
        );

        const { token } = await getCallTokenForSession(sessionId);
        setCallToken(token);
        setStatus("inCall");
      } catch (error) {
        console.warn("Unable to fetch CometChat call token", error);
        setCallError("Không thể mở giao diện cuộc gọi. Vui lòng thử lại.");
        resetState();
      }
    },
    [resetState],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await initCometChat();
        const [uid, authToken] = await Promise.all([
          SecureStore.getItemAsync("cometChatUid"),
          SecureStore.getItemAsync("authToken"),
        ]);
        if (uid && authToken) {
          await loginCometChatUser(uid);
        }
      } catch (error) {
        console.warn("CometChat bootstrap failed", error);
      } finally {
        if (!cancelled) {
          setIsReady(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const remove = addCometChatCallListeners({
      onIncomingCallReceived: (call) => {
        setIncomingCall(call);
        setStatus("ringingIn");
      },
      onOutgoingCallAccepted: (call) => {
        setOutgoingCall(null);
        setStatus("connecting");
        prepareInCallView(call);
      },
      onOutgoingCallRejected: () => {
        setOutgoingCall(null);
        setCallError("Cuộc gọi đã bị từ chối.");
        resetState();
      },
      onIncomingCallCancelled: () => {
        setIncomingCall(null);
        resetState();
      },
      onCallEnded: () => {
        resetState();
      },
    });
    return remove;
  }, [prepareInCallView, resetState]);

  useEffect(() => {
    if (!callError) {
      return;
    }

    const message = callError;
    setCallError(null);
    Alert.alert("Cuộc gọi video", message);
  }, [callError]);

  const handleStartVideoCall = useCallback(
    async (
      receiverId: string,
      receiverType: typeof CometChat.RECEIVER_TYPE[keyof typeof CometChat.RECEIVER_TYPE] = CometChat.RECEIVER_TYPE.USER,
    ) => {
      if (!receiverId) {
        setCallError("Không tìm thấy tài khoản CometChat của người nhận.");
        return;
      }

      if (status !== "idle") {
        setCallError("Bạn đang có cuộc gọi khác.");
        return;
      }

      setStatus("connecting");

      try {
        await ensureCometChatUser();
        const call = await startVideoCall(receiverId, receiverType);
        setOutgoingCall(call);
        setStatus("ringingOut");
      } catch (error: any) {
        console.error("startVideoCall", error);
        setCallError(
          error?.message?.includes("login") || error?.message?.includes("login necessary")
            ? "Vui lòng đăng nhập lại trước khi gọi."
            : "Không thể bắt đầu cuộc gọi. Vui lòng thử lại.",
        );
        resetState();
        throw error;
      }
    },
    [ensureCometChatUser, resetState, status],
  );

  const handleAcceptIncoming = useCallback(async () => {
    if (!incomingCall) {
      return;
    }

    const sessionId = extractSessionIdFromCall(incomingCall);
    if (!sessionId) {
      setCallError("Cuộc gọi không hợp lệ.");
      resetState();
      return;
    }

    setStatus("connecting");

    try {
      await ensureCometChatUser();
      const call = await acceptIncomingCall(sessionId);
      setIncomingCall(null);
      await prepareInCallView(call);
    } catch (error) {
      console.error("acceptIncomingCall", error);
      setCallError("Không thể kết nối cuộc gọi.");
      resetState();
    }
  }, [ensureCometChatUser, incomingCall, prepareInCallView, resetState]);

  const handleRejectIncoming = useCallback(async () => {
    if (!incomingCall) {
      return;
    }

    const sessionId = extractSessionIdFromCall(incomingCall);
    setStatus("ending");

    try {
      if (sessionId) {
        await rejectIncomingCall(sessionId);
      }
    } catch (error) {
      console.warn("rejectIncomingCall", error);
    } finally {
      setIncomingCall(null);
      resetState();
    }
  }, [incomingCall, resetState]);

  const handleEndCall = useCallback(async () => {
    const sessionId =
      extractSessionIdFromCall(activeCall) ??
      extractSessionIdFromCall(outgoingCall) ??
      extractSessionIdFromCall(incomingCall);

    if (!sessionId) {
      resetState();
      return;
    }

    setStatus("ending");

    try {
      if (status === "ringingOut" || status === "connecting") {
        await cancelOutgoingCall(sessionId);
      } else if (status === "ringingIn") {
        await rejectIncomingCall(sessionId);
      } else {
        await endCurrentCall(sessionId);
      }
    } catch (error) {
      console.warn("Unable to end call", error);
    } finally {
      resetState();
    }
  }, [activeCall, incomingCall, outgoingCall, resetState, status]);

  const handleStartRecording = useCallback(async () => {
    if (!callToken || status !== "inCall") {
      setCallError("Chỉ có thể ghi hình khi đang trong cuộc gọi.");
      return;
    }

    setIsRecordingBusy(true);
    try {
      await startCallRecording();
    } catch (error) {
      console.error("startCallRecording", error);
      setCallError("Không thể bắt đầu ghi hình. Vui lòng thử lại.");
    } finally {
      setIsRecordingBusy(false);
    }
  }, [callToken, status]);

  const handleStopRecording = useCallback(async () => {
    setIsRecordingBusy(true);
    try {
      await stopCallRecording();
    } catch (error) {
      console.error("stopCallRecording", error);
      setCallError("Không thể dừng ghi hình. Vui lòng thử lại.");
    } finally {
      setIsRecordingBusy(false);
    }
  }, []);

  const handleToggleRecording = useCallback(async () => {
    if (isRecording) {
      await handleStopRecording();
    } else {
      await handleStartRecording();
    }
  }, [handleStartRecording, handleStopRecording, isRecording]);

  const contextValue = useMemo<CallContextValue>(
    () => ({
      status,
      incomingCall,
      hasActiveCall: Boolean(activeCall || outgoingCall),
      startVideoCall: handleStartVideoCall,
      acceptIncomingCall: handleAcceptIncoming,
      rejectIncomingCall: handleRejectIncoming,
      endCall: handleEndCall,
      toggleRecording: handleToggleRecording,
      isRecording,
      isRecordingBusy,
      isReady,
    }),
    [
      activeCall,
      handleAcceptIncoming,
      handleEndCall,
      handleToggleRecording,
      handleRejectIncoming,
      handleStartVideoCall,
      incomingCall,
      isRecording,
      isRecordingBusy,
      isReady,
      outgoingCall,
      status,
    ],
  );

  const incomingInfo = getCallParticipantInfo(incomingCall, "initiator");
  const outgoingInfo = getCallParticipantInfo(outgoingCall, "receiver");
  const activeInfo = getCallParticipantInfo(activeCall, "receiver");

  return (
    <CallContext.Provider value={contextValue}>
      {children}

      <IncomingCallModal
        visible={status === "ringingIn" && Boolean(incomingCall)}
        name={incomingInfo.name}
        avatar={incomingInfo.avatar}
        onAccept={handleAcceptIncoming}
        onReject={handleRejectIncoming}
      />

      <OutgoingCallModal
        visible={status === "connecting" || status === "ringingOut"}
        name={outgoingInfo.name}
        avatar={outgoingInfo.avatar}
        onCancel={handleEndCall}
      />

      <InCallScreen
        visible={status === "inCall" || status === "ending"}
        callToken={callToken}
        callSettings={callSettings}
        onEndCall={handleEndCall}
        isEnding={status === "ending"}
        title={activeInfo.name}
        onToggleRecording={handleToggleRecording}
        isRecording={isRecording}
        isRecordingBusy={isRecordingBusy}
      />
    </CallContext.Provider>
  );
};

export const useCall = () => {
  const ctx = useContext(CallContext);
  if (!ctx) {
    throw new Error("useCall must be used inside CallProvider");
  }
  return ctx;
};

type ModalProps = {
  visible: boolean;
  name?: string;
  avatar?: string;
  onAccept?: () => void;
  onReject?: () => void;
  onCancel?: () => void;
};

const IncomingCallModal = ({ visible, name, avatar, onAccept, onReject }: ModalProps) => {
  if (!visible) {
    return null;
  }

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          <AvatarBlock name={name} avatar={avatar} />
          <Text style={styles.modalTitle}>Cuộc gọi đến</Text>
          <Text style={styles.modalSubtitle}>{name ?? "Người gọi"}</Text>
          <View style={styles.modalActions}>
            <TouchableOpacity style={[styles.modalButton, styles.rejectButton]} onPress={onReject}>
              <Ionicons name="close" size={24} color="#fff" />
              <Text style={styles.modalButtonText}>Từ chối</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalButton, styles.acceptButton]} onPress={onAccept}>
              <Ionicons name="videocam" size={24} color="#fff" />
              <Text style={styles.modalButtonText}>Trả lời</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const OutgoingCallModal = ({ visible, name, avatar, onCancel }: ModalProps) => {
  if (!visible) {
    return null;
  }

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          <AvatarBlock name={name} avatar={avatar} />
          <Text style={styles.modalTitle}>Đang gọi...</Text>
          <Text style={styles.modalSubtitle}>{name ?? "Liên hệ"}</Text>
          <TouchableOpacity style={[styles.modalButton, styles.rejectButton]} onPress={onCancel}>
            <Ionicons name="close" size={24} color="#fff" />
            <Text style={styles.modalButtonText}>Huỷ cuộc gọi</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const AvatarBlock = ({ name, avatar }: { name?: string; avatar?: string }) => {
  if (avatar) {
    return <Image source={{ uri: avatar }} style={styles.avatar} />;
  }

  const initials = name?.trim()?.charAt(0)?.toUpperCase() ?? "?";
  return (
    <View style={[styles.avatar, styles.avatarFallback]}>
      <Text style={styles.avatarFallbackText}>{initials}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalCard: {
    backgroundColor: Colors.white,
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 32,
    width: "100%",
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.dark_gray,
    marginTop: 12,
  },
  modalSubtitle: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.black,
    marginTop: 4,
  },
  modalActions: {
    flexDirection: "row",
    gap: 16,
    marginTop: 24,
  },
  modalButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 999,
    gap: 8,
    minWidth: 140,
  },
  modalButtonText: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "600",
  },
  acceptButton: {
    backgroundColor: Colors.green,
  },
  rejectButton: {
    backgroundColor: "#ef4444",
  },
  avatar: {
    width: 92,
    height: 92,
    borderRadius: 46,
  },
  avatarFallback: {
    backgroundColor: Colors.lightBlue,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarFallbackText: {
    fontSize: 40,
    fontWeight: "700",
    color: Colors.primary,
  },
});

export type { CallStatus };
