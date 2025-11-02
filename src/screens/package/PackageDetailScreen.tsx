import Colors from "@/src/constants/colors";
import { deleteServicePackage, getServicePackageDetail, getServicePackageReviews } from "@/src/services/api";
import { MaterialIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Card, Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

export default function PackageDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [pkg, setPkg] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [avatarError, setAvatarError] = useState(false);
  const [coverError, setCoverError] = useState(false);


  const handleDelete = async () => {
    if (!id) {
      Alert.alert("Lỗi", "ID gói dịch vụ không hợp lệ.");
      return;
    };

    Alert.alert("Xác nhận", "Bạn có chắc chắn muốn xóa gói dịch vụ này?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa", style: "destructive", onPress: async () => {
          let res = null;
          try {
            res = await deleteServicePackage(id);
            Alert.alert("Thành công", "Gói dịch vụ đã được xóa thành công.", [
              { text: "Đồng ý", onPress: () => router.back() },
            ]);
          } catch (err) {
            Alert.alert("Lỗi", res?.data?.message || "Không thể xóa gói dịch vụ. Vui lòng thử lại sau.");
            console.error("Failed to delete package:", err);
          }
        }
      },
    ]);
  }

  useEffect(() => {
    (async () => {
      try {
        const [detailResp, reviewResp] = await Promise.all([
          getServicePackageDetail(id),
          getServicePackageReviews(id),
        ]);
        setPkg(detailResp.data?.data);
        setReviews(reviewResp.data?.data || []);
      } catch (err) {
        console.error("Failed to load package detail:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </SafeAreaView>
    );
  }

  if (!pkg) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text>Không tìm thấy gói dịch vụ.</Text>
      </SafeAreaView>
    );
  }

  const seer = pkg.seer || {};
  const categoryName = pkg.category?.name ?? "Khác";
  const statusColor = pkg.status === "AVAILABLE" ? "#4ade80" : pkg.status === "HIDDEN" ? "#facc15" : Colors.error;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <MaterialIcons
          name="arrow-back"
          size={28}
          color={Colors.black}
          onPress={() => router.back()}
        />
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Chi tiết gói dịch vụ</Text>
        </View>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Image */}
        <View style={styles.imageWrapper}>
          <Image
            source={
              coverError || !pkg.imageUrl
                ? require("@/assets/images/placeholder.png")
                : { uri: pkg.imageUrl }
            }
            style={styles.image}
            onError={(e) => {
              console.log('Cover image failed to load:', e.nativeEvent);
              setCoverError(true);
            }}
          />
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryBadgeText}>{categoryName}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusBadgeText}>
              {pkg.status === "AVAILABLE" && "Đã duyệt"}
              {pkg.status === "HIDDEN" && "Chờ duyệt"}
              {pkg.status === "REJECTED" && "Bị từ chối"}
            </Text>
          </View>
        </View>

        <View style={{ marginHorizontal: 10 }}>

          {/* Title & rating */}
          <View style={styles.section}>
            <Text style={styles.packageTitle}>{pkg.packageTitle}</Text>
            <View style={styles.ratingRow}>
              <MaterialIcons name="star" size={18} color={Colors.yellow} />
              <Text style={styles.ratingText}>
                {pkg.avgRating ? pkg.avgRating.toFixed(1) : "-"}
              </Text>
              <Text style={styles.reviewCount}>
                ({pkg.totalReviews ?? reviews.length} đánh giá)
              </Text>
            </View>
          </View>

          {/* Seer info */}
          <Card style={styles.seerCard}>
            <View style={styles.seerRow}>
              <Image
                source={
                  avatarError || !seer.avatarUrl
                    ? require('@/assets/images/user-placeholder.png')
                    : { uri: seer.avatarUrl }
                }
                style={styles.seerAvatar}
                onError={(e) => {
                  console.log('Avatar image failed to load:', e.nativeEvent);
                  setAvatarError(true);
                }}
              />
              <View>
                <Text style={styles.seerName}>{seer.fullName}</Text>
                <Text style={styles.seerRating}>
                  ⭐ {seer.avgRating?.toFixed(1) ?? "-"} (
                  {seer.totalRates ?? 0} đánh giá)
                </Text>
              </View>
            </View>
          </Card>

          {/* Info */}
          <Card style={styles.infoCard}>
            <Text style={styles.infoTitle}>Thông tin dịch vụ</Text>
            <View style={styles.infoRow}>
              <MaterialIcons name="attach-money" size={20} color="#16a34a" />
              <Text style={styles.infoLabel}>Giá</Text>
              <Text style={styles.infoValue}>
                {pkg.price.toLocaleString()} VNĐ
              </Text>
            </View>
            <View style={styles.infoRow}>
              <MaterialIcons name="timer" size={20} color="#2563eb" />
              <Text style={styles.infoLabel}>Thời lượng</Text>
              <Text style={styles.infoValue}>{pkg.durationMinutes} phút</Text>
            </View>
            <View style={styles.infoRow}>
              <MaterialIcons name="calendar-today" size={20} color="#7c3aed" />
              <Text style={styles.infoLabel}>Ngày tạo</Text>
              <Text style={styles.infoValue}>
                {new Date(pkg.createdAt).toLocaleDateString("vi-VN")}
              </Text>
            </View>
          </Card>

          {/* Description */}
          <Card style={styles.descCard}>
            <Text style={styles.infoTitle}>Mô tả</Text>
            <Text style={styles.descText}>{pkg.packageContent}</Text>
          </Card>

          {/* ✅ Reviews */}
          <Card style={styles.reviewCard}>
            <Text style={styles.infoTitle}>Đánh giá ({reviews.length})</Text>
            {reviews.length === 0 ? (
              <Text style={{ color: "#666" }}>Chưa có đánh giá nào</Text>
            ) : (
              reviews.map((rev) => (
                <View key={rev.reviewId} style={styles.reviewItem}>
                  <Image
                    source={
                      rev.user?.avatarUrl
                        ? { uri: rev.user.avatarUrl }
                        : require("@/assets/images/user-placeholder.png")
                    }
                    style={styles.reviewAvatar}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.reviewName}>
                      {rev.user?.fullName ?? "Người dùng"}
                    </Text>
                    <Text style={styles.reviewComment}>{rev.comment}</Text>
                    <Text style={styles.reviewDate}>
                      {new Date(rev.createdAt).toLocaleDateString("vi-VN")}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </Card>

          {/* Actions */}
          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.editButton}>
              <Text style={styles.editText}>Chỉnh sửa</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.scheduleButton}>
              <Text style={styles.scheduleText}>Xem lịch hẹn</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
            <Text style={styles.scheduleText}>Xoá gói</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.grayBackground },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    backgroundColor: Colors.background,
  },
  titleContainer: { flex: 1, alignItems: "center" },
  title: { fontWeight: "bold", fontSize: 18 },
  scroll: { flex: 1 },
  imageWrapper: { position: "relative", height: 200 },
  image: { width: "100%", height: "100%" },
  categoryBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: "#9333ea",
    borderRadius: 16,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  categoryBadgeText: { color: Colors.white, fontSize: 12 },
  statusBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    borderRadius: 16,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  statusBadgeText: { color: Colors.white, fontSize: 12 },
  section: { paddingVertical: 16 },
  packageTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 4 },
  ratingRow: { flexDirection: "row", alignItems: "center" },
  ratingText: { fontWeight: "bold", marginLeft: 4 },
  reviewCount: { color: "#666", marginLeft: 4 },
  seerCard: { marginBottom: 16, padding: 16 },
  seerRow: { flexDirection: "row", alignItems: "center" },
  seerAvatar: { width: 50, height: 50, borderRadius: 25, marginRight: 12, borderWidth: 1, borderColor: Colors.grayBackground },
  seerName: { fontWeight: "600" },
  seerRating: { color: "#666" },
  infoCard: { marginBottom: 16, padding: 16 },
  infoTitle: { fontWeight: "600", marginBottom: 8 },
  infoRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  infoLabel: { flex: 1, marginLeft: 8, color: "#333" },
  infoValue: { fontWeight: "600", color: "#000" },
  descCard: { marginBottom: 16, padding: 16 },
  descText: { color: "#333", marginTop: 6, lineHeight: 20 },

  // ✅ Reviews
  reviewCard: { marginBottom: 16, padding: 16 },
  reviewItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  reviewAvatar: { width: 40, height: 40, borderRadius: 50, marginRight: 10 },
  reviewName: { fontWeight: "600" },
  reviewComment: { color: "#333", marginTop: 2 },
  reviewDate: { fontSize: 12, color: "#888", marginTop: 2 },

  actionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  editButton: {
    flex: 1,
    backgroundColor: "#d2d5dbf9",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginRight: 8,
  },
  scheduleButton: {
    flex: 1,
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginLeft: 8,
  },
  deleteButton: {
    flex: 1,
    backgroundColor: Colors.error,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 16,
  },
  editText: { fontWeight: "600", color: Colors.black },
  scheduleText: { fontWeight: "600", color: Colors.white },
});
