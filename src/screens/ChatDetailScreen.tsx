import Colors from "@/src/constants/colors";
import {
  deleteChatMessage,
  getChatConversation,
  getChatMessages,
  markConversationMessagesRead,
  recallChatMessage,
  sendChatMessage,
} from "@/src/services/api";
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
  Linking,
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
  kind: "image" | "video";
};

type ChatMessage = {
  id: string;
  role: "incoming" | "outgoing";
  content?: string;
  attachments?: Attachment[];
  status: MessageStatus;
  createdAt: number;
  isRecalled?: boolean;
};

const MAX_VIDEO_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB cap to keep uploads reliable
const MAX_VIDEO_DURATION_MS = 3 * 60 * 1000; // 3 minutes max duration

const normalizeStatus = (status?: string | null): MessageStatus => {
  const normalized = (status ?? "").toString().toLowerCase();

  switch (normalized) {
    case "sending":
    case "pending":
      return "sending";
    case "delivered":
      return "delivered";
    case "read":
      return "read";
    case "failed":
    case "error":
      return "failed";
    case "removed":
    case "deleted":
    case "recalled":
      return "sent";
    case "unread":
    case "sent":
    case "success":
      return "sent";
    default:
      return "sent";
  }
};

const mapApiMessage = (item: any, currentUserId: string | null): ChatMessage => {
  const senderId = item?.senderId ?? item?.fromUserId ?? item?.authorId ?? null;
  const baseId = String(item?.id ?? item?.messageId ?? Date.now());
  const createdAt =
    typeof item?.createdAt === "number"
      ? item.createdAt
      : new Date(item?.createdAt ?? item?.timestamp ?? Date.now()).getTime();
  const statusRaw = (item?.status ?? item?.messageStatus ?? "")
    ?.toString()
    .toLowerCase();

  const isRecalled =
    statusRaw === "deleted" || Boolean(item?.recalled ?? item?.isRecalled);

  const attachments: Attachment[] = [];

  if (!isRecalled) {
    const imageUrl = item?.imageUrl ?? item?.image ?? null;
    if (typeof imageUrl === "string" && imageUrl.trim().length > 0) {
      attachments.push({
        id: `${baseId}-image`,
        uri: imageUrl,
        name: "image.jpg",
        mimeType: item?.imageMimeType ?? "image/jpeg",
        kind: "image",
      });
    }

    const videoUrl = item?.videoUrl ?? item?.video ?? null;
    if (typeof videoUrl === "string" && videoUrl.trim().length > 0) {
      attachments.push({
        id: `${baseId}-video`,
        uri: videoUrl,
        name: "video.mp4",
        mimeType: item?.videoMimeType ?? "video/mp4",
        kind: "video",
      });
    }
  }

  return {
    id: baseId,
    role:
      senderId && currentUserId && String(senderId) === String(currentUserId) ? "outgoing" : "incoming",
    content: isRecalled ? undefined : (item?.textContent ?? item?.content ?? item?.text ?? "") || undefined,
    attachments: attachments.length > 0 ? attachments : undefined,
    status: normalizeStatus(item?.status ?? item?.messageStatus),
    createdAt,
    isRecalled,
  };
};

