import Colors from "@/src/constants/colors";
import { getKnowledgeItemDetail } from "@/src/services/api";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type KnowledgeItemDetail = {
  id: string;
  title: string;
  content: string;
  categories?: string[];
  imageUrl?: string | null;
  viewCount?: number;
  createdAt?: string;
};

export default function KnowledgeDetailScreen() {
  const router = useRouter();
  const { knowledgeId } = useLocalSearchParams<{ knowledgeId?: string }>();

  const [item, setItem] = useState<KnowledgeItemDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadDetail = useCallback(async () => {
    if (!knowledgeId) {
      setError("Không tìm thấy bài viết bạn yêu cầu.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await getKnowledgeItemDetail(knowledgeId as string);
      const payload =
        response?.data?.data ?? response?.data ?? response;

      if (!payload) {
        throw new Error("Không nhận được dữ liệu.");
      }

      setItem({
        id: payload.id ?? knowledgeId,
        title: payload.title ?? "Bài viết tri thức",
        content: payload.content ?? "",
        categories: payload.categories ?? [],
        imageUrl: payload.imageUrl ?? null,
        viewCount: payload.viewCount ?? 0,
        createdAt: payload.createdAt ?? payload.updatedAt ?? null,
      });
    } catch (err: any) {
      console.error("Failed to load knowledge detail", err);
      const message =
        err?.response?.data?.message ??
        err?.message ??
        "Không thể tải nội dung bài viết. Vui lòng thử lại.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [knowledgeId]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  const handleGoBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.push("/(tabs)/knowledge");
    }
  }, [router]);

  const renderContent = (content: string) => {
    if (!content) {
      return (
        <Text style={styles.emptyContentText}>
          Nội dung của bài viết đang được cập nhật.
        </Text>
      );
    }

    return content
      .split(/\n{2,}/)
      .map((paragraph, index) => (
        <Text key={`${item?.id}-paragraph-${index}`} style={styles.articleParagraph}>
          {paragraph.trim()}
        </Text>
      ));
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={handleGoBack}>
          <Ionicons name="arrow-back" size={22} color={Colors.black} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Kho Tri thức</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      {loading ? (
        <View style={styles.centeredContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Đang tải bài viết...</Text>
        </View>
      ) : error ? (
        <View style={styles.centeredContainer}>
          <Ionicons name="alert-circle-outline" size={40} color="#b91c1c" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadDetail}>
            <Text style={styles.retryButtonText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      ) : item ? (
        <ScrollView
          style={styles.contentWrapper}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {item.categories && item.categories.length > 0 ? (
            <View style={styles.categoryRow}>
              {item.categories.map((category) => (
                <View key={`${item.id}-${category}`} style={styles.categoryChip}>
                  <Text style={styles.categoryChipText}>{category}</Text>
                </View>
              ))}
            </View>
          ) : null}

          <Text style={styles.title}>{item.title}</Text>

          {item.imageUrl ? (
            <Image
              source={{ uri: item.imageUrl }}
              style={styles.heroImage}
              resizeMode="cover"
            />
          ) : null}

          <View style={styles.articleContainer}>{renderContent(item.content)}</View>
        </ScrollView>
      ) : (
        <View style={styles.centeredContainer}>
          <Ionicons name="file-tray-outline" size={40} color={Colors.gray} />
          <Text style={styles.emptyContentText}>Bài viết không tồn tại hoặc đã bị ẩn.</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.grayBackground,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.borderGray,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.grayBackground,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.black,
  },
  headerPlaceholder: {
    width: 40,
    height: 40,
  },
  centeredContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 24,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.gray,
  },
  errorText: {
    fontSize: 14,
    color: "#b91c1c",
    textAlign: "center",
  },
  retryButton: {
    marginTop: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Colors.primary,
  },
  retryButtonText: {
    color: Colors.white,
    fontWeight: "600",
  },
  contentWrapper: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    paddingTop: 18,
    gap: 16,
  },
  categoryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: Colors.categoryColors?.other?.chip ?? "#E0F2FE",
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.categoryColors?.other?.icon ?? Colors.primary,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: Colors.black,
    lineHeight: 30,
  },
  heroImage: {
    width: "100%",
    height: 200,
    borderRadius: 16,
    backgroundColor: Colors.grayBackground,
  },
  articleContainer: {
    gap: 12,
  },
  articleParagraph: {
    fontSize: 15,
    lineHeight: 24,
    color: Colors.dark_gray,
  },
  emptyContentText: {
    fontSize: 14,
    color: Colors.gray,
    textAlign: "center",
  },
});
