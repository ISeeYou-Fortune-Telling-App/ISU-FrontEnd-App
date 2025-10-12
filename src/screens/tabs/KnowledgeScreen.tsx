import TopBar from "@/src/components/TopBar";
import Colors from "@/src/constants/colors";
import { getKnowledgeItems } from "@/src/services/api";
import dayjs from "dayjs";
import { useFocusEffect } from "expo-router";
import { BookOpen, Clock, Eye } from "lucide-react-native";
import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
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
  "Cung Hoàng Đạo": { background: "#EAE6FF", text: "#5B4BFF" },
  "Ngũ Hành": { background: "#E0F9E8", text: "#1D8348" },
  "Nhân Tướng Học": { background: "#E0EDFF", text: "#1B4F72" },
  "Chỉ Tay": { background: "#FFE7F0", text: "#C2185B" },
  Tarot: { background: "#FFF3CD", text: "#AA6E00" },
  Khác: { background: "#F2F2F2", text: "#4F4F4F" },
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
        {item.content}
      </Text>

      {item.imageUrl ? (
        <Image source={{ uri: item.imageUrl }} style={styles.cardImage} resizeMode="cover" />
      ) : null}

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
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

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

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeAreaView, styles.centerContent]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={[styles.safeAreaView, styles.centerContent]}>
        <Text style={styles.errorText}>{error}</Text>
        <Button mode="contained" style={styles.retryButton} onPress={fetchKnowledge}>
          Thử lại
        </Button>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeAreaView}>
      <TopBar placeholder="Tìm kiếm bài viết..." />
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
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.headerCard}>
            <View style={styles.headerIconWrapper}>
              <BookOpen size={24} color={Colors.primary} />
            </View>
            <Text style={styles.headerTitle}>Kho Tri Thức</Text>
            <Text style={styles.headerSubtitle}>
              Khám phá kiến thức về sự huyền bí của thế giới
            </Text>
          </View>
        }
        ListEmptyComponent={<Text style={styles.emptyText}>Chưa có bài viết nào.</Text>}
      />
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
    backgroundColor: Colors.white,
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    marginBottom: 8,
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
    fontWeight: "700",
    fontFamily: "Inter",
    color: Colors.black,
  },
  headerSubtitle: {
    marginTop: 8,
    fontSize: 14,
    textAlign: "center",
    color: "#4B5563",
    fontFamily: "Inter",
  },
  cardContainer: {
    backgroundColor: Colors.white,
    paddingHorizontal: 16,
    paddingVertical: 20,
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
