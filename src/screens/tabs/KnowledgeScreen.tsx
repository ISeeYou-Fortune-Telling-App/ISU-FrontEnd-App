import KnowledgeSearchModal from "@/src/components/KnowledgeSearchModal";
import TopBar from "@/src/components/TopBar";
import Colors from "@/src/constants/colors";
import { getKnowledgeItems, searchKnowledgeItems } from "@/src/services/api";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import dayjs from "dayjs";
import { useFocusEffect } from "expo-router";
import { BookOpen, Clock, Eye } from "lucide-react-native";
import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Image, ImageBackground, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Button } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

type KnowledgeItem = {
  id: string;
  title: string;
  content: string;
  categories: string[];
  imageUrl?: string | null;
  viewCount: number;
  createdAt: string;
};

const categoryPalette: Record<string, { background: string; text: string }> = {
  "Cung Hoàng Đạo": { background: Colors.categoryColors.zodiac.chip, text: Colors.categoryColors.zodiac.icon },
  "Ngũ Hành": { background: Colors.categoryColors.elements.chip, text: Colors.categoryColors.elements.icon },
  "Nhân Tướng Học": { background: Colors.categoryColors.physiognomy.chip, text: Colors.categoryColors.physiognomy.icon },
  "Chỉ Tay": { background: Colors.categoryColors.palmistry.chip, text: Colors.categoryColors.palmistry.icon },
  Tarot: { background: Colors.categoryColors.tarot.chip, text: Colors.categoryColors.tarot.icon },
  Khác: { background: Colors.categoryColors.other.chip, text: Colors.categoryColors.other.icon },
};

const getCategoryStyle = (category: string) =>
  categoryPalette[category] ?? { background: "#F2F2F2", text: "#4F4F4F" };

const formatViewCount = (count: number) => {
  if (count >= 1_000_000) {
    const value = count / 1_000_000;
    return `${value % 1 === 0 ? value.toFixed(0) : value.toFixed(1)}m`;
  }
  if (count >= 1_000) {
    const value = count / 1_000;
    return `${value % 1 === 0 ? value.toFixed(0) : value.toFixed(1)}k`;
  }
  return count.toString();
};

const formatRelativeTime = (date: string) => {
  const target = dayjs(date);
  if (!target.isValid()) {
    return "";
  }

  const now = dayjs();
  const minutes = Math.max(1, now.diff(target, "minute"));
  if (minutes < 60) {
    return `${minutes} phút trước`;
  }

  const hours = now.diff(target, "hour");
  if (hours < 24) {
    return `${hours} giờ trước`;
  }

  const days = now.diff(target, "day");
  if (days < 7) {
    return `${days} ngày trước`;
  }

  const weeks = now.diff(target, "week");
  if (weeks < 5) {
    return `${weeks} tuần trước`;
  }

  const months = now.diff(target, "month");
  if (months < 12) {
    return `${months} tháng trước`;
  }

  const years = now.diff(target, "year");
  return `${years} năm trước`;
};

const calculateReadingTime = (content: string) => {
  if (!content) {
    return "1 phút";
  }
  const words = content.trim().split(/\s+/).length;
  const minutes = Math.max(1, Math.ceil(words / 200));
  return `${minutes} phút`;
};

type KnowledgeCardProps = {
  item: KnowledgeItem;
  expanded: boolean;
  onToggle: () => void;
};

