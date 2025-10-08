import Colors from "@/src/constants/colors";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as DocumentPicker from "expo-document-picker";
import * as MediaLibrary from "expo-media-library";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type MessageStatus = "sending" | "sent" | "delivered" | "read";

type MessageAttachment = {
  id: string;
  uri: string;
  type: "image";
};

type SystemMessage = {
  id: string;
  type: "system";
  title: string;
  subtitle: string;
};

type UserMessage = {
  id: string;
  type: "incoming" | "outgoing";
  content?: string;
  attachments?: MessageAttachment[];
  status: MessageStatus;
  liked?: boolean;
  replyToId?: string;
  recalled?: boolean;
  timestamp: number;
};

type ChatMessage = SystemMessage | UserMessage;

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: "m1",
    type: "system",
    title: "Lịch hẹn đã được xác nhận",
    subtitle: "16:10 - 16:50",
  },
  {
    id: "m2",
    type: "outgoing",
    content: "Chào thầy! Em muốn tư vấn về tình duyên và sự nghiệp ạ.",
    status: "read",
    timestamp: Date.now() - 1000 * 60 * 5,
  },
  {
    id: "m3",
    type: "incoming",
    content: "Tất nhiên, em hỏi gì cũng được.",
    status: "read",
    timestamp: Date.now() - 1000 * 60 * 4,
  },
];

const SHARE_TARGETS = [
  { id: "c1", name: "I See You Admin" },
  { id: "c2", name: "I See You Chat Bot" },
  { id: "c3", name: "Thay Minh Tue" },
  { id: "c4", name: "Nhom Duy Tam" },
];

const isUserMessage = (message: ChatMessage): message is UserMessage =>
  message.type === "incoming" || message.type === "outgoing";

