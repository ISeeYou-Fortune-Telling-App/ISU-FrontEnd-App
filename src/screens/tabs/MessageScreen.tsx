import TopBarNoSearch from "@/src/components/TopBarNoSearch";
import Colors from "@/src/constants/colors";
import { getAdminConversations, getChatConversations } from "@/src/services/api";
import { shouldShowCancelPrompt } from "@/src/utils/cancelPromptGuard";
import { resolveSocketConfig } from "@/src/utils/network";
import { Ionicons } from "@expo/vector-icons";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useFocusEffect, useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  ImageBackground,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import io, { Socket } from "socket.io-client";
const SOCKET_IO_CLIENT_VERSION = require("socket.io-client/package.json").version;

type Conversation = {
  id: string;
  title: string;
  lastMessage?: string;
  lastTimestamp?: number | string | Date | null;
  unreadCount?: number;
  avatarUrl?: string | null;
  status?: ConversationStatusFilter | string | null;
};

type PagingState = {
  page: number;
  totalPages: number;
  limit: number;
};

type ConversationStatusFilter = null | "WAITING" | "ACTIVE" | "ENDED" | "CANCELLED";

const STATUS_FILTERS: { label: string; value: ConversationStatusFilter }[] = [
  { label: "Tất cả", value: null },
  { label: "Chờ mở", value: "WAITING" },
  { label: "Đang diễn ra", value: "ACTIVE" },
  { label: "Đã kết thúc", value: "ENDED" },
  { label: "Đã hủy", value: "CANCELLED" },
];

const DEFAULT_PAGING: PagingState = {
  page: -1,
  totalPages: 1,
  limit: 20,
};

const sortByLatest = (items: Conversation[]): Conversation[] =>
  [...items].sort((a, b) => {
    const timeA = a.lastTimestamp ? new Date(a.lastTimestamp).getTime() : 0;
    const timeB = b.lastTimestamp ? new Date(b.lastTimestamp).getTime() : 0;
    return timeB - timeA;
  });

const formatTimestamp = (value?: string | number | Date | null): string => {
  if (!value) {
    return "";
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) {
    return date.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  if (diffDays === 1) {
    return "Hôm qua";
  }

  if (diffDays < 7) {
    return date.toLocaleDateString("vi-VN", { weekday: "short" });
  }

  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
  });
};

const mapConversation = (item: any, index: number, currentUserId: string | null): Conversation => {
  const timestamp =
    item?.lastMessageTime ?? item?.updatedAt ?? item?.createdAt ?? null;

  const rawStatus = (item?.status ?? item?.conversationStatus ?? "")
    .toString()
    .toUpperCase();
  const normalizedStatus = rawStatus.length ? rawStatus : null;

  const conversationId = item?.conversationId ?? item?.id ?? index;
  const viewerIsSeer =
    currentUserId &&
    item?.seerId &&
    String(item.seerId) === String(currentUserId);
  const viewerIsCustomer =
    currentUserId &&
    item?.customerId &&
    String(item.customerId) === String(currentUserId);

  let title = "Cuộc trò chuyện";
  let avatarUrl: string | null =
    item?.seerAvatarUrl ?? item?.customerAvatarUrl ?? null;
  let unreadCount = 0;

  if(item?.conversationType == "ADMIN_CHAT") {
    title = "Quản trị viên ISU";
    avatarUrl = null; 
    unreadCount = typeof item?.seerUnreadCount === "number" ? item.seerUnreadCount : typeof item?.customerUnreadCount === "number" ? item.customerUnreadCount : 0;
  }
  else if (viewerIsSeer) {
    title = item?.customerName ?? "Khách hàng";
    avatarUrl = item?.customerAvatarUrl ?? avatarUrl;
    unreadCount = typeof item?.seerUnreadCount === "number" ? item.seerUnreadCount : 0;
  } else if (viewerIsCustomer) {
    title = item?.seerName ?? "Nhà tiên tri";
    avatarUrl = item?.seerAvatarUrl ?? avatarUrl;
    unreadCount =
      typeof item?.customerUnreadCount === "number" ? item.customerUnreadCount : 0;
  } else {
    title = item?.seerName ?? item?.customerName ?? title;
    unreadCount =
      typeof item?.seerUnreadCount === "number"
        ? item.seerUnreadCount
        : typeof item?.customerUnreadCount === "number"
          ? item.customerUnreadCount
          : 0;
  }

  return {
    id: String(conversationId),
    title,
    lastMessage: item?.lastMessageContent ?? "",
    lastTimestamp: timestamp,
    unreadCount,
    avatarUrl,
    status: normalizedStatus,
  };
};