const KnowledgeCard = ({ item, expanded, onToggle }: KnowledgeCardProps) => {
  const relativeTime = formatRelativeTime(item.createdAt);
  const viewCount = formatViewCount(item.viewCount ?? 0);
  const readingTime = calculateReadingTime(item.content ?? "");
  const [coverError, setCoverError] = useState(false);

  return (
    <TouchableOpacity style={styles.cardContainer} activeOpacity={0.8} onPress={onToggle}>
      <View style={styles.cardMetaRow}>
        <View style={styles.categoryWrapper}>
          {(item.categories ?? []).slice(0, 3).map((category) => {
            const palette = getCategoryStyle(category);
            return (
              <View
                key={`${item.id}-${category}`}
                style={[styles.categoryChip, { backgroundColor: palette.background }]}
              >
                <Text style={[styles.categoryText, { color: palette.text }]}>{category}</Text>
              </View>
            );
          })}
        </View>
        <View style={styles.timeBadge}>
          <Clock size={14} color="#6B7280" />
          <Text style={styles.timeText}>{relativeTime || readingTime}</Text>
        </View>
      </View>

      <Text style={styles.cardTitle}>{item.title}</Text>
      <Text style={styles.cardExcerpt} numberOfLines={expanded ? undefined : 3}>
        {item.content?.replace(/\\n/g, "\n")}
      </Text>

      <Image
        source={
          coverError || !item.imageUrl
            ? require("@/assets/images/placeholder.png")
            : { uri: item.imageUrl }
        }
        style={styles.cardImage}
        onError={(e) => {
          setCoverError(true);
        }}
      />

      <View style={styles.cardFooter}>
        <View style={styles.viewCounter}>
          <Eye size={16} color="#6B7280" />
          <Text style={styles.viewText}>{viewCount}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default function KnowledgeScreen() {
  const [searchVisible, setSearchVisible] = useState(false);
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const tabBarHeight = useBottomTabBarHeight();

  const fetchKnowledge = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getKnowledgeItems({
        page: 1,
        limit: 15,
        sortType: "desc",
        sortBy: "createdAt",
      });

      const data: KnowledgeItem[] = response?.data?.data ?? [];
      setItems(data);
    } catch (err: any) {
      console.error("Failed to load knowledge items", err);
      const message =
        err?.response?.data?.message ||
        err?.message ||
        "Không thể tải danh sách bài viết. Vui lòng thử lại.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchKnowledge();
    }, [fetchKnowledge])
  );

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeAreaView}>
      <>
        <TopBar showSearchIcon onSearchPress={() => setSearchVisible(true)} />
        <KnowledgeSearchModal
          visible={searchVisible}
          onClose={() => setSearchVisible(false)}
          onApply={async (params) => {
            try {
              setLoading(true);
              const response = await searchKnowledgeItems({
                page: 1,
                limit: 15,
                sortType: params.sortType ?? 'desc',
                sortBy: params.sortBy ?? 'createdAt',
                title: params.title,
                categoryIds: params.categoryIds,
                status: params.status,
              });
              const root = response?.data ?? response;
              let dataArray: any[] = [];
              if (Array.isArray(root)) {
                dataArray = root;
              } else if (Array.isArray(root?.data)) {
                dataArray = root.data;
              } else if (Array.isArray(root?.items)) {
                dataArray = root.items;
              } else if (Array.isArray(root?.results)) {
                dataArray = root.results;
              }

              setItems(dataArray as KnowledgeItem[]);
            } catch (err: any) {
              console.error('Search failed', err);
            } finally {
              setLoading(false);
            }
          }}
        />
      </>
      {error && <View style={[styles.centerContent, { flex: 1 }]}>
        <Text style={styles.errorText}>{error}</Text>
        <Button mode="contained" style={styles.retryButton} onPress={fetchKnowledge}>
          Thử lại
        </Button>
      </View>}
      {loading ? <ActivityIndicator size="large" color={Colors.primary} style={{ flex: 1, alignContent: "center" }} /> :
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <KnowledgeCard
              item={item}
              expanded={Boolean(expandedIds[item.id])}
              onToggle={() =>
                setExpandedIds((prev) => ({ ...prev, [item.id]: !prev[item.id] }))
              }
            />
          )}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.listContent, { paddingBottom: tabBarHeight + 16 }]}
          ListHeaderComponent={
            <ImageBackground source={require('@/assets/images/boi-toan.jpg')}
              style={{ flex: 1, width: '100%', height: 180, marginBottom: 8 }}
              resizeMode="cover">

              <View style={styles.headerOverlay} />

              <View style={styles.headerCard}>
                <View style={styles.headerIconWrapper}>
                  <BookOpen size={24} color={Colors.primary} />
                </View>
                <Text style={styles.headerTitle}>Kho Tri Thức</Text>
                <Text style={styles.headerSubtitle}>
                  Khám phá kiến thức về sự huyền bí của thế giới
                </Text>
              </View>
            </ImageBackground>
          }
          ListEmptyComponent={<Text style={styles.emptyText}>Chưa có bài viết nào.</Text>}
        />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeAreaView: {
    flex: 1,
    backgroundColor: Colors.grayBackground,
  },
  centerContent: {
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    fontSize: 16,
    color: "red",
    textAlign: "center",
    paddingHorizontal: 24,
    marginBottom: 16,
    fontFamily: "Inter",
  },
  retryButton: {
    borderRadius: 10,
    backgroundColor: Colors.primary,
  },
  listContent: {
    paddingBottom: 24,
  },
  headerCard: {
    paddingVertical: 32,
    paddingHorizontal: 20,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    marginBottom: 8,
  },
  headerOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 180,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  headerIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: Colors.white,
  },
  headerSubtitle: {
    marginTop: 8,
    fontSize: 14,
    textAlign: "center",
    color: Colors.text_light,
    fontFamily: "inter",
  },
  cardContainer: {
    backgroundColor: Colors.white,
    paddingHorizontal: 16,
    paddingVertical: 20,
    marginHorizontal: 10,
    marginVertical: 5,
    borderRadius: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  cardMetaRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  categoryWrapper: {
    flexDirection: "row",
    flexWrap: "wrap",
    flex: 1,
    marginRight: 12,
  },
  categoryChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 8,
  },
  categoryText: {
    fontSize: 12,
    fontFamily: "Inter",
  },
  timeBadge: {
    flexDirection: "row",
    alignItems: "center",
  },
  timeText: {
    fontSize: 12,
    color: "#6B7280",
    fontFamily: "Inter",
    marginLeft: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.black,
    fontFamily: "Inter",
    marginBottom: 8,
  },
  cardExcerpt: {
    fontSize: 16,
    lineHeight: 20,
    color: "#374151",
    fontFamily: "Inter",
    marginBottom: 12,
  },
  cardImage: {
    width: "100%",
    height: 180,
    borderRadius: 12,
    marginBottom: 16,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  viewCounter: {
    flexDirection: "row",
    alignItems: "center",
  },
  viewText: {
    fontSize: 12,
    color: "#6B7280",
    fontFamily: "Inter",
    marginLeft: 6,
  },
  emptyText: {
    textAlign: "center",
    marginTop: 24,
    color: "#6B7280",
    fontFamily: "Inter",
  },
});
