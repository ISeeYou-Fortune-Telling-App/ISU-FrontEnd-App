import Colors from "@/src/constants/colors";
import { getChatMessages, sendChatMessage } from "@/src/services/api";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as SecureStore from "expo-secure-store";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type MessageStatus = "sending" | "sent" | "delivered" | "read" | "failed";

type Attachment = {
  id: string;
  uri: string;
  name?: string;
  mimeType?: string;
};

type ChatMessage = {
  id: string;
  role: "incoming" | "outgoing";
  content?: string;
  attachments?: Attachment[];
  status: MessageStatus;
  createdAt: number;
};

const normalizeStatus = (status?: string | null): MessageStatus => {
  switch ((status ?? "").toLowerCase()) {
    case "sending":
      return "sending";
    case "delivered":
      return "delivered";
    case "read":
      return "read";
    case "failed":
      return "failed";
    default:
      return "sent";
  }
};

const mapAttachment = (attachment: any, fallbackId: string): Attachment | null => {
  const uri = attachment?.url ?? attachment?.uri;
  if (!uri) {
    return null;
  }
  return {
    id: String(attachment?.id ?? fallbackId),
    uri,
    name: attachment?.name ?? attachment?.fileName ?? undefined,
    mimeType: attachment?.mimeType ?? attachment?.type ?? "image/jpeg",
  };
};

const mapApiMessage = (item: any, currentUserId: string | null): ChatMessage => {
  const senderId = item?.senderId ?? item?.fromUserId ?? item?.authorId ?? null;
  const createdAt =
    typeof item?.createdAt === "number"
      ? item.createdAt
      : new Date(item?.createdAt ?? item?.timestamp ?? Date.now()).getTime();

  const attachments = Array.isArray(item?.attachments)
    ? (item.attachments
        .map((value: any, index: number) => mapAttachment(value, `${item?.id ?? Date.now()}-${index}`))
        .filter(Boolean) as Attachment[])
    : undefined;

  return {
    id: String(item?.id ?? item?.messageId ?? createdAt),
    role:
      senderId && currentUserId && String(senderId) === String(currentUserId) ? "outgoing" : "incoming",
    content: item?.content ?? item?.text ?? "",
    attachments,
    status: normalizeStatus(item?.status),
    createdAt,
  };
};