export default function ChatDetailScreen() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);

  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [messageText, setMessageText] = useState("");
  const [selectedImages, setSelectedImages] = useState<MessageAttachment[]>([]);
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [viewerUri, setViewerUri] = useState<string | null>(null);
  const [actionMessageId, setActionMessageId] = useState<string | null>(null);
  const [isActionSheetVisible, setIsActionSheetVisible] = useState(false);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [shareMessage, setShareMessage] = useState<UserMessage | null>(null);
  const [isActive] = useState(true);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  const replyTarget = useMemo(() => {
    if (!replyToId) {
      return null;
    }

    return messages.find(
      (message) => isUserMessage(message) && message.id === replyToId,
    ) as UserMessage | null;
  }, [messages, replyToId]);

  const canSend =
    selectedImages.length > 0 || messageText.trim().length > 0 || replyToId !== null;

  const handlePickImages = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "image/*",
        copyToCacheDirectory: true,
        multiple: true,
      });

      if (!result.canceled && result.assets?.length) {
        const attachments = result.assets
          .filter((asset) => asset.uri)
          .map((asset, index) => ({
            id: `${Date.now()}-${index}`,
            uri: asset.uri ?? "",
            type: "image" as const,
          }))
          .filter((attachment) => attachment.uri.length > 0);

        if (attachments.length > 0) {
          setSelectedImages((prev) => [...prev, ...attachments]);
        }
      }
    } catch (error) {
      console.warn("Failed to pick images", error);
    }
  };

  const handleRemovePreview = (attachmentId: string) => {
    setSelectedImages((prev) => prev.filter((attachment) => attachment.id !== attachmentId));
  };

  const updateMessageStatus = (messageId: string, status: MessageStatus) => {
    setMessages((prev) =>
      prev.map((message) => {
        if (message.id === messageId && isUserMessage(message)) {
          return { ...message, status };
        }
        return message;
      }),
    );
  };

  const simulateStatusLifecycle = (messageId: string) => {
    setTimeout(() => updateMessageStatus(messageId, "sent"), 400);
    setTimeout(() => updateMessageStatus(messageId, "delivered"), 1100);
    setTimeout(() => updateMessageStatus(messageId, "read"), 2200);
  };

  const handleSend = () => {
    if (!canSend) {
      return;
    }

    const trimmedText = messageText.trim();

    const newMessage: UserMessage = {
      id: `${Date.now()}`,
      type: "outgoing",
      status: "sending",
      timestamp: Date.now(),
      content: trimmedText.length > 0 ? trimmedText : undefined,
      attachments: selectedImages.length > 0 ? selectedImages : undefined,
      replyToId: replyToId ?? undefined,
    };

    setMessages((prev) => [...prev, newMessage]);
    setMessageText("");
    setSelectedImages([]);
    setReplyToId(null);
    simulateStatusLifecycle(newMessage.id);
  };

  const handleLongPressMessage = (message: UserMessage) => {
    setActionMessageId(message.id);
    setIsActionSheetVisible(true);
  };

  const handleToggleHeart = (messageId: string) => {
    setMessages((prev) =>
      prev.map((message) => {
        if (message.id === messageId && isUserMessage(message)) {
          return { ...message, liked: !message.liked };
        }
        return message;
      }),
    );
    setIsActionSheetVisible(false);
  };

  const handleRecallMessage = (messageId: string) => {
    setMessages((prev) =>
      prev.map((message) => {
        if (message.id === messageId && isUserMessage(message)) {
          return {
            ...message,
            content: "Tin nhắn đã được thu hồi",
            attachments: undefined,
            recalled: true,
          };
        }
        return message;
      }),
    );
    setIsActionSheetVisible(false);
  };

  const handleCopyMessage = async (message: UserMessage) => {
    if (message.content) {
      await Clipboard.setStringAsync(message.content);
      Alert.alert("Đã sao chép", "Nội dung tin nhắn đã được sao chép.");
    }
    setIsActionSheetVisible(false);
  };

  const handleReplyToMessage = (messageId: string) => {
    setReplyToId(messageId);
    setIsActionSheetVisible(false);
  };

  const handleViewImage = (uri: string) => {
    setViewerUri(uri);
    setIsActionSheetVisible(false);
  };

  const handleSaveImage = async (uri: string) => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Không thể lưu", "Vui lòng cấp quyền truy cập thư viện ảnh.");
        return;
      }
      await MediaLibrary.saveToLibraryAsync(uri);
      Alert.alert("Đã lưu ảnh", "Ảnh đã được lưu vào thư viện.");
    } catch (error) {
      Alert.alert("Không thể lưu", "Đã có lỗi xảy ra, vui lòng thử lại sau.");
    } finally {
      setIsActionSheetVisible(false);
    }
  };

  const handleShareMessage = (message: UserMessage) => {
    setShareMessage(message);
    setShareModalVisible(true);
    setIsActionSheetVisible(false);
  };

  const handleCloseShareModal = () => {
    setShareModalVisible(false);
    setShareMessage(null);
  };

  const handleShareToTarget = (targetName: string) => {
    Alert.alert("Da chia se", `Tin nhan da duoc chia se toi ${targetName}.`);
    handleCloseShareModal();
  };

  const selectedActionMessage = useMemo(() => {
    if (!actionMessageId) {
      return null;
    }
    const target = messages.find(
      (message) => isUserMessage(message) && message.id === actionMessageId,
    );
    return target ? (target as UserMessage) : null;
  }, [actionMessageId, messages]);

  const getStatusLabel = (status: MessageStatus) => {
    switch (status) {
      case "sending":
        return "Đang gửi...";
      case "sent":
        return "Đã gửi";
      case "delivered":
        return "Đã giao";
      case "read":
        return "Đã xem";
      default:
        return "";
    }
  };

  const renderReplySnippet = (message: UserMessage) => {
    if (!message.replyToId) {
      return null;
    }
    const repliedMessage = messages.find(
      (item) => isUserMessage(item) && item.id === message.replyToId,
    ) as UserMessage | undefined;

    if (!repliedMessage) {
      return null;
    }

    return (
      <View style={styles.replySnippet}>
        <Text style={styles.replyLabel}>Tra loi</Text>
        {repliedMessage.content ? (
          <Text numberOfLines={2} style={styles.replyText}>
            {repliedMessage.content}
          </Text>
        ) : (
          <Text style={styles.replyText}>Anh da gui</Text>
        )}
      </View>
    );
  };

  const renderActionSheet = () => {
    if (!selectedActionMessage || !isActionSheetVisible) {
      return null;
    }

    const options: Array<{
      label: string;
      onPress: () => void;
      icon: keyof typeof Ionicons.glyphMap;
      disabled?: boolean;
    }> = [];

    options.push({
      label: selectedActionMessage.liked ? "Bỏ tim" : "Thả tim",
      onPress: () => handleToggleHeart(selectedActionMessage.id),
      icon: "heart",
    });

    if (selectedActionMessage.content && !selectedActionMessage.recalled) {
      options.push({
        label: "Sao chép",
        onPress: () => handleCopyMessage(selectedActionMessage),
        icon: "copy",
      });
    }

    if (selectedActionMessage.attachments?.length) {
      options.push({
        label: "Xem ảnh",
        onPress: () => handleViewImage(selectedActionMessage.attachments![0].uri),
        icon: "image",
      });
      options.push({
        label: "Lưu ảnh",
        onPress: () => handleSaveImage(selectedActionMessage.attachments![0].uri),
        icon: "download",
      });
    }

    options.push({
      label: "Trả lời",
      onPress: () => handleReplyToMessage(selectedActionMessage.id),
      icon: "return-up-back",
      disabled: selectedActionMessage.recalled,
    });

    options.push({
      label: "Chia sẻ...",
      onPress: () => handleShareMessage(selectedActionMessage),
      icon: "share-outline",
      disabled: selectedActionMessage.recalled,
    });

    if (selectedActionMessage.type === "outgoing" && !selectedActionMessage.recalled) {
      options.push({
        label: "Thu hồi",
        onPress: () => handleRecallMessage(selectedActionMessage.id),
        icon: "trash",
      });
    }

    return (
      <Modal transparent visible animationType="fade" onRequestClose={() => setIsActionSheetVisible(false)}>
        <Pressable style={styles.actionSheetBackdrop} onPress={() => setIsActionSheetVisible(false)}>
          <View style={styles.actionSheetContainer}>
            {options.map((option) => (
              <TouchableOpacity
                key={option.label}
                style={[
                  styles.actionSheetButton,
                  option.disabled && styles.actionSheetButtonDisabled,
                ]}
                onPress={option.onPress}
                disabled={option.disabled}
              >
                <Ionicons
                  name={option.icon}
                  size={18}
                  color={option.disabled ? Colors.gray : Colors.black}
                />
                <Text
                  style={[
                    styles.actionSheetText,
                    option.disabled && styles.actionSheetTextDisabled,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>
    );
  };

  return (
    <SafeAreaView style={styles.safeAreaView}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.black} />
        </TouchableOpacity>
        <View style={styles.headerUser}>
          <View style={styles.avatarLarge} />
          <View>
            <View style={styles.userRow}>
              <Text style={styles.headerTitle}>Thay Minh Tue</Text>
              <View style={[styles.statusDot, isActive ? styles.dotOnline : styles.dotOffline]} />
            </View>
            <Text style={styles.headerSubtitle}>
              {isActive ? "Đang hoạt động" : "Ngoại tuyến"}
            </Text>
          </View>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.select({ ios: "padding", android: "height" })}
        keyboardVerticalOffset={Platform.OS === "ios" ? 16 : 0}
        enabled
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.messagesContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {messages.map((message) => {
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

          const isOutgoing = message.type === "outgoing";
          const hasAttachments = Boolean(message.attachments?.length);
          const showBubble = Boolean(message.content || message.replyToId || !hasAttachments);

          return (
            <View
              key={message.id}
              style={[
                  styles.messageRow,
                  isOutgoing ? styles.alignRight : styles.alignLeft,
                ]}
              >
                {!isOutgoing && <View style={styles.avatarSmall} />}

                <Pressable
                  onLongPress={() => handleLongPressMessage(message)}
                  delayLongPress={200}
                  style={styles.messagePressable}
                >
                  {hasAttachments && (
                    <View
                      style={[
                        styles.attachmentsRow,
                        isOutgoing ? styles.attachmentsRowOutgoing : styles.attachmentsRowIncoming,
                      ]}
                    >
                      {message.attachments!.map((attachment) => (
                        <TouchableOpacity
                          key={attachment.id}
                          activeOpacity={0.85}
                          style={[
                            styles.attachmentWrapper,
                            isOutgoing
                              ? styles.attachmentWrapperOutgoing
                              : styles.attachmentWrapperIncoming,
                          ]}
                          onPress={() => handleViewImage(attachment.uri)}
                          onLongPress={() => handleLongPressMessage(message)}
                        >
                          <Image source={{ uri: attachment.uri }} style={styles.messageImage} />
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  {showBubble && (
                    <View
                      style={[
                        isOutgoing ? styles.outgoingBubble : styles.incomingBubble,
                        message.recalled && styles.recalledBubble,
                        hasAttachments && styles.bubbleWithAttachments,
                      ]}
                    >
                      {renderReplySnippet(message)}
                      {message.content && (
                        <Text
                          style={[
                            styles.messageText,
                            !isOutgoing && styles.incomingText,
                            message.recalled && styles.recalledText,
                          ]}
                        >
                          {message.content}
                        </Text>
                      )}
                    </View>
                  )}

                  {message.liked && (
                    <View style={[styles.reactionBadge, isOutgoing ? styles.reactionOutgoing : styles.reactionIncoming]}>
                      <Ionicons name="heart" size={12} color="#f43f5e" />
                    </View>
                  )}
                </Pressable>

                {isOutgoing && !message.recalled && (
                  <Text style={styles.statusText}>{getStatusLabel(message.status)}</Text>
                )}
              </View>
            );
          })}
        </ScrollView>

        {replyTarget && (
          <View style={styles.replyComposer}>
            <View style={{ flex: 1 }}>
              <Text style={styles.replyComposerLabel}>Dang tra loi</Text>
              <Text numberOfLines={2} style={styles.replyComposerText}>
                {replyTarget.content ?? "Ảnh được gửi"}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setReplyToId(null)}>
              <Ionicons name="close" size={18} color={Colors.gray} />
            </TouchableOpacity>
          </View>
        )}

        {selectedImages.length > 0 && (
          <View style={styles.previewRow}>
            {selectedImages.map((attachment) => (
              <View key={attachment.id} style={styles.previewContainer}>
                <Image source={{ uri: attachment.uri }} style={styles.previewImage} />
                <TouchableOpacity
                  style={styles.removePreviewButton}
                  onPress={() => handleRemovePreview(attachment.id)}
                >
                  <Ionicons name="close" size={14} color={Colors.white} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        <View style={styles.inputContainer}>
          <TextInput
            placeholder="Nhập tin nhắn..."
            placeholderTextColor="#a0aec0"
            style={styles.messageInput}
            value={messageText}
            onChangeText={setMessageText}
            multiline
            onSubmitEditing={handleSend}
            blurOnSubmit={false}
            returnKeyType="send"
          />
          <TouchableOpacity style={styles.iconButton} onPress={handlePickImages}>
            <Ionicons name="image-outline" size={22} color={Colors.gray} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sendButton, !canSend && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!canSend}
          >
            <Ionicons
              name="paper-plane"
              size={20}
              color={canSend ? Colors.white : "#e2e8f0"}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <Modal
        transparent
        visible={viewerUri !== null}
        animationType="fade"
        onRequestClose={() => setViewerUri(null)}
      >
        <Pressable style={styles.viewerBackdrop} onPress={() => setViewerUri(null)}>
          <Image source={{ uri: viewerUri ?? undefined }} style={styles.viewerImage} resizeMode="contain" />
          <TouchableOpacity style={styles.viewerCloseButton} onPress={() => setViewerUri(null)}>
            <Ionicons name="close" size={22} color={Colors.white} />
          </TouchableOpacity>
        </Pressable>
      </Modal>

      <Modal
        transparent
        visible={shareModalVisible}
        animationType="slide"
        onRequestClose={handleCloseShareModal}
      >
        <View style={styles.shareBackdrop}>
          <View style={styles.shareContainer}>
            <View style={styles.shareHeader}>
              <Text style={styles.shareTitle}>Chia se tin nhan</Text>
              <TouchableOpacity onPress={handleCloseShareModal}>
                <Ionicons name="close" size={20} color={Colors.gray} />
              </TouchableOpacity>
            </View>

            {shareMessage && (
              <View style={styles.sharePreview}>
                <Text style={styles.sharePreviewLabel}>Noi dung</Text>
                {shareMessage.content ? (
                  <Text numberOfLines={2} style={styles.sharePreviewText}>
                    {shareMessage.content}
                  </Text>
                ) : (
                  <Text style={styles.sharePreviewText}>Anh dinh kem</Text>
                )}
                {shareMessage.attachments?.length ? (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sharePreviewAttachments}>
                    {shareMessage.attachments.map((attachment) => (
                      <Image
                        key={attachment.id}
                        source={{ uri: attachment.uri }}
                        style={styles.sharePreviewImage}
                      />
                    ))}
                  </ScrollView>
                ) : null}
              </View>
            )}

            <Text style={styles.shareTargetLabel}>Chia se toi</Text>
            <ScrollView style={styles.shareList}>
              {SHARE_TARGETS.map((target) => (
                <TouchableOpacity
                  key={target.id}
                  style={styles.shareItem}
                  onPress={() => handleShareToTarget(target.name)}
                >
                  <View style={styles.shareAvatar} />
                  <Text style={styles.shareName}>{target.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {renderActionSheet()}
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
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#d9dde3",
    marginRight: 10,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: "inter",
    color: Colors.black,
    marginRight: 8,
  },
  headerSubtitle: {
    fontSize: 12,
    color: Colors.gray,
    marginTop: 2,
    fontFamily: "inter",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: Colors.white,
  },
  dotOnline: {
    backgroundColor: "#16a34a",
  },
  dotOffline: {
    backgroundColor: "#f1f5f9",
  },
  messagesContainer: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    paddingBottom: 40,
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
  messagePressable: {
    position: "relative",
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
    maxWidth: 280,
  },
  outgoingBubble: {
    backgroundColor: "#1d4ed8",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    maxWidth: 280,
  },
  recalledBubble: {
    backgroundColor: "#f1f5f9",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#cbd5f5",
  },
  messageText: {
    fontSize: 14,
    color: Colors.white,
    fontFamily: "inter",
  },
  incomingText: {
    color: Colors.black,
  },
  recalledText: {
    color: Colors.gray,
    fontStyle: "italic",
  },
  replySnippet: {
    padding: 10,
    borderLeftWidth: 2,
    borderLeftColor: Colors.primary,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 12,
    marginBottom: 8,
  },
  replyLabel: {
    fontSize: 11,
    color: Colors.gray,
    marginBottom: 4,
    fontFamily: "inter",
  },
  replyText: {
    fontSize: 13,
    color: Colors.black,
    fontFamily: "inter",
  },
  attachmentsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  attachmentsRowOutgoing: {
    justifyContent: "flex-end",
  },
  attachmentsRowIncoming: {
    justifyContent: "flex-start",
  },
  attachmentWrapper: {
    borderRadius: 16,
    overflow: "hidden",
  },
  attachmentWrapperOutgoing: {
    backgroundColor: "transparent",
  },
  attachmentWrapperIncoming: {
    backgroundColor: Colors.white,
  },
  messageImage: {
    width: 180,
    height: 180,
  },
  bubbleWithAttachments: {
    marginTop: 4,
  },
  reactionBadge: {
    position: "absolute",
    bottom: -8,
    right: -8,
    backgroundColor: Colors.white,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#e2e8f0",
  },
  reactionOutgoing: {
    alignSelf: "flex-end",
  },
  reactionIncoming: {
    alignSelf: "flex-start",
  },
  statusText: {
    fontSize: 11,
    color: Colors.gray,
    marginLeft: 8,
    marginTop: 4,
  },
  replyComposer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: Colors.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#e2e8f0",
  },
  replyComposerLabel: {
    fontSize: 12,
    color: Colors.gray,
    marginBottom: 4,
    fontFamily: "inter",
  },
  replyComposerText: {
    fontSize: 14,
    color: Colors.black,
    fontFamily: "inter",
  },
  previewRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  previewContainer: {
    width: 76,
    height: 76,
    borderRadius: 12,
    backgroundColor: Colors.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#d1d5db",
    overflow: "hidden",
    position: "relative",
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  removePreviewButton: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.black,
    alignItems: "center",
    justifyContent: "center",
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
    minHeight: 44,
    maxHeight: 120,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#d1d5db",
    paddingHorizontal: 14,
    paddingVertical: 10,
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
  sendButtonDisabled: {
    backgroundColor: "#a5b4fc",
  },
  viewerBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  viewerImage: {
    width: "100%",
    height: "80%",
  },
  viewerCloseButton: {
    position: "absolute",
    top: 40,
    right: 24,
    padding: 10,
  },
  shareBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  shareContainer: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 20,
    maxHeight: "80%",
  },
  shareHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  shareTitle: {
    fontSize: 18,
    fontFamily: "inter",
    color: Colors.black,
  },
  sharePreview: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  sharePreviewLabel: {
    fontSize: 12,
    color: Colors.gray,
    marginBottom: 6,
    fontFamily: "inter",
  },
  sharePreviewText: {
    fontSize: 14,
    color: Colors.black,
    fontFamily: "inter",
  },
  sharePreviewAttachments: {
    marginTop: 10,
  },
  sharePreviewImage: {
    width: 64,
    height: 64,
    borderRadius: 8,
    marginRight: 8,
  },
  shareTargetLabel: {
    fontSize: 13,
    color: Colors.gray,
    fontFamily: "inter",
    marginBottom: 8,
  },
  shareList: {
    maxHeight: 220,
  },
  shareItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#f1f5f9",
  },
  shareAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#cbd5f5",
  },
  shareName: {
    fontSize: 15,
    color: Colors.black,
    fontFamily: "inter",
  },
  actionSheetBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  actionSheetContainer: {
    width: "100%",
    maxWidth: 320,
    backgroundColor: Colors.white,
    borderRadius: 16,
    paddingVertical: 12,
  },
  actionSheetButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 12,
  },
  actionSheetButtonDisabled: {
    opacity: 0.5,
  },
  actionSheetText: {
    fontSize: 15,
    color: Colors.black,
    fontFamily: "inter",
  },
  actionSheetTextDisabled: {
    color: Colors.gray,
  },
});
