import Colors from "@/src/constants/colors";
import { deleteServicePackage, getPackageBookingReviews, getServicePackageDetail, getServicePackageReviews } from "@/src/services/api";
import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
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
  const [comments, setComments] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [avatarError, setAvatarError] = useState(false);
  const [coverError, setCoverError] = useState(false);
  const [avatarErrors, setAvatarErrors] = useState<{ [key: number]: boolean }>({});
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [showFullDesc, setShowFullDesc] = useState(false);
  const [availableTimeSlots, setAvailableTimeSlots] = useState<timeSlot[]>([]);

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
        const params = {
          packageId: id,
        }
        const [detailResp, CommentResp, ReviewResp] = await Promise.all([
          getServicePackageDetail(id),
          getServicePackageReviews(id),
          getPackageBookingReviews(params)
        ]);
        setPkg(detailResp.data?.data);
        setComments(CommentResp.data?.data || []);
        setReviews(ReviewResp.data?.data || []);
        setAvailableTimeSlots(detailResp.data?.data.availableTimeSlots);
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

  const badge = getStatusBadge(pkg.status);

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
              setCoverError(true);
            }}
          />
          <View style={styles.categoryChipsRow}>
            {pkg.categories.map((c: any) => {
              const key = getCategoryKeyFromName(c.name || c);
              const col = (Colors.categoryColors as any)[key] || (Colors.categoryColors as any).other;
              return (
                <View key={c.id || c} style={[styles.chip, { backgroundColor: col.chip }]}>
                  <Text style={[styles.chipText, { color: col.icon }]} numberOfLines={1}>{c.name || c}</Text>
                </View>
              );
            })}
          </View>

          <View style={[styles.statusBadge, { backgroundColor: badge.color, flexDirection: 'row', alignItems: 'center' }]}>
            {badge.icon && (
              <MaterialCommunityIcons name={badge.icon as any} size={16} color={badge.textColor || Colors.white} style={{ marginRight: 2 }} />
            )}
            <Text style={[styles.statusBadgeText, badge.textColor ? { color: badge.textColor } : {}]}>{badge.label}</Text>
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
                ({pkg.totalReviews ?? comments.length} đánh giá)
              </Text>
            </View>
          </View>

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

            <Text
              style={styles.descText}
              numberOfLines={showFullDesc ? undefined : 6} // Show only 6 lines initially
            >
              {pkg.packageContent?.replace(/\\n/g, "\n")}
            </Text>

            {pkg.packageContent && pkg.packageContent.length > 250 && (
              <TouchableOpacity
                onPress={() => setShowFullDesc(!showFullDesc)}
                style={{ marginTop: 4 }}
              >
                <Text style={{ color: Colors.primary, fontFamily: "inter" }}>
                  {showFullDesc ? "Thu gọn" : "Đọc thêm"}
                </Text>
              </TouchableOpacity>
            )}
          </Card>

          {/* Schedule */}
          <Card style={styles.descCard}>
            <Text style={styles.infoTitle}>Thời gian rảnh</Text>
            {availableTimeSlots.length > 0 && (
              <View style={{ marginTop: 14 }}>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {availableTimeSlots
                    .slice()
                    .sort((a, b) => a.weekDate - b.weekDate)
                    .map((s) => (
                      <View key={s.weekDate} style={styles.selectedSummary}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Text style={{ fontWeight: '700', marginRight: 8 }}>{s.weekDate == 8 ? "Chủ Nhật" : "Thứ " + s.weekDate}</Text>
                        </View>
                        <Text>{displayTime(s.availableFrom)} - {displayTime(s.availableTo)}</Text>
                      </View>
                    ))}
                </View>
              </View>
            )}
          </Card>

          {/* ✅ Reviews */}
          <Card style={styles.reviewCard}>
            <Text style={styles.infoTitle}>Đánh giá ({reviews.length})</Text>

            {reviews.length === 0 ? (
              <Text style={{ color: "#666" }}>Chưa có đánh giá nào</Text>
            ) : (
              <View>
                {(showAllReviews ? reviews : reviews.slice(0, 3)).map((rev, index) => (
                  <ReviewItem key={index} rev={rev} />
                ))}

                {reviews.length > 3 && (
                  <TouchableOpacity
                    style={{ marginTop: 6 }}
                    onPress={() => setShowAllReviews(!showAllReviews)}
                  >
                    <Text style={{ color: Colors.primary, fontFamily: "inter" }}>
                      {showAllReviews ? "Thu gọn" : "Xem thêm đánh giá"}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </Card>
          {/* Comments */}
          <Card style={styles.reviewCard}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Text style={styles.infoTitle}>Bình luận ({comments.length})</Text>
            </View>

            {comments.length === 0 ? (
              <Text style={{ color: "#666" }}>Chưa có bình luận nào</Text>
            ) : (
              <View>
                {comments.slice(0, 3).map((rev) => (
                  <View key={rev.reviewId} style={styles.reviewItem}>
                    <Image
                      source={
                        avatarErrors[rev.reviewId] || !rev.user?.avatarUrl
                          ? require("@/assets/images/user-placeholder.png")
                          : { uri: rev.user.avatarUrl }
                      }
                      style={styles.reviewAvatar}
                      resizeMode="cover"
                      onError={() =>
                        setAvatarErrors((prev) => ({ ...prev, [rev.reviewId]: true }))
                      }
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.reviewName} numberOfLines={1}>
                        {rev.user?.fullName ?? "Người dùng"}
                      </Text>
                      <Text style={styles.reviewComment} numberOfLines={2}>
                        {rev.comment}
                      </Text>
                      <Text style={styles.reviewDate}>
                        {new Date(rev.createdAt).toLocaleDateString("vi-VN")}
                      </Text>
                    </View>
                  </View>
                ))}

                <TouchableOpacity
                  style={{ marginTop: 6 }}
                  onPress={() =>
                    router.push({ pathname: "/service-package-reviews", params: { id } })
                  }
                >
                  <Text style={{ color: Colors.primary, fontFamily: "inter" }}>
                    Xem thêm bình luận
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </Card>

          {/* Actions */}
          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.editButton} onPress={() => router.push({
              pathname: "/update-package",
              params: {
                packageId: pkg.packageId,
              },
            })}>
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

const getCategoryKeyFromName = (name: string) => {
  if (!name) return "other";
  const n = name.toLowerCase();
  if (n.includes("tarot")) return "tarot";
  if (n.includes("cung") || n.includes("đạo") || n.includes("hoàng")) return "zodiac";
  if (n.includes("chỉ tay")) return "palmistry";
  if (n.includes("phong")) return "fengshui";
  if (n.includes("tử vi")) return "horoscope";
  if (n.includes("bói") || n.includes("bài") || n.includes("card")) return "card";
  if (n.includes("nhân") || n.includes("tướng")) return "physiognomy";
  if (n.includes("ngũ") || n.includes("hành")) return "elements";
  return "other";
};

type timeSlot = {
  weekDate: number,
  availableFrom: string,
  availableTo: string
}

const displayTime = (t: string) => (t ? t.slice(0, 5) : '');

type PackageStatus = "AVAILABLE" | "REJECTED" | "HAVE_REPORT" | "HIDDEN";

function getStatusBadge(status: PackageStatus) {
  if (status === "AVAILABLE") return { label: "Đã duyệt", color: Colors.green, icon: "check-circle" };
  if (status === "HIDDEN") return { label: "Chờ duyệt", color: Colors.yellow, icon: "clock-outline" };
  if (status === "REJECTED") return { label: "Bị từ chối", color: Colors.purple, textColor: Colors.white, icon: "close-circle" };
  return { label: status, color: Colors.gray };
}

type Review = {
  rating: number;
  comment: string;
  reviewedAt: string;
  customer?: {
    customerName: string;
    customerAvatar: string;
  }
}

interface ReviewItemProps {
  rev: Review;
}

const ReviewItem: React.FC<ReviewItemProps> = ({ rev }) => {
  const [avatarError, setAvatarError] = useState(false);

  return (
    <View style={styles.reviewItem}>
      <Image
        source={
          avatarError || !rev.customer?.customerAvatar
            ? require("@/assets/images/user-placeholder.png")
            : { uri: rev.customer.customerAvatar }
        }
        style={styles.reviewAvatar}
        resizeMode="cover"
        onError={() => setAvatarError(true)}
      />
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={styles.reviewName} numberOfLines={1}>{rev.customer?.customerName ?? "Người dùng"}</Text>
          <View style={{ flexDirection: "row", marginLeft: 5 }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <MaterialIcons
                key={i}
                name={i <= rev.rating ? "star" : "star-border"}
                size={16}
                color={i <= rev.rating ? "#FFD700" : "#9CA3AF"}
              />
            ))}
          </View>
        </View>

        <Text style={styles.reviewComment} numberOfLines={2}>{rev.comment}</Text>
        <Text style={styles.reviewDate}>
          {new Date(rev.reviewedAt).toLocaleDateString("vi-VN")}
        </Text>
      </View>
    </View>
  );
};


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
  categoryChipsRow: { position: "absolute", top: 12, left: 12, flexDirection: "row", alignItems: "center", flexWrap: "wrap" },
  chip: { paddingVertical: 4, paddingHorizontal: 8, borderRadius: 12, marginRight: 6, maxWidth: 140 },
  chipText: { fontSize: 12, fontFamily: "inter" },
  overflowChip: { backgroundColor: "#e5e7eb" },
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
  reviewCount: { color: "#666", fontSize: 12, fontFamily: "inter", marginLeft: 4 },
  seerCard: { marginBottom: 16, padding: 16 },
  seerRow: { flexDirection: "row", alignItems: "center" },
  seerAvatar: { width: 50, height: 50, borderRadius: 25, marginRight: 12, borderWidth: 1, borderColor: Colors.grayBackground },
  seerName: { fontWeight: "bold", fontSize: 17 },
  seerRating: { color: "#666", fontFamily: "inter", fontSize: 14 },
  infoCard: { marginBottom: 16, padding: 16 },
  infoTitle: { fontWeight: "bold", fontSize: 16, marginBottom: 8 },
  infoRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  infoLabel: { flex: 1, marginLeft: 8, color: "#333", fontFamily: "inter" },
  infoValue: { fontWeight: "600", color: "#000", fontFamily: "inter" },
  descCard: { marginBottom: 16, padding: 16 },
  descText: { color: "#333", marginTop: 6, lineHeight: 20, fontFamily: "inter" },

  // ✅ Reviews
  reviewCard: { marginBottom: 16, padding: 16 },
  reviewItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  reviewAvatar: { width: 40, height: 40, borderRadius: 50, marginRight: 10, borderWidth: 1, borderColor: Colors.grayBackground },
  reviewName: { fontWeight: "600" },
  reviewComment: { color: "#333", marginTop: 2, fontFamily: "inter", fontSize: 13 },
  reviewDate: { fontSize: 11, color: "#888", marginTop: 2, fontFamily: "inter" },

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
  editText: { fontFamily: "inter", color: Colors.black },
  scheduleText: { fontFamily: "inter", color: Colors.white },
  selectedSummary: {
    backgroundColor: Colors.likeChipBg,
    padding: 8,
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 8,
    minWidth: 120,
    alignItems: 'flex-start',
  },
});
