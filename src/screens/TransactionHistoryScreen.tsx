import Colors from "@/src/constants/colors";
import { getCustomerPayments, getSeerPayments } from "@/src/services/api";
import { router, useFocusEffect } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Đang xử lý",
  COMPLETED: "Thành công",
  FAILED: "Thất bại",
  REFUNDED: "Đã hoàn",
};

const METHOD_LABELS: Record<string, string> = {
  CASH: "Tiền mặt",
  MOMO: "MoMo",
  VNPAY: "VNPay",
  BANK_TRANSFER: "Chuyển khoản",
};

type Payment = {
  id: string;
  packageTitle?: string | null;
  amount?: number | null;
  paymentStatus?: string | null;
  paymentMethod?: string | null;
  transactionId?: string | null;
  failureReason?: string | null;
  createdAt?: string | null;
};

const formatCurrency = (value?: number | null) => {
  if (typeof value !== "number") {
    return "0 ₫";
  }
  try {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    }).format(value);
  } catch (_error) {
    return `${value.toLocaleString()} ₫`;
  }
};

const formatDateTime = (value?: string | null) => {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const mapPayment = (item: any, index: number): Payment => ({
  id: String(item?.id ?? item?.paymentId ?? index),
  packageTitle: item?.packageTitle ?? item?.servicePackageName ?? null,
  amount: typeof item?.amount === "number" ? item.amount : null,
  paymentStatus: item?.paymentStatus ?? null,
  paymentMethod: item?.paymentMethod ?? null,
  transactionId: item?.transactionId ?? null,
  failureReason: item?.failureReason ?? null,
  createdAt: item?.createdAt ?? null,
});

export default function TransactionHistoryScreen() {
  const [role, setRole] = useState<string | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isFetchingRef = useRef(false);
  const pageRef = useRef(1);
  const hasMoreRef = useRef(true);

  useEffect(() => {
    let mounted = true;
    const loadRole = async () => {
      try {
        const storedRole = await SecureStore.getItemAsync("userRole");
        if (mounted) {
          setRole(storedRole ?? "CUSTOMER");
        }
      } catch (err) {
        console.error("Failed to read user role", err);
        if (mounted) {
          setRole("CUSTOMER");
        }
      }
    };
    loadRole();
    return () => {
      mounted = false;
    };
  }, []);

  const fetchPayments = useCallback(
    async (options: { reset?: boolean } = {}) => {
      if (!role) {
        return;
      }

      if (role === "ADMIN") {
        setError("Tính năng đang chờ backend cung cấp endpoint cho Admin.");
        return;
      }

      const { reset = false } = options;

      if (reset) {
        pageRef.current = 1;
        hasMoreRef.current = true;
        setHasMore(true);
        setPayments([]);
        setPage(1);
        setError(null);
      } else if (!hasMoreRef.current) {
        return;
      }

      if (isFetchingRef.current) {
        return;
      }

      const targetPage = pageRef.current;
      isFetchingRef.current = true;
      setLoading(true);

      try {
        const params = {
          page: targetPage,
          limit: 10,
          sortType: "desc",
          sortBy: "createdAt",
        };

        const response =
          role === "SEER" ? await getSeerPayments(params) : await getCustomerPayments(params);

        const dataArray = Array.isArray(response?.data?.data) ? response?.data?.data : [];
        const mapped = dataArray.map(mapPayment);

        setPayments((prev) => (reset ? mapped : [...prev, ...mapped]));
        setPage(targetPage);

        const paging = response?.data?.paging;
        const totalPages =
          typeof paging?.totalPages === "number" ? paging.totalPages : targetPage;
        const hasMorePages = targetPage < totalPages && mapped.length > 0;

        hasMoreRef.current = hasMorePages;
        setHasMore(hasMorePages);
        pageRef.current = hasMorePages ? targetPage + 1 : targetPage;
      } catch (err: any) {
        console.error("Failed to fetch payments", err);
        const message =
          err?.response?.data?.message ?? err?.message ?? "Không thể tải lịch sử giao dịch.";
        setError(message);
      } finally {
        isFetchingRef.current = false;
        setLoading(false);
        setRefreshing(false);
      }
    },
    [role],
  );

  useFocusEffect(
    useCallback(() => {
      if (role) {
        fetchPayments({ reset: true });
      }
    }, [role, fetchPayments]),
  );

  const handleRefresh = useCallback(() => {
    if (loading || isFetchingRef.current) {
      return;
    }
    setRefreshing(true);
    fetchPayments({ reset: true });
  }, [fetchPayments, loading]);

  const renderItem = useCallback(({ item }: { item: Payment }) => {
    const statusKey = (item.paymentStatus ?? "").toUpperCase();
    const statusLabel = STATUS_LABELS[statusKey] ?? item.paymentStatus ?? "";
    const methodKey = (item.paymentMethod ?? "").toUpperCase();
    const methodLabel = METHOD_LABELS[methodKey] ?? item.paymentMethod ?? "";

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {item.packageTitle ?? "Gói dịch vụ"}
          </Text>
          <Text style={[styles.statusBadge, styles[`status_${statusKey}` as keyof typeof styles] ?? styles.statusDefault]}>
            {statusLabel}
          </Text>
        </View>
        <Text style={styles.amount}>{formatCurrency(item.amount)}</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Phương thức:</Text>
          <Text style={styles.value}>{methodLabel}</Text>
        </View>
        {item.transactionId ? (
          <View style={styles.row}>
            <Text style={styles.label}>Mã GD:</Text>
            <Text style={styles.value} numberOfLines={1}>{item.transactionId}</Text>
          </View>
        ) : null}
        <View style={styles.row}>
          <Text style={styles.label}>Thời gian:</Text>
          <Text style={styles.value}>{formatDateTime(item.createdAt)}</Text>
        </View>
        {item.failureReason ? (
          <View style={styles.failureBox}>
            <Text style={styles.failureLabel}>Lý do thất bại:</Text>
            <Text style={styles.failureReason}>{item.failureReason}</Text>
          </View>
        ) : null}
      </View>
    );
  }, []);

  const listEmptyComponent = useMemo(() => {
    if (loading) {
      return (
        <View style={styles.emptyWrapper}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      );
    }

    if (error) {
      return (
        <TouchableOpacity style={styles.emptyWrapper} onPress={() => fetchPayments({ reset: true })}>
          <Text style={styles.errorText}>{error}</Text>
          <Text style={styles.retryHint}>Nhấn để thử lại</Text>
        </TouchableOpacity>
      );
    }

    return (
      <View style={styles.emptyWrapper}>
        <Text style={styles.emptyText}>Chưa có giao dịch nào.</Text>
      </View>
    );
  }, [loading, error, fetchPayments]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>{"<"}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Lịch sử giao dịch</Text>
        <View style={styles.headerSpacer} />
      </View>

      {role === "ADMIN" ? (
        <View style={styles.adminNotice}>
          <Text style={styles.adminNoticeText}>
            Tài khoản Admin chưa hỗ trợ xem lịch sử giao dịch. Vui lòng liên hệ backend để bổ sung endpoint.
          </Text>
        </View>
      ) : null}

      <FlatList
        data={payments}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
        onEndReachedThreshold={0.3}
        onEndReached={() => fetchPayments()}
        ListEmptyComponent={listEmptyComponent}
        ListFooterComponent={
          loading && payments.length > 0 ? (
            <View style={styles.footerLoading}>
              <ActivityIndicator size="small" color={Colors.primary} />
            </View>
          ) : null
        }
        showsVerticalScrollIndicator={false}
      />
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
    borderBottomColor: "#e2e8f0",
  },
  backButton: {
    padding: 4,
    paddingRight: 12,
  },
  backText: {
    fontSize: 20,
    color: Colors.primary,
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "600",
    color: Colors.black,
  },
  headerSpacer: {
    width: 28,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#e2e8f0",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  cardTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: Colors.black,
    marginRight: 12,
  },
  amount: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.primary,
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  label: {
    fontSize: 13,
    color: "#64748b",
  },
  value: {
    fontSize: 13,
    color: Colors.black,
    marginLeft: 8,
    flexShrink: 1,
    textAlign: "right",
  },
  failureBox: {
    marginTop: 10,
    padding: 10,
    backgroundColor: "#fee2e2",
    borderRadius: 8,
  },
  failureLabel: {
    fontSize: 12,
    color: "#b91c1c",
    fontWeight: "600",
  },
  failureReason: {
    fontSize: 12,
    color: "#7f1d1d",
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    fontSize: 12,
    fontWeight: "600",
    color: Colors.white,
  },
  statusDefault: {
    backgroundColor: Colors.primary,
  },
  status_PENDING: {
    backgroundColor: "#f59e0b",
  },
  status_COMPLETED: {
    backgroundColor: "#16a34a",
  },
  status_FAILED: {
    backgroundColor: "#dc2626",
  },
  status_REFUNDED: {
    backgroundColor: "#2563eb",
  },
  emptyWrapper: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
  },
  errorText: {
    fontSize: 14,
    color: "#dc2626",
    textAlign: "center",
    marginBottom: 8,
  },
  retryHint: {
    fontSize: 13,
    color: Colors.primary,
  },
  footerLoading: {
    paddingVertical: 12,
    alignItems: "center",
  },
  adminNotice: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    padding: 12,
    backgroundColor: "#e0f2fe",
    borderRadius: 10,
  },
  adminNoticeText: {
    fontSize: 13,
    color: "#0369a1",
  },
});
