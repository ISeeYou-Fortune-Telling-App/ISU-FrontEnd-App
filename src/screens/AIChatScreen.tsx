import Colors from "@/src/constants/colors";
import { chatWithAI } from "@/src/services/api";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { useRouter } from "expo-router";
import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type MessageRole = "user" | "assistant" | "system";

type Attachment = {
  id: string;
  uri: string;
  name?: string;
  mimeType?: string;
};

type AIMessage = {
  id: string;
  role: MessageRole;
  content?: string;
  attachments?: Attachment[];
  createdAt: number;
  processingTime?: number | null;
};

const INITIAL_MESSAGES: AIMessage[] = [
  {
    id: "intro",
    role: "assistant",
    createdAt: Date.now(),
    content:
      "Xin chào! Mình là Trợ lý AI của I See You. Bạn có thể đặt câu hỏi về cảm xúc, sự nghiệp hoặc những trăn trở hằng ngày, mình sẽ phân tích và phản hồi nhanh nhất có thể.",
  },
];

const formatTimestamp = (timestamp: number) =>
  new Date(timestamp).toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });

export default function AIChatScreen() {
  const router = useRouter();
  const listRef = useRef<FlatList<AIMessage>>(null);

  const [messages, setMessages] = useState<AIMessage[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState<string>("");
  const [selectedImages, setSelectedImages] = useState<Attachment[]>([]);
  const [isSending, setIsSending] = useState<boolean>(false);

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
  }, []);

  const handlePickImages = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        multiple: true,
        type: "image/*",
      });

      if (result.canceled || !result.assets?.length) {
        return;
      }

      const timestamp = Date.now();
      const attachments = result.assets
        .filter((asset) => asset.uri)
        .map((asset, index) => ({
          id: `${timestamp}-${index}`,
          uri: asset.uri ?? "",
          name: asset.name,
          mimeType: asset.mimeType ?? "image/jpeg",
        }))
        .filter((item) => item.uri.length > 0);

      setSelectedImages((prev) => [...prev, ...attachments]);
    } catch (error) {
      console.error(error);
      Alert.alert("Không thể chọn ảnh", "Vui lòng thử lại sau.");
    }
  }, []);

  const handleRemoveAttachment = useCallback((attachmentId: string) => {
    setSelectedImages((prev) => prev.filter((item) => item.id !== attachmentId));
  }, []);

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if ((!trimmed && selectedImages.length === 0) || isSending) {
      return;
    }

    const now = Date.now();
    const outgoingMessage: AIMessage = {
      id: `user-${now}`,
      role: "user",
      createdAt: now,
      content: trimmed.length > 0 ? trimmed : undefined,
      attachments: selectedImages.length > 0 ? selectedImages : undefined,
    };

    setMessages((prev) => [...prev, outgoingMessage]);
    setInput("");
    setSelectedImages([]);
    setIsSending(true);
    scrollToEnd();

    const attachmentNotes = selectedImages.map(
      (attachment, index) => `Ảnh đính kèm ${index + 1}: ${attachment.name ?? attachment.uri}`,
    );
    const combinedQuestion = [trimmed, ...attachmentNotes].filter(Boolean).join("\n");

    try {
      const response = await chatWithAI({
        question: combinedQuestion,
        topK: 20,
        forceReindex: false,
      });

      const payload = response?.data?.data;
      const assistantMessage: AIMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        createdAt: Date.now(),
        content:
          payload?.answer ??
          "Xin lỗi, hiện tại mình chưa thể phản hồi yêu cầu này. Bạn hãy thử lại sau nhé!",
        processingTime: payload?.processingTime ?? null,
      };

      setMessages((prev) => [...prev, assistantMessage]);
      scrollToEnd();
    } catch (error: any) {
      console.error(error);
      const fallback =
        error?.response?.data?.message ??
        "Hệ thống đang bận. Bạn vui lòng thử lại sau ít phút.";
      setMessages((prev) => [
        ...prev,
        {
          id: `system-${Date.now()}`,
          role: "system",
          createdAt: Date.now(),
          content: fallback,
        },
      ]);
      scrollToEnd();
    } finally {
      setIsSending(false);
    }
  }, [input, isSending, scrollToEnd, selectedImages]);

  const renderMessage = useCallback(({ item }: { item: AIMessage }) => {
    if (item.role === "system") {
      return (
        <View style={styles.systemMessage}>
          <Ionicons name="warning-outline" size={16} color="#b91c1c" />
          <Text style={styles.systemMessageText}>{item.content}</Text>
        </View>
      );
    }

    const isUser = item.role === "user";

    return (
      <View style={[styles.messageRow, isUser ? styles.alignRight : styles.alignLeft]}>
        {item.attachments?.length ? (
          <View style={[styles.attachmentGroup, isUser && styles.attachmentGroupUser]}>
            {item.attachments.map((attachment) => (
              <Image key={attachment.id} source={{ uri: attachment.uri }} style={styles.messageImage} />
            ))}
          </View>
        ) : null}
        {item.content ? (
          <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.aiBubble]}>
            <Text style={[styles.messageText, isUser && styles.userText]}>{item.content}</Text>
            <Text style={styles.timestampText}>
              {formatTimestamp(item.createdAt)}
              {item.processingTime ? ` (${item.processingTime.toFixed(1)}s)` : ""}
            </Text>
          </View>
        ) : null}
      </View>
    );
  }, []);

  const canSend = useMemo(
    () => input.trim().length > 0 || selectedImages.length > 0,
    [input, selectedImages],
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.black} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Trợ lý AI</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 16 : 0}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            isSending ? (
              <View style={styles.loadingIndicator}>
                <ActivityIndicator size="small" color={Colors.primary} />
                <Text style={styles.loadingText}>AI đang trả lời...</Text>
              </View>
            ) : null
          }
        />

        {selectedImages.length > 0 && (
          <View style={styles.previewRow}>
            {selectedImages.map((attachment) => (
              <View key={attachment.id} style={styles.previewItem}>
                <Image source={{ uri: attachment.uri }} style={styles.previewImage} />
                <TouchableOpacity
                  style={styles.removePreviewButton}
                  onPress={() => handleRemoveAttachment(attachment.id)}
                >
                  <Ionicons name="close" size={14} color={Colors.white} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        <View style={styles.inputRow}>
          <TouchableOpacity style={styles.iconButton} onPress={handlePickImages}>
            <Ionicons name="image-outline" size={22} color={Colors.gray} />
          </TouchableOpacity>
          <TextInput
            style={styles.messageInput}
            placeholder="Bạn muốn hỏi điều gì?"
            placeholderTextColor="#94a3b8"
            multiline
            value={input}
            onChangeText={setInput}
            onSubmitEditing={() => {
              if (Platform.OS === "ios") {
                handleSend();
              }
            }}
            returnKeyType="send"
          />
          <TouchableOpacity
            style={[styles.sendButton, (!canSend || isSending) && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!canSend || isSending}
          >
            {isSending ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <Ionicons name="paper-plane" size={18} color={Colors.white} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.grayBackground,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e2e8f0",
  },
  headerButton: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.black,
  },
  headerPlaceholder: {
    width: 24,
    height: 24,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 12,
  },
  messageRow: {
    gap: 8,
    marginBottom: 6,
  },
  alignLeft: {
    alignSelf: "flex-start",
    alignItems: "flex-start",
  },
  alignRight: {
    alignSelf: "flex-end",
    alignItems: "flex-end",
  },
  attachmentGroup: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 4,
  },
  attachmentGroupUser: {
    justifyContent: "flex-end",
  },
  messageImage: {
    width: 150,
    height: 150,
    borderRadius: 14,
  },
  messageBubble: {
    maxWidth: "80%",
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  userBubble: {
    backgroundColor: Colors.primary,
  },
  aiBubble: {
    backgroundColor: Colors.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#e2e8f0",
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.black,
  },
  userText: {
    color: Colors.white,
  },
  timestampText: {
    marginTop: 6,
    fontSize: 11,
    color: Colors.gray,
  },
  systemMessage: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fee2e2",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  systemMessageText: {
    flex: 1,
    fontSize: 13,
    color: "#b91c1c",
  },
  loadingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    alignSelf: "center",
    paddingVertical: 16,
  },
  loadingText: {
    fontSize: 13,
    color: Colors.gray,
  },
  previewRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  previewItem: {
    position: "relative",
  },
  previewImage: {
    width: 72,
    height: 72,
    borderRadius: 12,
  },
  removePreviewButton: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(0,0,0,0.7)",
    alignItems: "center",
    justifyContent: "center",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.grayBackground,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#e2e8f0",
  },
  messageInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: Colors.black,
    backgroundColor: Colors.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#e2e8f0",
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary,
  },
  sendButtonDisabled: {
    backgroundColor: "#cbd5f5",
  },
});