export default function ChatDetailScreen() {
  const router = useRouter();
  const { conversationId } = useLocalSearchParams<{ conversationId?: string }>();
  const listRef = useRef<FlatList<ChatMessage>>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState<string>("");
  const [selectedImages, setSelectedImages] = useState<Attachment[]>([]);
  const [conversationTitle, setConversationTitle] = useState<string>("Cuộc trò chuyện");
  const [partnerAvatar, setPartnerAvatar] = useState<string | null>(null);
  const [isPartnerOnline, setIsPartnerOnline] = useState<boolean>(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState<boolean>(false);

  useEffect(() => {
    let active = true;
    const loadUser = async () => {
      try {
        const storedId = await SecureStore.getItemAsync("userId");
        if (active) {
          setCurrentUserId(storedId ?? null);
        }
      } catch (err) {
        console.error(err);
      }
    };
    loadUser();
    return () => {
      active = false;
    };
  }, []);

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: true });
    });
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      scrollToEnd();
    }
  }, [messages, scrollToEnd]);

  const fetchMessages = useCallback(
    async (options: { silent?: boolean; refreshing?: boolean } = {}) => {
      if (!conversationId) {
        return;
      }

      const { silent = false, refreshing = false } = options;

      if (refreshing) {
        setIsRefreshing(true);
      } else if (!silent) {
        setIsLoading(true);
      }

      try {
        setLoadError(null);
        const response = await getChatMessages(conversationId);
        const payload = response?.data?.data;

        const rawMessages = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.messages)
            ? payload.messages
            : Array.isArray(response?.data?.messages)
              ? response.data.messages
              : [];

        const normalized = rawMessages
          .map((item: any) => mapApiMessage(item, currentUserId))
          .sort((a, b) => a.createdAt - b.createdAt);

        const meta =
          payload?.conversation ??
          payload?.conversationInfo ??
          response?.data?.meta ??
          null;

        if (meta) {
          setConversationTitle(
            meta?.name ??
              meta?.title ??
              meta?.partnerName ??
              meta?.seerName ??
              "Cuộc trò chuyện",
          );
          setPartnerAvatar(meta?.avatarUrl ?? meta?.partnerAvatar ?? meta?.seerAvatar ?? null);
          if (typeof meta?.isOnline === "boolean") {
            setIsPartnerOnline(Boolean(meta.isOnline));
          }
        }

        setMessages(normalized);
      } catch (error: any) {
        console.error(error);
        const message =
          error?.response?.data?.message ??
          "Không thể tải lịch sử trò chuyện. Vui lòng thử lại.";
        setLoadError(message);
      } finally {
        if (refreshing) {
          setIsRefreshing(false);
        } else if (!silent) {
          setIsLoading(false);
        }
      }
    },
    [conversationId, currentUserId],
  );

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const handlePickImages = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "image/*",
        copyToCacheDirectory: true,
        multiple: true,
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
    } catch (err) {
      console.error(err);
      Alert.alert("Không thể chọn ảnh", "Vui lòng thử lại sau.");
    }
  }, []);

  const handleRemoveAttachment = useCallback((attachmentId: string) => {
    setSelectedImages((prev) => prev.filter((item) => item.id !== attachmentId));
  }, []);

  const handleSendMessage = useCallback(async () => {
    if (isSending || (!input.trim() && selectedImages.length === 0)) {
      return;
    }
    if (!conversationId) {
      Alert.alert("Không thể gửi tin nhắn", "Không tìm thấy cuộc trò chuyện phù hợp.");
      return;
    }

    const trimmed = input.trim();
    const attachments = selectedImages;
    const localId = `${Date.now()}`;

    const optimisticMessage: ChatMessage = {
      id: localId,
      role: "outgoing",
      content: trimmed.length > 0 ? trimmed : undefined,
      attachments: attachments.length > 0 ? attachments : undefined,
      status: "sending",
      createdAt: Date.now(),
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setInput("");
    setSelectedImages([]);
    setIsSending(true);
    scrollToEnd();

    try {
      let payload: any;
      if (attachments.length > 0) {
        const formData = new FormData();
        if (trimmed.length > 0) {
          formData.append("content", trimmed);
        }
        attachments.forEach((attachment) => {
          formData.append("attachments", {
            uri: attachment.uri,
            name: attachment.name ?? `${attachment.id}.jpg`,
            type: attachment.mimeType ?? "image/jpeg",
          } as any);
        });
        payload = formData;
      } else {
        payload = { content: trimmed };
      }

      const response = await sendChatMessage(conversationId, payload);
      const persisted = mapApiMessage(response?.data?.data, currentUserId);

      setMessages((prev) =>
        prev.map((message) => (message.id === localId ? persisted : message)),
      );
      scrollToEnd();
      fetchMessages({ silent: true });
    } catch (error) {
      console.error(error);
      setMessages((prev) =>
        prev.map((message) =>
          message.id === localId ? { ...message, status: "failed" } : message,
        ),
      );
      Alert.alert("Không thể gửi tin nhắn", "Vui lòng thử lại sau.");
    } finally {
      setIsSending(false);
    }
  }, [conversationId, currentUserId, fetchMessages, input, isSending, scrollToEnd, selectedImages]);

  const canSend = useMemo(
    () => input.trim().length > 0 || selectedImages.length > 0,
    [input, selectedImages],
  );

  const renderMessage = useCallback(
    ({ item }: { item: ChatMessage }) => {
      const isOutgoing = item.role === "outgoing";
      return (
        <View
          style={[
            styles.messageRow,
            isOutgoing ? styles.alignRight : styles.alignLeft,
          ]}
        >
          {item.attachments?.length ? (
            <View style={[styles.attachmentGroup, isOutgoing && styles.attachmentOutgoing]}>
              {item.attachments.map((attachment) => (
                <Image key={attachment.id} source={{ uri: attachment.uri }} style={styles.messageImage} />
              ))}
            </View>
          ) : null}
          {item.content ? (
            <View style={[styles.bubble, isOutgoing ? styles.bubbleOutgoing : styles.bubbleIncoming]}>
              <Text style={[styles.messageText, isOutgoing && styles.messageTextOutgoing]}>
                {item.content}
              </Text>
            </View>
          ) : null}
          {isOutgoing ? (
            <Text style={styles.statusLabel}>
              {item.status === "failed"
                ? "Lỗi"
                : item.status === "sending"
                  ? "Đang gửi..."
                  : item.status === "delivered"
                    ? "Đã giao"
                    : item.status === "read"
                      ? "Đã xem"
                      : "Đã gửi"}
            </Text>
          ) : null}
        </View>
      );
    },
    [],
  );

  const headerInfo = useMemo(
    () => (
      <View style={styles.infoHeader}>
        <View style={styles.avatarWrapper}>
          {partnerAvatar ? (
            <Image source={{ uri: partnerAvatar }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person-outline" size={20} color="#64748b" />
            </View>
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.infoTitle}>{conversationTitle}</Text>
          <Text style={styles.infoSubtitle}>
            {isPartnerOnline ? "Đang hoạt động" : "Ngoại tuyến"}
          </Text>
        </View>
      </View>
    ),
    [conversationTitle, isPartnerOnline, partnerAvatar],
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 16 : 0}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
            <Ionicons name="arrow-back" size={24} color={Colors.black} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Trò chuyện</Text>
          <View style={styles.headerPlaceholder} />
        </View>

        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={headerInfo}
          ListFooterComponent={
            isSending ? (
              <View style={styles.sendingIndicator}>
                <ActivityIndicator size="small" color={Colors.primary} />
                <Text style={styles.sendingText}>Đang gửi tin nhắn...</Text>
              </View>
            ) : (
              <View style={{ height: 12 }} />
            )
          }
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => fetchMessages({ refreshing: true })}
              tintColor={Colors.primary}
              colors={[Colors.primary]}
            />
          }
          ListEmptyComponent={
            isLoading ? (
              <View style={styles.emptyState}>
                <ActivityIndicator size="small" color={Colors.primary} />
                <Text style={styles.emptyText}>Đang tải cuộc trò chuyện...</Text>
              </View>
            ) : loadError ? (
              <TouchableOpacity style={styles.errorState} onPress={() => fetchMessages()}>
                <Ionicons name="warning-outline" size={20} color="#b91c1c" />
                <Text style={styles.errorStateText}>{loadError}</Text>
                <Text style={styles.errorRetryHint}>Nhấn để thử lại</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="chatbubble-ellipses-outline" size={24} color={Colors.gray} />
                <Text style={styles.emptyText}>Hãy gửi tin nhắn đầu tiên để bắt đầu trao đổi.</Text>
              </View>
            )
          }
          showsVerticalScrollIndicator={false}
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
                  <Ionicons name="close" size={16} color={Colors.white} />
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
            placeholder="Nhập tin nhắn..."
            placeholderTextColor="#94a3b8"
            value={input}
            onChangeText={setInput}
            multiline
            onSubmitEditing={() => {
              if (Platform.OS === "ios") {
                handleSendMessage();
              }
            }}
            returnKeyType="send"
          />
          <TouchableOpacity
            style={[styles.sendButton, (!canSend || isSending) && styles.sendButtonDisabled]}
            onPress={handleSendMessage}
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
    paddingTop: 16,
    paddingBottom: 8,
    gap: 12,
  },
  infoHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  avatarWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#e2e8f0",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  avatarPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.black,
  },
  infoSubtitle: {
    marginTop: 2,
    fontSize: 13,
    color: Colors.gray,
  },
  messageRow: {
    gap: 6,
    marginBottom: 8,
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
  attachmentOutgoing: {
    justifyContent: "flex-end",
  },
  messageImage: {
    width: 160,
    height: 160,
    borderRadius: 14,
  },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    maxWidth: "80%",
  },
  bubbleIncoming: {
    backgroundColor: Colors.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#e5e7eb",
  },
  bubbleOutgoing: {
    backgroundColor: Colors.primary,
  },
  messageText: {
    fontSize: 14,
    color: Colors.black,
    lineHeight: 20,
  },
  messageTextOutgoing: {
    color: Colors.white,
  },
  statusLabel: {
    fontSize: 11,
    color: Colors.gray,
    marginTop: 2,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    gap: 10,
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.gray,
    textAlign: "center",
    paddingHorizontal: 24,
  },
  errorState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    gap: 8,
  },
  errorStateText: {
    fontSize: 14,
    color: "#b91c1c",
    textAlign: "center",
    paddingHorizontal: 32,
  },
  errorRetryHint: {
    fontSize: 12,
    color: Colors.gray,
  },
  sendingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    alignSelf: "center",
    paddingVertical: 12,
  },
  sendingText: {
    fontSize: 12,
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
    width: 70,
    height: 70,
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
    backgroundColor: Colors.white,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: Colors.black,
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
