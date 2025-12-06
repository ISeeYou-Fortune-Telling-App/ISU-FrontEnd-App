import Colors from "@/src/constants/colors";
import { deleteCertificate, getCertificates } from "@/src/services/api";
import { MaterialIcons } from "@expo/vector-icons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { LucideFileText, LucideX } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

interface Certificate {
  id: string;
  createdAt: string;
  updatedAt: string;
  seerName: string;
  certificateName: string;
  certificateDescription: string;
  issuedBy: string;
  issuedAt: string;
  expirationDate: string | null;
  certificateUrl: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  decisionReason: string | null;
  decisionDate: string | null;
  categories: string[];
}

interface ApiResponse {
  statusCode: number;
  message: string;
  data: Certificate[];
  paging: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface CertificateItemProps {
  certificate: Certificate;
  onRemove: () => void;
  onClick: () => void;
}

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

const StatusFilter = ({
  selectedStatus,
  onStatusChange,
}: {
  selectedStatus: string;
  onStatusChange: (status: string) => void;
}) => {
  const statuses = [
    { key: "ALL", label: "Tất cả", color: Colors.gray },
    { key: "PENDING", label: "Chờ duyệt", color: "#F59E0B" },
    { key: "APPROVED", label: "Đã duyệt", color: "#10B981" },
    { key: "REJECTED", label: "Từ chối", color: "#EF4444" },
  ];

  return (
    <View style={styles.filterContainer}>
      {statuses.map((status) => (
        <TouchableOpacity
          key={status.key}
          style={[
            styles.filterButton,
            selectedStatus === status.key && { backgroundColor: status.color + "20" },
          ]}
          onPress={() => onStatusChange(status.key)}
        >
          <Text
            style={[
              styles.filterText,
              selectedStatus === status.key && { color: status.color, fontWeight: "bold" },
            ]}
          >
            {status.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const CertificateItem = ({
  certificate,
  onRemove,
  onClick,
}: CertificateItemProps) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING":
        return "#F59E0B";
      case "APPROVED":
        return "#10B981";
      case "REJECTED":
        return "#EF4444";
      default:
        return Colors.gray;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "PENDING":
        return "Chờ duyệt";
      case "APPROVED":
        return "Đã duyệt";
      case "REJECTED":
        return "Từ chối";
      default:
        return status;
    }
  };

  return (
    <TouchableOpacity style={styles.certificateItem} onPress={onClick}>
      <View style={styles.certificateIcon}>
        <LucideFileText size={24} color="#E53935" />
      </View>
      <View style={styles.certificateInfo}>
        <Text style={styles.certificateName} numberOfLines={1}>
          {certificate.certificateName}
        </Text>
        <Text style={styles.certificateIssuer} numberOfLines={1}>
          {certificate.issuedBy}
        </Text>
        <View style={styles.statusContainer}>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: getStatusColor(certificate.status) },
            ]}
          />
          <Text style={[styles.statusText, { color: getStatusColor(certificate.status) }]}>
            {getStatusLabel(certificate.status)}
          </Text>
        </View>
        {certificate.categories && certificate.categories.length > 0 && (
          <View style={styles.categoriesContainer}>
            {certificate.categories.map((category, index) => {
              const palette = getCategoryStyle(category);
              return (
                <View key={index} style={[styles.categoryChip, { backgroundColor: palette.background }]}>
                  <Text style={[styles.categoryChipText, { color: palette.text }]}>
                    {category}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
        {certificate.decisionReason && (
          <Text style={styles.decisionReason} numberOfLines={2}>
            {certificate.decisionReason}
          </Text>
        )}
      </View>
      <TouchableOpacity
        style={styles.certificateActionButton}
        onPress={onRemove}
        accessibilityLabel="Xóa chứng chỉ"
      >
        <LucideX size={22} color="#E53935" />
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

export default function ManageCertificateScreen() {
  const params = useLocalSearchParams();
  
  const [allCertificates, setAllCertificates] = useState<Certificate[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const loadUserId = async () => {
      try {
        const id = await SecureStore.getItemAsync("userId");
        if (id) {
          setUserId(id);
        } else {
          Alert.alert("Lỗi", "Không tìm thấy thông tin người dùng");
        }
      } catch (error) {
        console.error("Error loading userId:", error);
        Alert.alert("Lỗi", "Không thể tải thông tin người dùng");
      }
    };
    loadUserId();
  }, []);

  useEffect(() => {
    if (userId) {
      loadCertificates(true);
    }
  }, [userId]);

  useEffect(() => {
    if (selectedStatus === "ALL") {
      setCertificates(allCertificates);
    } else {
      setCertificates(allCertificates.filter(cert => cert.status === selectedStatus));
    }
  }, [selectedStatus, allCertificates]);

  // Check for refresh parameter when component mounts or params change
  useEffect(() => {
    if (params.refresh === 'true') {
      loadCertificates(true);
      // Clear the refresh param after a short delay to prevent re-triggering
      setTimeout(() => {
        router.setParams({ refresh: undefined });
      }, 100);
    }
  }, [params.refresh]);

  // Auto-reload when screen comes into focus (e.g., returning from add/edit screen)
  useFocusEffect(
    useCallback(() => {
      if (userId) {
        // Reload certificates when screen regains focus
        loadCertificates(true);
      }
    }, [userId])
  );

  const loadCertificates = async (reset: boolean = false) => {
    if (loading || (loadingMore && !reset)) return;

    if (!userId) {
      console.log('No userId available, skipping load');
      return;
    }

    if (!reset && certificates.length >= totalCount && totalCount > 0) {
      setHasMore(false);
      return;
    }

    try {
      if (reset) {
        setLoading(true);
        setCurrentPage(1);
      } else {
        setLoadingMore(true);
      }

      const page = reset ? 1 : currentPage;
      const params: any = {
        page: page,
        limit: 15,
        sortType: "desc",
        sortBy: "createdAt",
      };

      console.log('Requesting page:', page, 'for userId:', userId);
      const response: { data: ApiResponse } = await getCertificates(userId, params);
      if (response.data.statusCode === 200) {
        const newCertificates = response.data.data;
        const paging = response.data.paging;

        let newTotalLength = 0;
        if (reset) {
          setAllCertificates(newCertificates);
          newTotalLength = newCertificates.length;
          setCurrentPage(2);
        } else {
          setAllCertificates(prev => {
            const existingKeys = new Set(prev.map(cert => `${cert.id}-${cert.createdAt}`));
            const uniqueNewCertificates = newCertificates.filter(cert => !existingKeys.has(`${cert.id}-${cert.createdAt}`));
            newTotalLength = prev.length + uniqueNewCertificates.length;
            return [...prev, ...uniqueNewCertificates];
          });
          setCurrentPage(currentPage + 1);
        }

        setTotalPages(paging.totalPages);
        setTotalCount(paging.total);
        const hasMorePages = paging.page < paging.totalPages;
        setHasMore(hasMorePages);
        console.log('Load complete:', { requestedPage: page, apiPage: paging.page, totalPages: paging.totalPages, total: paging.total, loaded: newTotalLength, nextPage: reset ? 2 : currentPage + 1, hasMore: hasMorePages });
      }
    } catch (error) {
      console.error("Error loading certificates:", error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleAddCertificate = () => {
    router.push("/add-certificate?mode=create");
  };

  const handleRemoveCertificate = (id: string) => {
    Alert.alert(
      "Xóa chứng chỉ",
      "Bạn có chắc chắn muốn xóa chứng chỉ này?",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteCertificate(id);
              setAllCertificates((prev) => prev.filter((cert) => cert.id !== id));
            } catch (error) {
              console.error("Error deleting certificate:", error);
              Alert.alert("Lỗi", "Không thể xóa chứng chỉ. Vui lòng thử lại.");
            }
          },
        },
      ],
    );
  };

  const handleLoadMore = () => {
    console.log('handleLoadMore called:', { hasMore, loadingMore, certLength: allCertificates.length, totalCount, currentPage });
    if (hasMore && !loadingMore && allCertificates.length < totalCount) {
      console.log('Loading more certificates...');
      loadCertificates(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadCertificates(true);
    setRefreshing(false);
  };

  const renderCertificate = ({ item }: { item: Certificate }) => (
    <CertificateItem
      certificate={item}
      onRemove={() => handleRemoveCertificate(item.id)}
      onClick={() => router.push(`/add-certificate?mode=view&certificateId=${item.id}`)}
    />
  );

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.loadingMore}>
        <Text style={styles.loadingMoreText}>Đang tải thêm...</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <MaterialIcons name="arrow-back" size={28} color={Colors.black} onPress={() => router.back()} />
        <View style={styles.titleContainer}>
          <Text variant="titleLarge" style={styles.title}>Quản lý chứng chỉ</Text>
        </View>
        <View style={styles.headerPlaceholder} />
      </View>

      <View style={styles.fixedHeader}>
        <Text variant="headlineSmall" style={styles.sectionTitle}>
          Chứng chỉ & Bằng cấp
        </Text>
        <Text variant="bodyMedium" style={styles.sectionSubtitle}>
          Quản lý các chứng chỉ đã tải lên và theo dõi trạng thái duyệt.
        </Text>

        <TouchableOpacity
          style={styles.addButton}
          onPress={handleAddCertificate}
          accessibilityRole="button"
        >
          <MaterialIcons name="file-upload" size={24} color={Colors.primary} />
          <Text style={styles.addButtonText}>Thêm chứng chỉ</Text>
        </TouchableOpacity>

        <StatusFilter
          selectedStatus={selectedStatus}
          onStatusChange={(status) => {
            setSelectedStatus(status);
            // Reset will happen in useEffect
          }}
        />

        <Text style={styles.certificatesTitle}>
          Chứng chỉ đã tải lên ({certificates.length})
        </Text>
      </View>

      <FlatList
        data={certificates}
        renderItem={renderCertificate}
        keyExtractor={(item, index) => `cert-${index}`}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.1}
        ListFooterComponent={renderFooter}
        showsVerticalScrollIndicator={true}
        refreshControl={
          <RefreshControl
            refreshing={refreshing || loading}
            onRefresh={handleRefresh}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
        contentContainerStyle={certificates.length === 0 ? [styles.certificatesList, styles.emptyList] : styles.certificatesList}
        ListEmptyComponent={
          loading ? (
            <Text style={styles.loadingText}>Đang tải...</Text>
          ) : (
            <Text style={styles.emptyText}>
              {selectedStatus === "ALL"
                ? "Chưa có chứng chỉ nào, hãy thêm mới để hoàn thiện hồ sơ."
                : `Không có chứng chỉ nào ở trạng thái ${selectedStatus.toLowerCase()}.`}
            </Text>
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#fff",
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 14,
        borderBottomWidth: 1,
        borderBottomColor: "#eee",
        backgroundColor: Colors.background,
    },
    titleContainer: {
        flex: 1,
        alignItems: "center",
    },
    title: {
        fontWeight: "bold",
        color: Colors.black,
    },
    headerPlaceholder: {
        width: 28,
        height: 28,
    },
    fixedHeader: {
        padding: 16,
        backgroundColor: "#fff",
    },
    content: {
        flex: 1,
    },
    contentPadding: {
        padding: 16,
    },
    sectionSpacing: {
        marginTop: 16,
    },
    sectionTitle: {
        fontWeight: "bold",
        textAlign: "center",
    },
    sectionSubtitle: {
        textAlign: "center",
        color: Colors.gray,
        marginTop: 8,
        marginBottom: 24,
    },
    addButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: Colors.primary,
        borderRadius: 8,
        padding: 12,
        borderStyle: "dashed",
        marginBottom: 16,
    },
    addButtonText: {
        marginLeft: 8,
        color: Colors.primary,
        fontWeight: "500",
    },
    filterContainer: {
        flexDirection: "row",
        justifyContent: "center",
        marginBottom: 16,
    },
    filterButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        marginHorizontal: 4,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: Colors.borderGray,
    },
    filterText: {
        fontSize: 14,
        color: Colors.gray,
    },
    certificatesSection: {
        marginTop: 12,
    },
    certificatesTitle: {
        fontWeight: "500",
        marginBottom: 12,
    },
    certificatesList: {
        paddingHorizontal: 16,
        paddingBottom: 20,
    },
    certificateItem: {
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#eee",
        borderRadius: 8,
        padding: 8,
        marginBottom: 12,
        backgroundColor: Colors.white,
    },
    certificateIcon: {
        marginRight: 12,
    },
    certificateInfo: {
        flex: 1,
    },
    certificateName: {
        fontSize: 16,
        fontWeight: "500",
        marginBottom: 4,
    },
    certificateIssuer: {
        fontSize: 14,
        color: Colors.gray,
        marginBottom: 4,
    },
    certificateActionButton: {
        padding: 8,
    },
    statusContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 4,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 6,
    },
    statusText: {
        fontSize: 12,
        fontWeight: "500",
    },
    decisionReason: {
        fontSize: 12,
        color: Colors.gray,
        fontStyle: "italic",
    },
    loadingText: {
        textAlign: "center",
        color: Colors.gray,
        padding: 20,
    },
    emptyText: {
        textAlign: "center",
        color: Colors.gray,
        padding: 20,
        fontStyle: "italic",
    },
    categoriesContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        marginTop: 4,
    },
    categoryChip: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        marginRight: 6,
        marginBottom: 4,
        alignSelf: 'flex-start',
    },
    categoryChipText: {
        fontSize: 12,
        fontFamily: "Inter",
    },
    loadingMore: {
        padding: 16,
        alignItems: "center",
    },
    loadingMoreText: {
        color: Colors.gray,
    },
    emptyList: {
        flexGrow: 1,
        justifyContent: "center",
    },
});