const normalizeConversations = (items: any[], currentUserId: string | null): Conversation[] =>
  sortByLatest(items.map((item, index) => mapConversation(item, index, currentUserId)));

  const mergeConversations = (
  existing: Conversation[],
  incoming: Conversation[],
): Conversation[] => {
  if (!incoming.length) {
    return existing;
  }

  const merged = new Map<string, Conversation>();
  existing.forEach((item) => merged.set(item.id, item));
  incoming.forEach((item) => merged.set(item.id, item));

  return sortByLatest(Array.from(merged.values()));
};

export default function MessageScreen() {
  const router = useRouter();
  const tabBarHeight = useBottomTabBarHeight();

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [paging, setPaging] = useState<PagingState>(DEFAULT_PAGING);
  const [selectedStatus, setSelectedStatus] = useState<ConversationStatusFilter>(null);
  const socketRef = useRef<Socket | null>(null);
  const joinedRoomsRef = useRef<Set<string>>(new Set());
  const [socketConnected, setSocketConnected] = useState(false);
  const socketConfig = useMemo(() => resolveSocketConfig(), []);
  const [incomingCancelModalVisible, setIncomingCancelModalVisible] = useState(false);
  const [cancelRequesterName, setCancelRequesterName] = useState<string>("Người dùng");
  const [incomingCancelConversationId, setIncomingCancelConversationId] = useState<string | null>(null);

  const resolvedLimit = paging.limit > 0 ? paging.limit : DEFAULT_PAGING.limit;

  const handleSessionActivated = useCallback(
    (data: any) => {
      const conversationId =
        typeof data?.conversationId === "string" ? data.conversationId : data?.conversationId?.toString();
      if (!conversationId) {
        return;
      }
      setConversations((prev) => {
        let found = false;
        const updated = prev.map((item) => {
          if (item.id !== conversationId) {
            return item;
          }
          found = true;
          return {
            ...item,
            status: "ACTIVE",
            lastTimestamp: data?.sessionStartTime ?? item.lastTimestamp ?? Date.now(),
          };
        });
        if (!found) {
          fetchConversations({ page: 1, silent: true });
          return prev;
        }
        return sortByLatest(updated);
      });
    },
    [fetchConversations],
  );

  const handleReceiveMessage = useCallback(
    (payload: any) => {
      const conversationId =
        typeof payload?.conversationId === "string"
          ? payload.conversationId
          : payload?.conversationId?.toString();
      if (!conversationId) {
        return;
      }
      const senderId =
        typeof payload?.senderId === "string" ? payload.senderId : payload?.senderId?.toString() ?? null;
      const text =
        payload?.textContent ??
        payload?.content ??
        payload?.lastMessageContent ??
        payload?.message ??
        "";
      const createdAt = payload?.createdAt ?? payload?.timestamp ?? Date.now();

      setConversations((prev) => {
        let found = false;
        const updated = prev.map((item) => {
          if (item.id !== conversationId) {
            return item;
          }
          found = true;
          const isMine = senderId && currentUserId && senderId === currentUserId;
          const unreadCount = isMine ? item.unreadCount ?? 0 : (item.unreadCount ?? 0) + 1;
          return {
            ...item,
            lastMessage: text || item.lastMessage,
            lastTimestamp: createdAt,
            unreadCount,
          };
        });
        if (!found) {
          fetchConversations({ page: 1, silent: true });
          return prev;
        }
        return sortByLatest(updated);
      });
    },
    [currentUserId, fetchConversations],
  );

  const respondToCancelRequest = useCallback(
    (conversationId: string | null, confirmed: boolean) => {
      if (!conversationId || !socketRef.current) {
        Alert.alert("Không thể phản hồi", "Thiếu thông tin phiên hoặc kết nối realtime chưa sẵn sàng.");
        return;
      }

      socketRef.current.emit(
        "respond_cancel_request",
        { conversationId, confirmed },
        (status?: string, message?: string) => {
          if (status !== "success") {
            Alert.alert("Không thể gửi phản hồi", message ?? "Vui lòng thử lại sau.");
          }
        },
      );
    },
    [],
  );

  const handleIncomingCancelRequest = useCallback(
    (data: any) => {
      const conversationId =
        data?.conversationId ?? data?.conversationID ?? data?.conversation_id ?? null;

      if (!shouldShowCancelPrompt(conversationId)) {
        return;
      }

      const requesterName = data?.requesterName ?? data?.requesterId ?? "Người dùng";
      setIncomingCancelConversationId(conversationId ? String(conversationId) : null);
      setCancelRequesterName(requesterName.toString());
      setIncomingCancelModalVisible(true);
    },
    [respondToCancelRequest],
  );

  const handleCancelResult = useCallback(
    (data: any) => {
      const status = (data?.status ?? "success").toString().toLowerCase();
      const message =
        data?.message ??
        (status === "success"
          ? "Phiên đã được hủy. Bạn có thể đặt lịch lại nếu cần."
          : "Đối phương đã từ chối hủy phiên.");

      Alert.alert(status === "success" ? "Phiên đã bị hủy" : "Phiên tiếp tục", message);

      // Refresh list so status/unread counts stay in sync
      fetchConversations({ page: 1, silent: true });
      setIncomingCancelModalVisible(false);
    },
    [fetchConversations],
  );

  useEffect(() => {
    let active = true;
    const loadUserId = async () => {
      try {
        const [storedId, storedRole] = await Promise.all([
          SecureStore.getItemAsync("userId"),
          SecureStore.getItemAsync("userRole"),
        ]);
        if (!active) return;
        setCurrentUserId(storedId ?? null);
        setUserRole(storedRole ?? null);
      } catch (error) {
        console.error(error);
      }
    };

    loadUserId();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!currentUserId || !socketConfig.url) {
      return;
    }
    console.log(
      `[SocketIO] client v${SOCKET_IO_CLIENT_VERSION} connecting to ${socketConfig.url}/chat (path: ${socketConfig.path}, user ${currentUserId})`,
    );

    const socket = io(`${socketConfig.url}/chat`, {
      path: socketConfig.path,
      transports: ["websocket", "polling"],
      query: { userId: currentUserId, EIO: 3 },
      autoConnect: false,
      forceNew: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      timeout: 8000,
    });
    socketRef.current = socket;

    const handleConnect = () => {
      setSocketConnected(true);
    };
    const handleDisconnect = () => {
      setSocketConnected(false);
      joinedRoomsRef.current.clear();
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("session_activated", handleSessionActivated);
    socket.on("receive_message", handleReceiveMessage);
    socket.on("request_cancel_confirmation", handleIncomingCancelRequest);
    socket.on("cancel_result", handleCancelResult);
    socket.connect();

    return () => {
      joinedRoomsRef.current.forEach((conversationId) => {
        socket.emit("leave_conversation", conversationId, () => {});
      });
      joinedRoomsRef.current.clear();
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("session_activated", handleSessionActivated);
      socket.off("receive_message", handleReceiveMessage);
      socket.off("request_cancel_confirmation", handleIncomingCancelRequest);
      socket.off("cancel_result", handleCancelResult);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [
    currentUserId,
    socketConfig,
    handleReceiveMessage,
    handleSessionActivated,
    handleIncomingCancelRequest,
    handleCancelResult,
  ]);

  useEffect(() => {
    if (!socketConnected) {
      return;
    }
    const socket = socketRef.current;
    if (!socket) {
      return;
    }
    conversations.forEach((conversation) => {
      if (!conversation.id || joinedRoomsRef.current.has(conversation.id)) {
        return;
      }
      socket.emit("join_conversation", conversation.id, (status: string) => {
        if (status === "success") {
          joinedRoomsRef.current.add(conversation.id);
        }
      });
    });
  }, [conversations, socketConnected]);

  const fetchConversations = useCallback(
    async (
      options: {
        page?: number;
        append?: boolean;
        silent?: boolean;
        refreshing?: boolean;
        statusOverride?: ConversationStatusFilter;
      } = {},
    ) => {
      const {
        page = 1,
        append = false,
        silent = false,
        refreshing = false,
        statusOverride,
      } = options;
      const statusFilter =
        typeof statusOverride !== "undefined" ? statusOverride : selectedStatus;

      if (!append && page === 1) {
        setPaging(DEFAULT_PAGING);
      }

      if (append) {
        setIsLoadingMore(true);
      } else if (refreshing) {
        setIsRefreshing(true);
      } else if (!silent) {
        setIsLoading(true);
      }

      try {
        if (!append) {
          setLoadError(null);
        }

        const isAdmin = (userRole ?? "").toUpperCase() === "ADMIN";
        const response = isAdmin
          ? await getAdminConversations({
              page,
              limit: resolvedLimit,
              sortType: "desc",
              sortBy: "createdAt",
            })
          : await getChatConversations({
              page,
              limit: resolvedLimit,
              sortType: "desc",
              sortBy: "createdAt",
              ...(statusFilter ? { status: statusFilter } : {}),
            });

        const payload = response?.data?.data;
        const list = Array.isArray(payload) ? payload : [];
        const normalized = normalizeConversations(list, currentUserId);

        setConversations((prev) =>
          append ? mergeConversations(prev, normalized) : normalized,
        );

        const pagingInfo = response?.data?.paging;
        const nextPaging: PagingState = {
          page:
            typeof pagingInfo?.page === "number" ? pagingInfo.page : page - 1,
          totalPages:
            typeof pagingInfo?.totalPages === "number"
              ? pagingInfo.totalPages
              : Math.max(page, 1),
          limit:
            typeof pagingInfo?.limit === "number"
              ? pagingInfo.limit
              : resolvedLimit,
        };
        setPaging(nextPaging);
      } catch (error: any) {
        console.error(error);
        const message =
          error?.response?.data?.message ??
          error?.message ??
          "Không thể tải danh sách cuộc trò chuyện. Vui lòng thử lại.";
        setLoadError(message);
      } finally {
        if (append) {
          setIsLoadingMore(false);
        } else if (refreshing) {
          setIsRefreshing(false);
        } else if (!silent) {
          setIsLoading(false);
        }
      }
    },
    [currentUserId, resolvedLimit, selectedStatus, userRole],
  );

  useFocusEffect(
    useCallback(() => {
      fetchConversations({ page: 1 });
    }, [fetchConversations]),
  );

  useEffect(() => {
    if (currentUserId) {
      fetchConversations({ page: 1, silent: true });
    }
  }, [currentUserId, userRole, fetchConversations]);

  const visibleConversations = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();
    return conversations.filter((item) => {
      if (selectedStatus) {
        const itemStatus = (item.status ?? "").toString().toUpperCase();
        if (itemStatus !== selectedStatus) {
          return false;
        }
      }

      if (!keyword) {
        return true;
      }

      return (
        item.title.toLowerCase().includes(keyword) ||
        (item.lastMessage ?? "").toLowerCase().includes(keyword)
      );
    });
  }, [conversations, searchQuery, selectedStatus]);

  const handleSelectStatus = useCallback(
    (value: ConversationStatusFilter) => {
      setSelectedStatus(value);
      fetchConversations({ page: 1, statusOverride: value });
    },
    [fetchConversations],
  );

  const handleOpenConversation = useCallback(
    (conversation: Conversation) => {
      router.push({
        pathname: "/chat-detail",
        params: { conversationId: conversation.id },
      });
    },
    [router],
  );

  const handleLoadMore = useCallback(() => {
    if (isLoading || isLoadingMore || isRefreshing || searchQuery.trim()) {
      return;
    }

    if (paging.page < 0 || paging.totalPages <= 0) {
      return;
    }

    if (paging.page + 1 >= paging.totalPages) {
      return;
    }

    const nextPage = paging.page + 2;
    fetchConversations({ page: nextPage, append: true, silent: true });
  }, [fetchConversations, isLoading, isLoadingMore, isRefreshing, paging, searchQuery]);

  const renderConversation = useCallback(
    ({ item }: { item: Conversation }) => (
      <TouchableOpacity
        style={styles.conversationCard}
        activeOpacity={0.8}
        onPress={() => handleOpenConversation(item)}
      >
        {item.avatarUrl ? (
          <Image source={{ uri: item.avatarUrl }} style={styles.avatarImage} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Ionicons name="person-outline" size={22} color="#64748b" />
          </View>
        )}
        <View style={styles.conversationContent}>
          <View style={styles.conversationHeader}>
            <Text style={styles.conversationTitle} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.timestamp}>{formatTimestamp(item.lastTimestamp)}</Text>
          </View>
          <View style={styles.conversationFooter}>
            <Text style={styles.conversationPreview} numberOfLines={1}>
              {item.lastMessage || "Chưa có tin nhắn nào."}
            </Text>
            {item.unreadCount && item.unreadCount > 0 ? (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>{item.unreadCount}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </TouchableOpacity>
    ),
    [handleOpenConversation],
  );

  return (
    <SafeAreaView style={styles.safeAreaView} edges={["top", "left", "right"]}>
      {/* Modal phản hồi yêu cầu hủy phiên (seer/khách ở danh sách) */}
      <Modal
        visible={incomingCancelModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIncomingCancelModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setIncomingCancelModalVisible(false)}>
          <View style={styles.modalBackdrop}>
            <TouchableWithoutFeedback>
              <View style={styles.cancelModalCard}>
                <View style={styles.modalHeader}>
                  <Ionicons name="close-circle" size={24} color="#ef4444" />
                  <Text style={styles.modalTitle}>Yêu cầu hủy phiên</Text>
                </View>
                <Text style={styles.modalBodyText}>
                  {cancelRequesterName} muốn hủy phiên này. Bạn có đồng ý không?
                </Text>
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.modalGhostButton]}
                    onPress={() => {
                      respondToCancelRequest(incomingCancelConversationId, false);
                      setIncomingCancelModalVisible(false);
                    }}
                  >
                    <Text style={[styles.modalButtonText, styles.modalGhostText]}>Tiếp tục phiên</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.modalDangerButton]}
                    onPress={() => {
                      respondToCancelRequest(incomingCancelConversationId, true);
                      setIncomingCancelModalVisible(false);
                    }}
                  >
                    <Text style={[styles.modalButtonText, styles.modalDangerText]}>Đồng ý hủy</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <TopBarNoSearch />

      <ImageBackground source={require('@/assets/images/Fortune-Teller.jpg')} style={{ width: '100%', height: 180 }} resizeMode="cover">
        <View style={styles.headerOverlay} />
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Ionicons name="chatbubble-ellipses-outline" size={28} color={Colors.primary} />
          </View>
          <Text style={styles.headerTitle}>Tin nhắn</Text>
          <Text style={styles.headerSubtitle}>Trao đổi trực tiếp với các Nhà tiên tri</Text>
        </View>
      </ImageBackground>

      <View style={styles.searchWrapper}>
        <Ionicons name="search-outline" size={20} color={Colors.gray} />
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm kiếm cuộc trò chuyện..."
          placeholderTextColor="#a0aec0"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>
      <View style={styles.statusFilterWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.statusFilterContent}
        >
          {STATUS_FILTERS.map((filter) => {
            const isActive = selectedStatus === filter.value;
            return (
              <TouchableOpacity
                key={filter.label}
                style={[
                  styles.statusChip,
                  isActive && styles.statusChipActive,
                ]}
                activeOpacity={0.8}
                onPress={() => handleSelectStatus(filter.value)}
              >
                <Text
                  style={[
                    styles.statusChipText,
                    isActive && styles.statusChipTextActive,
                  ]}
                >
                  {filter.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {loadError && !isLoading ? (
        <TouchableOpacity style={styles.errorBanner} onPress={() => fetchConversations({ page: 1 })}>
          <Ionicons name="warning-outline" size={18} color="#b91c1c" />
          <Text style={styles.errorBannerText}>{loadError}</Text>
          <Text style={styles.errorBannerHint}>Nhấn để thử lại</Text>
        </TouchableOpacity>
      ) : null}

      <FlatList
        data={visibleConversations}
        keyExtractor={(item) => item.id}
        renderItem={renderConversation}
        ListHeaderComponent={
          <View style={styles.aiCardWrapper}>
            <TouchableOpacity
              style={styles.aiCard}
              activeOpacity={0.85}
              onPress={() => router.push("/ai-chat")}
            >
              <View style={styles.aiIcon}>
                <Ionicons name="sparkles-outline" size={20} color={Colors.primary} />
              </View>
              <View style={styles.aiContent}>
                <Text style={styles.aiTitle}>Chat với Trợ lý AI</Text>
                <Text style={styles.aiSubtitle}>
                  Nhận giải đáp tức thì dựa trên cơ sở tri thức được huấn luyện.
                </Text>
              </View>
              <Ionicons name="arrow-forward" size={18} color={Colors.primary} />
            </TouchableOpacity>
          </View>
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.emptyState}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.emptyText}>Đang tải cuộc trò chuyện...</Text>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="chatbubble-outline" size={24} color={Colors.gray} />
              <Text style={styles.emptyText}>
                Bạn chưa có cuộc trò chuyện nào. Hãy bắt đầu kết nối ngay nhé!
              </Text>
            </View>
          )
        }
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: tabBarHeight + 32 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => fetchConversations({ page: 1, refreshing: true })}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        showsVerticalScrollIndicator={false}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.6}
        ListFooterComponent={
          isLoadingMore ? (
            <View style={styles.footerLoading}>
              <ActivityIndicator size="small" color={Colors.primary} />
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeAreaView: {
    flex: 1,
    backgroundColor: Colors.grayBackground,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    alignItems: "center",
    gap: 10,
  },
  headerOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 180,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  headerIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: Colors.primary,
    backgroundColor: Colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: Colors.white,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.text_light,
    fontFamily: "inter",
    textAlign: "center",
  },
  searchWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.white,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.black,
  },
  statusFilterWrapper: {
    paddingHorizontal: 16,
    marginTop: 10,
  },
  statusFilterContent: {
    gap: 8,
    paddingVertical: 4,
  },
  statusChip: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
  },
  statusChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  statusChipText: {
    fontSize: 13,
    color: "#475569",
    fontFamily: "inter",
    fontWeight: "500",
  },
  statusChipTextActive: {
    color: Colors.white,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#fee2e2",
    gap: 10,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 13,
    color: "#b91c1c",
  },
  errorBannerHint: {
    fontSize: 12,
    color: "#b91c1c",
    fontWeight: "600",
  },
  aiCardWrapper: {
    paddingVertical: 16
  },
  aiCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.white,
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#e2e8f0",
    gap: 14,
  },
  aiIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#e0f2fe",
    alignItems: "center",
    justifyContent: "center",
  },
  aiContent: {
    flex: 1,
    gap: 6,
  },
  aiTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.black,
  },
  aiSubtitle: {
    fontSize: 13,
    color: Colors.gray,
    lineHeight: 18,
    fontFamily: "inter"
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  conversationCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.white,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 14,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 14,
    backgroundColor: "#e2e8f0",
    alignItems: "center",
    justifyContent: "center",
  },
  conversationContent: {
    flex: 1,
    gap: 6,
  },
  conversationHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  conversationTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: Colors.black,
  },
  timestamp: {
    fontSize: 12,
    color: Colors.gray,
  },
  conversationFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  conversationPreview: {
    flex: 1,
    fontSize: 13,
    color: Colors.gray,
    fontFamily: "inter"
  },
  unreadBadge: {
    minWidth: 24,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: "center",
  },
  unreadBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.white,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  cancelModalCard: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
  },
  modalBodyText: {
    fontSize: 15,
    color: "#334155",
    lineHeight: 22,
    marginBottom: 18,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    minWidth: 120,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  modalGhostButton: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  modalGhostText: {
    color: "#0f172a",
    fontWeight: "600",
  },
  modalDangerButton: {
    backgroundColor: "#ef4444",
  },
  modalDangerText: {
    color: "#fff",
    fontWeight: "700",
  },
  modalButtonText: {
    fontSize: 15,
  },
  separator: {
    height: 12,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 48,
    gap: 12,
  },
  footerLoading: {
    paddingVertical: 16,
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.gray,
    textAlign: "center",
  },
});
