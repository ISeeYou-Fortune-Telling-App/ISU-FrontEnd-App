// CallContext.tsx – Quản lý trạng thái và hành vi gọi video bằng CometChat UI Kit & SDK
// Tạo Context để các component trong app có thể truy cập và điều khiển cuộc gọi

import Colors from "@/src/constants/colors";
import InCallScreen from "@/src/screens/InCallScreen";
import {
  acceptIncomingCall,
  addCometChatCallListeners,
  cancelOutgoingCall,
  createOngoingCallListener,
  endCurrentCall,
  extractSessionIdFromCall,
  getCallTokenForSession,
  getDefaultCallSettings,
  initCometChat,
  rejectIncomingCall,
  startCallRecording,
  startVideoCall,
  stopCallRecording,
} from "@/src/services/cometchat";
import { bootstrapCometChatUser } from "@/src/services/cometchatBootstrap";
import { CometChatCalls } from "@cometchat/calls-sdk-react-native"; // SDK cho tính năng gọi
import { CometChat } from "@cometchat/chat-sdk-react-native"; // raw SDK cho các API core
import { Ionicons } from "@expo/vector-icons";
import React, {
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

// ---------------------------------------------------------------------------
// Kiểu dữ liệu trạng thái cuộc gọi
// ---------------------------------------------------------------------------
type CallStatus =
  | "idle"
  | "connecting"
  | "ringingOut"
  | "ringingIn"
  | "inCall"
  | "ending";

export type CallContextValue = {
  status: CallStatus;
  incomingCall: CometChat.Call | null;
  hasActiveCall: boolean;
  startVideoCall: (
    receiverId: string,
    receiverType?: typeof CometChat.RECEIVER_TYPE[keyof typeof CometChat.RECEIVER_TYPE]
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

export const useCallContext = () => {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error("useCallContext must be used within CallProvider");
  return ctx;
};

// Alias for backward compatibility
export const useCall = useCallContext;

// ---------------------------------------------------------------------------
// Provider – chứa toàn bộ logic
// ---------------------------------------------------------------------------
export const CallProvider = ({ children }: { children: ReactNode }) => {
  // -----------------------------------------------------------------------
  // State
  // -----------------------------------------------------------------------
  const [status, setStatus] = useState<CallStatus>("idle");
  const [incomingCall, setIncomingCall] = useState<CometChat.Call | null>(null);
  const [outgoingCall, setOutgoingCall] = useState<CometChat.Call | null>(null);
  const [activeCall, setActiveCall] = useState<CometChat.Call | null>(null);
  const [callSettings, setCallSettings] = useState<any>(null);
  const [callToken, setCallToken] = useState<string | null>(null);
  const [callError, setCallError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isRecordingBusy, setIsRecordingBusy] = useState(false);

  // -----------------------------------------------------------------------
  // Helper: đảm bảo người dùng đã login CometChat
  // -----------------------------------------------------------------------
  const ensureCometChatUser = useCallback(
    async (options?: { forceRelogin?: boolean }) => {
      await bootstrapCometChatUser({ forceRelogin: options?.forceRelogin });
    },
    []
  );

  // -----------------------------------------------------------------------
  // Reset toàn bộ state khi cuộc gọi kết thúc hoặc có lỗi
  // -----------------------------------------------------------------------
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

  // -----------------------------------------------------------------------
  // Chuẩn bị UI In‑Call khi đã có một cuộc gọi hợp lệ
  // -----------------------------------------------------------------------
  const prepareInCallView = useCallback(async (call: CometChat.Call) => {
    console.log("[CallContext] prepareInCallView called");
    console.log("[CallContext] Call object:", call);
    console.log("[CallContext] Call sessionId:", call?.getSessionId?.());
    
    setActiveCall(call);
    const sessionId = extractSessionIdFromCall(call);
    console.log("[CallContext] Extracted sessionId:", sessionId);
    
    if (!sessionId) {
      console.log("[CallContext] No sessionId found, resetting state");
      setCallError("Không thể xác định session ID của cuộc gọi.");
      resetState();
      return;
    }
    
    try {
      console.log("[CallContext] Creating call event listener...");
      const callEventListener = createOngoingCallListener({
        onRecordingStarted: () => setIsRecording(true),
        onRecordingStopped: () => setIsRecording(false),
        onCallEnded: () => {
          console.log("[CallContext] onCallEnded from listener");
          // Kết thúc UI và reset
          CometChatCalls.endSession();
          CometChat.clearActiveCall();
          setIsRecording(false);
          resetState();
        },
        onSessionTimeout: () => {
          console.log("[CallContext] onSessionTimeout from listener");
          setIsRecording(false);
          setCallError("Phiên gọi đã hết thời gian. Vui lòng gọi lại.");
          resetState();
        },
        onCallEndButtonPressed: async () => {
          console.log("[CallContext] onCallEndButtonPressed from listener");
          try {
            await endCurrentCall(sessionId);
          } catch (e) {
            console.warn("endCurrentCall failed", e);
          } finally {
            CometChatCalls.endSession();
            CometChat.clearActiveCall();
            resetState();
          }
        },
        onError: (err) => {
          console.warn("[CallContext] Call listener error", err);
          setCallError("Có lỗi xảy ra trong quá trình gọi. Vui lòng thử lại.");
          resetState();
        },
      });

      const isAudioOnly = (call as any).getType?.() === "audio";
      console.log("[CallContext] isAudioOnly:", isAudioOnly);
      
      setCallSettings(
        getDefaultCallSettings({
          callEventListener,
          showRecordingButton: true,
          startRecordingOnCallStart: false,
          isAudioOnly,
        })
      );

      console.log("[CallContext] Getting call token for session:", sessionId);
      const { token } = await getCallTokenForSession(sessionId);
      console.log("[CallContext] Got call token:", token ? "yes" : "no");
      
      setCallToken(token);
      setStatus("inCall");
      console.log("[CallContext] Status set to inCall");
    } catch (e) {
      console.error("[CallContext] prepareInCallView error:", e);
      setCallError("Không thể khởi tạo giao diện cuộc gọi.");
      resetState();
    }
  }, [resetState]);

  // -----------------------------------------------------------------------
  // Effect: khởi tạo SDK khi app khởi chạy
  // -----------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await initCometChat();
      } catch (e) {
        console.warn("initCometChat failed", e);
      } finally {
        if (!cancelled) setIsReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // -----------------------------------------------------------------------
  // Effect: lắng nghe các sự kiện gọi
  // -----------------------------------------------------------------------
  useEffect(() => {
    console.log("[CallContext] Setting up call listeners, current status:", status);
    
    const remove = addCometChatCallListeners({
      onIncomingCallReceived: (call) => {
        console.log("[CallContext] onIncomingCallReceived:", call?.getSessionId?.());
        // Nếu đang có cuộc gọi khác, từ chối tự động
        if (status !== "idle" || activeCall || outgoingCall) {
          console.log("[CallContext] Busy - auto rejecting incoming call");
          const sid = extractSessionIdFromCall(call);
          if (sid) {
            try {
              CometChat.rejectCall(sid, CometChat.CALL_STATUS.BUSY);
            } catch (e) {
              console.warn("reject busy failed", e);
            }
          }
          return;
        }
        setIncomingCall(call);
        setStatus("ringingIn");
        console.log("[CallContext] Status set to ringingIn");
      },
      onOutgoingCallAccepted: (call) => {
        console.log("[CallContext] onOutgoingCallAccepted:", call?.getSessionId?.());
        setOutgoingCall(null);
        setStatus("connecting");
        prepareInCallView(call);
      },
      onOutgoingCallRejected: (call) => {
        console.log("[CallContext] onOutgoingCallRejected:", call?.getSessionId?.());
        setOutgoingCall(null);
        setCallError("Cuộc gọi đã bị từ chối.");
        resetState();
      },
      onIncomingCallCancelled: (call) => {
        console.log("[CallContext] onIncomingCallCancelled:", call?.getSessionId?.());
        setIncomingCall(null);
        resetState();
      },
      onCallEnded: (call) => {
        console.log("[CallContext] onCallEnded:", call?.getSessionId?.());
        CometChatCalls.endSession();
        CometChat.clearActiveCall();
        resetState();
      },
    });
    return remove;
  }, [status, activeCall, outgoingCall, prepareInCallView]);

  // -----------------------------------------------------------------------
  // Hiển thị lỗi dưới dạng Alert
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (callError) {
      Alert.alert("Cuộc gọi video", callError);
      setCallError(null);
    }
  }, [callError]);

  // -----------------------------------------------------------------------
  // Các hàm thao tác gọi
  // -----------------------------------------------------------------------
  const handleStartVideoCall = useCallback(
    async (
      receiverId: string,
      receiverType: typeof CometChat.RECEIVER_TYPE[keyof typeof CometChat.RECEIVER_TYPE] =
        CometChat.RECEIVER_TYPE.USER
    ) => {
      console.log("[CallContext] handleStartVideoCall called with:", { receiverId, receiverType });
      
      if (!receiverId) {
        console.log("[CallContext] No receiverId provided");
        setCallError("Không tìm thấy tài khoản CometChat của người nhận.");
        return;
      }
      if (status !== "idle") {
        console.log("[CallContext] Already in a call, current status:", status);
        setCallError("Bạn đang có cuộc gọi khác.");
        return;
      }
      
      console.log("[CallContext] Setting status to connecting...");
      setStatus("connecting");
      
      try {
        console.log("[CallContext] Ensuring CometChat user is logged in...");
        await ensureCometChatUser();
        console.log("[CallContext] CometChat user ready");
        
        const attempt = async () => {
          console.log("[CallContext] Attempting to initiate call to:", receiverId);
          const call = await startVideoCall(receiverId, receiverType);
          console.log("[CallContext] Call initiated successfully, sessionId:", call?.getSessionId?.());
          setOutgoingCall(call);
          setStatus("ringingOut");
          console.log("[CallContext] Status set to ringingOut");
        };
        
        try {
          await attempt();
        } catch (e: any) {
          console.log("[CallContext] First attempt failed:", e?.code, e?.message);
          const needRelogin =
            e?.code === "USER_NOT_LOGED_IN" ||
            e?.code === "AUTH_ERR" ||
            e?.message?.toLowerCase()?.includes("login");
          if (needRelogin) {
            console.log("[CallContext] Re-login required, forcing relogin...");
            await ensureCometChatUser({ forceRelogin: true });
            await attempt();
            return;
          }
          throw e;
        }
      } catch (e: any) {
        console.error("[CallContext] startVideoCall failed:", e);
        setCallError(e?.message ?? "Lỗi khi bắt đầu cuộc gọi.");
        resetState();
      }
    },
    [status, ensureCometChatUser]
  );

  const handleAcceptIncoming = useCallback(async () => {
    console.log("[CallContext] handleAcceptIncoming called");
    if (!incomingCall) {
      console.log("[CallContext] No incoming call to accept");
      return;
    }
    
    const sessionId = extractSessionIdFromCall(incomingCall);
    console.log("[CallContext] Accepting call with sessionId:", sessionId);
    
    if (!sessionId) {
      setCallError("Không xác định được session ID.");
      return;
    }
    
    try {
      setStatus("connecting");
      
      // Đảm bảo CometChat user đã login trước khi accept
      console.log("[CallContext] Ensuring CometChat user before accept...");
      await ensureCometChatUser();
      console.log("[CallContext] CometChat user ready, calling acceptIncomingCall...");
      
      // acceptIncomingCall trả về call object đã được accept
      const acceptedCall = await acceptIncomingCall(sessionId);
      console.log("[CallContext] Call accepted successfully:", acceptedCall?.getSessionId?.());
      
      // Xóa incoming call và chuẩn bị UI cuộc gọi
      setIncomingCall(null);
      
      // Sử dụng acceptedCall nếu có, hoặc fallback về incomingCall
      const callToUse = acceptedCall || incomingCall;
      await prepareInCallView(callToUse);
      
    } catch (e: any) {
      console.error("[CallContext] acceptIncomingCall error:", e);
      setCallError("Không thể chấp nhận cuộc gọi.");
      resetState();
    }
  }, [incomingCall, prepareInCallView, resetState, ensureCometChatUser]);

  const handleRejectIncoming = useCallback(async () => {
    if (!incomingCall) return;
    const sessionId = extractSessionIdFromCall(incomingCall);
    if (!sessionId) {
      setCallError("Không xác định được session ID.");
      resetState();
      return;
    }
    try {
      await rejectIncomingCall(sessionId);
    } catch (e) {
      console.warn("rejectIncomingCall error", e);
    } finally {
      setIncomingCall(null);
      resetState();
    }
  }, [incomingCall]);

  const handleEndCall = useCallback(async () => {
    if (!activeCall) return;
    const sessionId = extractSessionIdFromCall(activeCall);
    if (!sessionId) {
      setCallError("Không xác định được session ID.");
      resetState();
      return;
    }
    try {
      await endCurrentCall(sessionId);
    } catch (e) {
      console.warn("endCurrentCall error", e);
    } finally {
      // SDK sẽ phát onCallEnded, nhưng để chắc chắn reset lại
      resetState();
    }
  }, [activeCall]);

  const handleToggleRecording = useCallback(async () => {
    if (isRecordingBusy) return; // tránh gọi đồng thời
    setIsRecordingBusy(true);
    try {
      if (isRecording) {
        await stopCallRecording();
        setIsRecording(false);
      } else {
        await startCallRecording();
        setIsRecording(true);
      }
    } catch (e) {
      console.warn("recording toggle error", e);
    } finally {
      setIsRecordingBusy(false);
    }
  }, [isRecording, isRecordingBusy]);

  // -----------------------------------------------------------------------
  // Context value
  // -----------------------------------------------------------------------
  const contextValue = useMemo(
    () => ({
      status,
      incomingCall,
      hasActiveCall: !!activeCall,
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
      status,
      incomingCall,
      activeCall,
      handleStartVideoCall,
      handleAcceptIncoming,
      handleRejectIncoming,
      handleEndCall,
      handleToggleRecording,
      isRecording,
      isRecordingBusy,
      isReady,
    ]
  );

  // ---------------------------------------------------------------------------
  // Render UI cho trạng thái đang gọi đi (ringingOut) và cuộc gọi đến (ringingIn)
  // ---------------------------------------------------------------------------
  const renderOutgoingCallUI = () => {
    if (status !== "ringingOut" && status !== "connecting") return null;

    const receiverName = outgoingCall?.getReceiver?.()?.getName?.() ?? "người dùng";

    const handleCancelOutgoing = async () => {
      if (!outgoingCall) {
        resetState();
        return;
      }
      const sessionId = extractSessionIdFromCall(outgoingCall);
      if (sessionId) {
        try {
          await cancelOutgoingCall(sessionId);
        } catch (e) {
          console.warn("cancelOutgoingCall error", e);
        }
      }
      resetState();
    };

    return (
      <Modal visible animationType="fade" transparent statusBarTranslucent>
        <View style={styles.callOverlay}>
          <View style={styles.callCard}>
            <View style={styles.callAvatarPlaceholder}>
              <Ionicons name="person" size={48} color={Colors.gray} />
            </View>
            <Text style={styles.callTitle}>Đang gọi...</Text>
            <Text style={styles.callSubtitle}>{receiverName}</Text>
            <Text style={styles.callHint}>Đang chờ người nhận trả lời</Text>

            <TouchableOpacity style={styles.endCallButton} onPress={handleCancelOutgoing}>
              <Ionicons name="call" size={24} color="#fff" style={styles.endCallIcon} />
              <Text style={styles.endCallText}>Hủy cuộc gọi</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  const renderIncomingCallUI = () => {
    if (status !== "ringingIn" || !incomingCall) return null;

    const callerName = incomingCall?.getSender?.()?.getName?.() ?? "Người dùng";
    const callerAvatar = incomingCall?.getSender?.()?.getAvatar?.() ?? null;

    return (
      <Modal visible animationType="fade" transparent statusBarTranslucent>
        <View style={styles.callOverlay}>
          <View style={styles.callCard}>
            {callerAvatar ? (
              <Image source={{ uri: callerAvatar }} style={styles.callAvatar} />
            ) : (
              <View style={styles.callAvatarPlaceholder}>
                <Ionicons name="person" size={48} color={Colors.gray} />
              </View>
            )}
            <Text style={styles.callTitle}>Cuộc gọi đến</Text>
            <Text style={styles.callSubtitle}>{callerName}</Text>

            <View style={styles.callActions}>
              <TouchableOpacity
                style={[styles.callActionButton, styles.rejectButton]}
                onPress={handleRejectIncoming}
              >
                <Ionicons name="close" size={28} color="#fff" />
                <Text style={styles.callActionText}>Từ chối</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.callActionButton, styles.acceptButton]}
                onPress={handleAcceptIncoming}
              >
                <Ionicons name="call" size={28} color="#fff" />
                <Text style={styles.callActionText}>Trả lời</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <CallContext.Provider value={contextValue}>
      {children}

      {/* UI cho cuộc gọi đi đang chờ */}
      {renderOutgoingCallUI()}

      {/* UI cho cuộc gọi đến */}
      {renderIncomingCallUI()}

      {/* Render InCallScreen khi cuộc gọi đã được kết nối */}
      {activeCall && (
        <InCallScreen
          visible={status === "inCall"}
          callSettings={callSettings}
          callToken={callToken}
          onEndCall={handleEndCall}
          onToggleRecording={handleToggleRecording}
          isRecording={isRecording}
          isRecordingBusy={isRecordingBusy}
          title={`Cuộc gọi với ${activeCall.getReceiver?.()?.getName?.() ?? 'người dùng'}`}
        />
      )}
    </CallContext.Provider>
  );
};

// ---------------------------------------------------------------------------
// Style cho Call UI
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  callOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  callCard: {
    width: "100%",
    maxWidth: 320,
    backgroundColor: "#1e293b",
    borderRadius: 24,
    padding: 32,
    alignItems: "center",
    gap: 16,
  },
  callAvatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    marginBottom: 8,
  },
  callAvatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#334155",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  callTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
  },
  callSubtitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#94a3b8",
  },
  callHint: {
    fontSize: 14,
    color: "#64748b",
    marginTop: 8,
  },
  callActions: {
    flexDirection: "row",
    gap: 24,
    marginTop: 24,
  },
  callActionButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  rejectButton: {
    backgroundColor: "#ef4444",
  },
  acceptButton: {
    backgroundColor: "#22c55e",
  },
  callActionText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#fff",
    marginTop: 2,
  },
  endCallButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 999,
    backgroundColor: "#ef4444",
    marginTop: 24,
  },
  endCallIcon: {
    transform: [{ rotate: "135deg" }],
  },
  endCallText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
