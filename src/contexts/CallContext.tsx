// CallContext.tsx – Quản lý trạng thái và hành vi gọi video bằng CometChat UI Kit & SDK
// Tạo Context để các component trong app có thể truy cập và điều khiển cuộc gọi

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
  startCallRecording,
  stopCallRecording,
  createOngoingCallListener,
  rejectIncomingCall,
  startVideoCall,
} from "@/src/services/cometchat";
import { bootstrapCometChatUser } from "@/src/services/cometchatBootstrap";
import { CometChat } from "@cometchat/chat-sdk-react-native"; // raw SDK cho các API core
import { CometChatCalls } from "@cometchat/calls-sdk-react-native"; // SDK cho tính năng gọi
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
    setActiveCall(call);
    const sessionId = extractSessionIdFromCall(call);
    if (!sessionId) {
      setCallError("Không thể xác định session ID của cuộc gọi.");
      resetState();
      return;
    }
    try {
      const callEventListener = createOngoingCallListener({
        onRecordingStarted: () => setIsRecording(true),
        onRecordingStopped: () => setIsRecording(false),
        onCallEnded: () => {
          // Kết thúc UI và reset
          CometChatCalls.endSession();
          CometChat.clearActiveCall();
          setIsRecording(false);
          resetState();
        },
        onSessionTimeout: () => {
          setIsRecording(false);
          setCallError("Phiên gọi đã hết thời gian. Vui lòng gọi lại.");
          resetState();
        },
        onCallEndButtonPressed: async () => {
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
          console.warn("Call listener error", err);
          setCallError("Có lỗi xảy ra trong quá trình gọi. Vui lòng thử lại.");
          resetState();
        },
      });

      const isAudioOnly = (call as any).getType?.() === "audio";
      setCallSettings(
        getDefaultCallSettings({
          callEventListener,
          showRecordingButton: true,
          startRecordingOnCallStart: false,
          isAudioOnly,
        })
      );

      const { token } = await getCallTokenForSession(sessionId);
      setCallToken(token);
      setStatus("inCall");
    } catch (e) {
      console.warn("prepareInCallView error", e);
      setCallError("Không thể khởi tạo giao diện cuộc gọi.");
      resetState();
    }
  }, []);

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
    const remove = addCometChatCallListeners({
      onIncomingCallReceived: (call) => {
        // Nếu đang có cuộc gọi khác, từ chối tự động
        if (status !== "idle" || activeCall || outgoingCall) {
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
        const attempt = async () => {
          const call = await startVideoCall(receiverId, receiverType);
          setOutgoingCall(call);
          setStatus("ringingOut");
        };
        try {
          await attempt();
        } catch (e: any) {
          const needRelogin =
            e?.code === "USER_NOT_LOGED_IN" ||
            e?.code === "AUTH_ERR" ||
            e?.message?.toLowerCase()?.includes("login");
          if (needRelogin) {
            await ensureCometChatUser({ forceRelogin: true });
            await attempt();
            return;
          }
          throw e;
        }
      } catch (e: any) {
        console.error("startVideoCall", e);
        setCallError(e?.message ?? "Lỗi khi bắt đầu cuộc gọi.");
        resetState();
      }
    },
    [status, ensureCometChatUser]
  );

  const handleAcceptIncoming = useCallback(async () => {
    if (!incomingCall) return;
    const sessionId = extractSessionIdFromCall(incomingCall);
    if (!sessionId) {
      setCallError("Không xác định được session ID.");
      return;
    }
    try {
      await acceptIncomingCall(sessionId);
    } catch (e) {
      console.warn("acceptIncomingCall error", e);
      setCallError("Không thể chấp nhận cuộc gọi.");
    }
  }, [incomingCall]);

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

  return (
    <CallContext.Provider value={contextValue}>
      {children}
      {/* Render InCallScreen khi có cuộc gọi đang diễn ra */}
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
// Style (nếu cần) – hiện tại không dùng, nhưng để tránh lỗi eslint
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({});
