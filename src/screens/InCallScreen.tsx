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
};

export default function InCallScreen({
  visible,
  callToken,
  callSettings,
  onEndCall,
  isEnding = false,
  title,
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
          <Text style={styles.toolbarText}>{title ?? "Cuộc gọi hiện tại"}</Text>
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
  },
  toolbarText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: "600",
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
