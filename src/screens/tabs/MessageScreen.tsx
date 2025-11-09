import TopBarNoSearch from "@/src/components/TopBarNoSearch";
import Colors from "@/src/constants/colors";
import { getChatConversations } from "@/src/services/api";
import { Ionicons } from "@expo/vector-icons";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import * as SecureStore from "expo-secure-store";
import {
  ActivityIndicator,
  FlatList,
  Image,
  ImageBackground,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Conversation = {
  id: string;
  title: string;
  lastMessage?: string;
  lastTimestamp?: number | string | Date | null;
  unreadCount?: number;
  avatarUrl?: string | null;
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

  if (viewerIsSeer) {
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
  };
};

const normalizeConversations = (items: any[], currentUserId: string | null): Conversation[] =>
  items
    .map((item, index) => mapConversation(item, index, currentUserId))
    .sort((a, b) => {
      const timeA = a.lastTimestamp ? new Date(a.lastTimestamp).getTime() : 0;
      const timeB = b.lastTimestamp ? new Date(b.lastTimestamp).getTime() : 0;
      return timeB - timeA;
    });

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

  return Array.from(merged.values()).sort((a, b) => {
    const timeA = a.lastTimestamp ? new Date(a.lastTimestamp).getTime() : 0;
    const timeB = b.lastTimestamp ? new Date(b.lastTimestamp).getTime() : 0;
    return timeB - timeA;
  });
};

export default function MessageScreen() {
  const router = useRouter();
  const tabBarHeight = useBottomTabBarHeight();

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [paging, setPaging] = useState<PagingState>(DEFAULT_PAGING);
  const [selectedStatus, setSelectedStatus] = useState<ConversationStatusFilter>(null);

  const resolvedLimit = paging.limit > 0 ? paging.limit : DEFAULT_PAGING.limit;

  useEffect(() => {
    let active = true;
    const loadUserId = async () => {
      try {
        const storedId = await SecureStore.getItemAsync("userId");
        if (active) {
          setCurrentUserId(storedId ?? null);
        }
      } catch (error) {
        console.error(error);
      }
    };

    loadUserId();

    return () => {
      active = false;
    };
  }, []);

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

        const response = await getChatConversations({
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
    [currentUserId, resolvedLimit, selectedStatus],
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
  }, [currentUserId, fetchConversations]);

  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) {
      return conversations;
    }
    const keyword = searchQuery.trim().toLowerCase();
    return conversations.filter(
      (item) =>
        item.title.toLowerCase().includes(keyword) ||
        (item.lastMessage ?? "").toLowerCase().includes(keyword),
    );
  }, [conversations, searchQuery]);

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
        data={filteredConversations}
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
    paddingHorizontal: 16,
    paddingVertical: 16,
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