export default function ChatDetailScreen() {
  const router = useRouter();
  const { conversationId } = useLocalSearchParams<{ conversationId?: string }>();
  const listRef = useRef<FlatList<ChatMessage>>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState<string>("");
  const [selectedAttachment, setSelectedAttachment] = useState<Attachment | null>(null);
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
    const loadUserContext = async () => {
      try {
        const storedId = await SecureStore.getItemAsync("userId");
        if (active) {
          setCurrentUserId(storedId ?? null);
        }
      } catch (err) {
        console.error(err);
      }
    };

    loadUserContext();
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
        const [messagesResponse, conversationResponse] = await Promise.all([
          getChatMessages(conversationId, {
            page: 1,
            limit: 100,
            sortType: "asc",
            sortBy: "createdAt",
          }),
          getChatConversation(conversationId),
        ]);

        const messagePayload = messagesResponse?.data?.data;
        const rawMessages = Array.isArray(messagePayload) ? messagePayload : [];

        const normalized = rawMessages
          .map((item: any) => mapApiMessage(item, currentUserId))
          .sort((a, b) => a.createdAt - b.createdAt);

        setMessages(normalized);

        const conversation = conversationResponse?.data?.data ?? null;
        if (conversation) {
          const viewerIsSeer =
            currentUserId &&
            conversation.seerId &&
            String(conversation.seerId) === String(currentUserId);
          const viewerIsCustomer =
            currentUserId &&
            conversation.customerId &&
            String(conversation.customerId) === String(currentUserId);

          if (viewerIsSeer) {
            setConversationTitle(conversation.customerName ?? "Khách hàng");
            setPartnerAvatar(conversation.customerAvatarUrl ?? null);
          } else if (viewerIsCustomer) {
            setConversationTitle(conversation.seerName ?? "Nhà tiên tri");
            setPartnerAvatar(conversation.seerAvatarUrl ?? null);
          } else {
            setConversationTitle(
              conversation.seerName ?? conversation.customerName ?? "Cuộc trò chuyện",
            );
            setPartnerAvatar(
              conversation.seerAvatarUrl ?? conversation.customerAvatarUrl ?? null,
            );
          }

          setIsPartnerOnline(
            (conversation.status ?? "").toString().toUpperCase() === "ACTIVE",
          );
        }

        markConversationMessagesRead(conversationId).catch((err) => {
          console.warn("Không thể đánh dấu đã đọc:", err);
        });
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

  const handlePickImage = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "image/*",
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled || !result.assets?.length) {
        return;
      }

      const asset = result.assets.find((item) => item?.uri);
      if (!asset?.uri) {
        return;
      }

      setSelectedAttachment({
        id: `${Date.now()}`,
        uri: asset.uri,
        name: asset.name ?? undefined,
        mimeType: asset.mimeType ?? "image/jpeg",
        kind: "image",
      });
    } catch (err) {
      console.error(err);
      Alert.alert("Không thể chọn ảnh", "Vui lòng thử lại sau.");
    }
  }, []);

  const handlePickVideo = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "video/*",
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled || !result.assets?.length) {
        return;
      }

      const asset = result.assets.find((item) => item?.uri);
      if (!asset?.uri) {
        return;
      }

      if (typeof asset.size === "number" && asset.size > MAX_VIDEO_SIZE_BYTES) {
        Alert.alert(
          "Video quá lớn",
          "Vui lòng chọn video nhỏ hơn 50MB để đảm bảo quá trình tải lên ổn định.",
        );
        return;
      }

      if (typeof asset.duration === "number" && asset.duration > MAX_VIDEO_DURATION_MS) {
        Alert.alert(
          "Video quá dài",
          "Vui lòng chọn video có độ dài tối đa 3 phút để gửi nhanh hơn.",
        );
        return;
      }

      setSelectedAttachment({
        id: `${Date.now()}`,
        uri: asset.uri,
        name: asset.name ?? undefined,
        mimeType: asset.mimeType ?? "video/mp4",
        kind: "video",
      });
    } catch (err) {
      console.error(err);
      Alert.alert("Không thể chọn video", "Vui lòng thử lại sau.");
    }
  }, []);

  const handleRemoveAttachment = useCallback(() => {
    setSelectedAttachment(null);
  }, []);

  const handleSendMessage = useCallback(async () => {
    const trimmed = input.trim();
    const attachment = selectedAttachment;

    if (isSending || (!trimmed && !attachment)) {
      return;
    }
    if (!conversationId) {
      Alert.alert("Không thể gửi tin nhắn", "Không tìm thấy cuộc trò chuyện phù hợp.");
      return;
    }

    const localId = `${Date.now()}`;
    const optimisticAttachments = attachment ? [attachment] : undefined;

    const optimisticMessage: ChatMessage = {
      id: localId,
      role: "outgoing",
      content: trimmed.length > 0 ? trimmed : undefined,
      attachments: optimisticAttachments,
      status: "sending",
      createdAt: Date.now(),
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setInput("");
    setSelectedAttachment(null);
    setIsSending(true);
    scrollToEnd();

    try {
      let payload: any;
      if (attachment) {
        const formData = new FormData();
        formData.append("conversationId", conversationId);
        if (trimmed.length > 0) {
          formData.append("textContent", trimmed);
        }
        const fieldName = attachment.kind === "video" ? "video" : "image";
        formData.append(
          fieldName,
          {
            uri: attachment.uri,
            name: attachment.name ?? `${attachment.id}.${attachment.kind === "video" ? "mp4" : "jpg"}`,
            type: attachment.mimeType ?? (attachment.kind === "video" ? "video/mp4" : "image/jpeg"),
          } as any,
        );
        payload = formData;
      } else {
        payload = {
          conversationId,
          ...(trimmed.length > 0 ? { textContent: trimmed } : {}),
        };
      }

      const response = await sendChatMessage(conversationId, payload);
      const persistedRaw = response?.data?.data;
      const persisted = persistedRaw
        ? mapApiMessage(persistedRaw, currentUserId)
        : {
            ...optimisticMessage,
            id: `${localId}-persisted`,
            status: "sent" as MessageStatus,
          };

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
  }, [conversationId, currentUserId, fetchMessages, input, isSending, scrollToEnd, selectedAttachment]);

  const handleOpenAttachment = useCallback((uri: string) => {
    if (!uri) {
      return;
    }
    Linking.openURL(uri).catch((err) => {
      console.error("Failed to open attachment", err);
      Alert.alert("Không thể mở tệp", "Vui lòng thử lại sau.");
    });
  }, []);

  const handleDeleteMessage = useCallback(
    (message: ChatMessage) => {
      if (!message.id || message.status === "sending") {
        return;
      }

      Alert.alert("Xóa tin nhắn", "Tin nhắn sẽ bị xóa khỏi thiết bị của bạn.", [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteChatMessage(message.id);
              setMessages((prev) => prev.filter((item) => item.id !== message.id));
            } catch (err: any) {
              console.error("Delete message failed", err);
              const messageText =
                err?.response?.data?.message ?? "Không thể xóa tin nhắn. Vui lòng thử lại.";
              Alert.alert("Lỗi", messageText);
            }
          },
        },
      ]);
    },
    [],
  );

  const handleRecallMessage = useCallback(
    (message: ChatMessage) => {
      if (!message.id || message.status === "sending" || message.isRecalled) {
        return;
      }

      Alert.alert("Thu hồi tin nhắn", "Tin nhắn sẽ bị thu hồi cho tất cả mọi người.", [
        { text: "Hủy", style: "cancel" },
        {
          text: "Thu hồi",
          style: "destructive",
          onPress: async () => {
            try {
              await recallChatMessage(message.id);
              setMessages((prev) =>
                prev.map((item) =>
                  item.id === message.id
                    ? { ...item, isRecalled: true, content: undefined, attachments: undefined }
                    : item,
                ),
              );
              fetchMessages({ silent: true });
            } catch (err: any) {
              console.error("Recall message failed", err);
              const messageText =
                err?.response?.data?.message ?? "Không thể thu hồi tin nhắn. Vui lòng thử lại.";
              Alert.alert("Lỗi", messageText);
            }
          },
        },
      ]);
    },
    [fetchMessages],
  );

  const handleMessageOptions = useCallback(
    (message: ChatMessage) => {
      if (!message.id || message.status === "sending") {
        return;
      }

      const options: { text: string; style?: "default" | "cancel" | "destructive"; onPress?: () => void }[] = [];

      if (message.role === "outgoing" && !message.isRecalled) {
        options.push({ text: "Thu hồi", style: "destructive", onPress: () => handleRecallMessage(message) });
      }

      if (!message.isRecalled) {
        options.push({ text: "Xóa phía tôi", onPress: () => handleDeleteMessage(message) });
      }

      options.push({ text: "Huỷ", style: "cancel" });

      Alert.alert("Tùy chọn", undefined, options);
    },
    [handleDeleteMessage, handleRecallMessage],
  );

  const canSend = useMemo(
    () => input.trim().length > 0 || Boolean(selectedAttachment),
    [input, selectedAttachment],
  );

  const renderMessage = useCallback(
    ({ item }: { item: ChatMessage }) => {
      const isOutgoing = item.role === "outgoing";
      const attachments = !item.isRecalled ? item.attachments ?? [] : [];

      const bubble =
        item.isRecalled ? (
          <View style={[styles.bubble, styles.recalledBubble]}>
            <Text style={styles.recalledText}>Tin nhắn đã được thu hồi</Text>
          </View>
        ) : item.content ? (
          <View style={[styles.bubble, isOutgoing ? styles.bubbleOutgoing : styles.bubbleIncoming]}>
            <Text style={[styles.messageText, isOutgoing && styles.messageTextOutgoing]}>
              {item.content}
            </Text>
          </View>
        ) : null;

      return (
        <TouchableOpacity
          activeOpacity={0.9}
          onLongPress={() => handleMessageOptions(item)}
          delayLongPress={250}
        >
          <View
            style={[
              styles.messageRow,
              isOutgoing ? styles.alignRight : styles.alignLeft,
            ]}
          >
            {attachments.length ? (
              <View style={[styles.attachmentGroup, isOutgoing && styles.attachmentOutgoing]}>
                {attachments.map((attachment) =>
                  attachment.kind === "image" ? (
                    <Image key={attachment.id} source={{ uri: attachment.uri }} style={styles.messageImage} />
                  ) : (
                    <TouchableOpacity
                      key={attachment.id}
                      style={styles.videoAttachment}
                      onPress={() => handleOpenAttachment(attachment.uri)}
                    >
                      <Ionicons name="videocam" size={18} color={Colors.primary} />
                      <Text style={styles.videoText}>Xem video</Text>
                    </TouchableOpacity>
                  ),
                )}
              </View>
            ) : null}
            {bubble}
            {isOutgoing ? (
              <Text style={styles.statusLabel}>
                {item.isRecalled
                  ? "Đã thu hồi"
                  : item.status === "failed"
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
        </TouchableOpacity>
      );
    },
    [handleMessageOptions, handleOpenAttachment],
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

        {selectedAttachment ? (
          <View style={styles.previewRow}>
            <View style={styles.previewItem}>
              {selectedAttachment.kind === "image" ? (
                <Image source={{ uri: selectedAttachment.uri }} style={styles.previewImage} />
              ) : (
                <View style={styles.previewVideo}>
                  <Ionicons name="videocam" size={18} color={Colors.white} />
                  <Text style={styles.previewVideoText}>Video đính kèm</Text>
                </View>
              )}
              <TouchableOpacity style={styles.removePreviewButton} onPress={handleRemoveAttachment}>
                <Ionicons name="close" size={16} color={Colors.white} />
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        <View style={styles.inputRow}>
          <TouchableOpacity style={styles.iconButton} onPress={handlePickImage}>
            <Ionicons name="image-outline" size={22} color={Colors.gray} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={handlePickVideo}>
            <Ionicons name="videocam-outline" size={22} color={Colors.gray} />
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
  videoAttachment: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: "#e0f2fe",
  },
  videoText: {
    fontSize: 13,
    color: "#0369a1",
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
  recalledBubble: {
    backgroundColor: "#e2e8f0",
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
  recalledText: {
    fontSize: 13,
    fontStyle: "italic",
    color: "#475569",
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
  previewVideo: {
    width: 70,
    height: 70,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
    gap: 4,
  },
  previewVideoText: {
    fontSize: 11,
    color: Colors.white,
    textAlign: "center",
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
