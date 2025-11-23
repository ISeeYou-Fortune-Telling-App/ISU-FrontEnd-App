import Colors from "@/src/constants/colors";
import type { CallSettings } from "@cometchat/calls-sdk-react-native";
import { CometChatCalls } from "@cometchat/calls-sdk-react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type InCallScreenProps = {
  visible: boolean;
  callToken: string | null;
  callSettings: CallSettings;
  onEndCall: () => void;
  isEnding?: boolean;
  title?: string;
  onToggleRecording?: () => void;
  isRecording?: boolean;
  isRecordingBusy?: boolean;
};

export default function InCallScreen({
  visible,
  callToken,
  callSettings,
  onEndCall,
  isEnding = false,
  title,
  onToggleRecording,
  isRecording = false,
  isRecordingBusy = false,
}: InCallScreenProps) {
  if (!visible) {
    return null;
  }

  return (
    <Modal visible animationType="slide" presentationStyle="fullScreen" statusBarTranslucent>
      <View style={styles.container}>
        <View style={styles.callSurface}>
          {callToken ? (
            <CometChatCalls.Component callToken={callToken} callSettings={callSettings} />
          ) : (
            <View style={styles.loader}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.loaderText}>Đang kết nối cuộc gọi...</Text>
            </View>
          )}
        </View>

        <View style={styles.toolbar}>
          <View style={styles.toolbarInfo}>
            <Text style={styles.toolbarText}>{title ?? "Cuộc gọi hiện tại"}</Text>
            {onToggleRecording ? (
              <View
                style={[styles.recordingBadge, isRecording ? styles.recordingOn : styles.recordingOff]}
              >
                <View
                  style={[styles.recordingDot, isRecording ? styles.recordingDotOn : styles.recordingDotOff]}
                />
                <Text style={styles.recordingText}>{isRecording ? "Đang ghi" : "Chưa ghi"}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.toolbarActions}>
            {onToggleRecording ? (
              <TouchableOpacity
                style={[
                  styles.secondaryButton,
                  isRecording ? styles.stopRecordingButton : styles.startRecordingButton,
                ]}
                onPress={onToggleRecording}
                disabled={isRecordingBusy || isEnding}
              >
                {isRecordingBusy ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons
                    name={isRecording ? "stop-circle" : "radio-button-on"}
                    size={18}
                    color="#fff"
                  />
                )}
                <Text style={styles.secondaryButtonText}>
                  {isRecording ? "Dừng ghi" : "Ghi lại"}
                </Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              style={styles.hangupButton}
              onPress={onEndCall}
              disabled={isEnding}
            >
              <Ionicons name="call" size={22} color="#fff" style={styles.hangupIcon} />
              <Text style={styles.hangupText}>{isEnding ? "Đang kết thúc..." : "Kết thúc"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.black,
  },
  callSurface: {
    flex: 1,
    backgroundColor: "#000",
  },
  loader: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loaderText: {
    color: Colors.white,
    fontSize: 16,
  },
  toolbar: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    backgroundColor: "rgba(0,0,0,0.8)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  toolbarInfo: {
    flexDirection: "column",
    gap: 6,
    flex: 1,
  },
  toolbarText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: "600",
  },
  recordingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    alignSelf: "flex-start",
  },
  recordingOn: {
    backgroundColor: "rgba(239, 68, 68, 0.18)",
  },
  recordingOff: {
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  recordingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  recordingDotOn: {
    backgroundColor: "#ef4444",
  },
  recordingDotOff: {
    backgroundColor: "#9ca3af",
  },
  recordingText: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: "600",
  },
  toolbarActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 999,
  },
  startRecordingButton: {
    backgroundColor: Colors.primary,
  },
  stopRecordingButton: {
    backgroundColor: "#ef4444",
  },
  secondaryButtonText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: "700",
  },
  hangupButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: "#ef4444",
  },
  hangupIcon: {
    transform: [{ rotate: "135deg" }],
  },
  hangupText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
