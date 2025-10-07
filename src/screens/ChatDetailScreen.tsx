import Colors from "@/src/constants/colors";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type ChatMessage =
  | {
      id: string;
      type: "system";
      title: string;
      subtitle: string;
    }
  | {
      id: string;
      type: "incoming" | "outgoing";
      content: string;
    };

const MESSAGES: ChatMessage[] = [
  {
    id: "m1",
    type: "system",
    title: "Lịch hẹn đã được xác nhận",
    subtitle: "16:10 đến 16:50",
  },
  {
    id: "m2",
    type: "outgoing",
    content: "Chào thầy! Em muốn tư vấn về tình duyên và sự nghiệp ạ.",
  },
  {
    id: "m3",
    type: "incoming",
    content: "Tất nhiên, em hỏi gì cũng được.",
  },
];

export default function ChatDetailScreen() {
  const router = useRouter();
  const messageBubbles = useMemo(
    () =>
      MESSAGES.map((message) => {
        if (message.type === "system") {
          return (
            <View key={message.id} style={styles.systemMessage}>
              <Ionicons name="star" size={20} color="#0F9D58" />
              <View style={{ marginLeft: 12 }}>
                <Text style={styles.systemTitle}>{message.title}</Text>
                <Text style={styles.systemSubtitle}>{message.subtitle}</Text>
              </View>
            </View>
          );
        }

        const bubbleStyle =
          message.type === "outgoing" ? styles.outgoingBubble : styles.incomingBubble;

        return (
          <View
            key={message.id}
            style={[
              styles.messageRow,
              message.type === "outgoing" ? styles.alignRight : styles.alignLeft,
            ]}
          >
            {message.type === "incoming" && <View style={styles.avatarSmall} />}
            <View style={bubbleStyle}>
              <Text
                style={[
                  styles.messageText,
                  message.type === "incoming" && styles.incomingText,
                ]}
              >
                {message.content}
              </Text>
            </View>
          </View>
        );
      }),
    [],
  );

  return (
    <SafeAreaView style={styles.safeAreaView}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.black} />
        </TouchableOpacity>
        <View style={styles.headerUser}>
          <View style={styles.avatarLarge} />
          <Text style={styles.headerTitle}>Thầy Minh Tuệ</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.select({ ios: "padding", android: undefined })}
        keyboardVerticalOffset={Platform.OS === "ios" ? 16 : 0}
      >
        <ScrollView contentContainerStyle={styles.messagesContainer}>
          {messageBubbles}
        </ScrollView>

        <View style={styles.inputContainer}>
          <TextInput
            placeholder="Nhập tin nhắn..."
            placeholderTextColor="#a0aec0"
            style={styles.messageInput}
          />
          <TouchableOpacity style={styles.iconButton}>
            <Ionicons name="image-outline" size={22} color={Colors.gray} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.sendButton}>
            <Ionicons name="paper-plane" size={20} color={Colors.white} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeAreaView: {
    flex: 1,
    backgroundColor: Colors.grayBackground,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: Colors.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e2e8f0",
  },
  backButton: {
    paddingRight: 12,
    paddingVertical: 4,
  },
  headerUser: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarLarge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#d9dde3",
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: "inter",
    color: Colors.black,
    marginLeft: 12,
  },
  messagesContainer: {
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  systemMessage: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#c6f6d5",
    borderRadius: 12,
    padding: 16,
    alignSelf: "center",
    maxWidth: "80%",
    marginBottom: 16,
  },
  systemTitle: {
    fontSize: 14,
    fontFamily: "inter",
    color: Colors.black,
  },
  systemSubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: "#0F9D58",
    fontFamily: "inter",
  },
  messageRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: 16,
  },
  alignLeft: {
    alignSelf: "flex-start",
  },
  alignRight: {
    alignSelf: "flex-end",
  },
  avatarSmall: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#d9dde3",
    marginRight: 10,
  },
  incomingBubble: {
    backgroundColor: Colors.white,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#d1d5db",
    maxWidth: 260,
  },
  outgoingBubble: {
    backgroundColor: "#1d4ed8",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    maxWidth: 260,
  },
  messageText: {
    fontSize: 14,
    color: Colors.white,
    fontFamily: "inter",
  },
  incomingText: {
    color: Colors.black,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#e2e8f0",
  },
  messageInput: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#d1d5db",
    paddingHorizontal: 14,
    fontSize: 14,
    fontFamily: "inter",
    color: Colors.black,
    backgroundColor: Colors.white,
  },
  iconButton: {
    padding: 8,
    marginLeft: 12,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 4,
  },
});
