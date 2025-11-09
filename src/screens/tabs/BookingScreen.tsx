import TopBarNoSearch from "@/src/components/TopBarNoSearch";
import Colors from "@/src/constants/colors";
import { getMyBookings } from "@/src/services/api";
import { Ionicons } from "@expo/vector-icons";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import dayjs from "dayjs";
import { router, useFocusEffect } from "expo-router";
import * as SecureStore from 'expo-secure-store';
import { ChevronRight } from "lucide-react-native";
import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type BookingStatus = "COMPLETED" | "CANCELED" | "CONFIRMED" | "PENDING" | "FAILED";
type PaymentMethod = "VNPAY" | "PAYPAL" | "MOMO";
type PaymentStatus = "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED";

interface PaymentInfo {
  amount: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paymentTime: string;
  approvalUrl: string | null;
  failureReason: string | null;
}

interface BookingResponse {
  id: string;
  createdAt: string;
  updatedAt: string;
  status: BookingStatus;
  seer: { fullName: string; avatarUrl: string; avgRating: number };
  customer: { fullName: string; avatarUrl: string };
  servicePackage: {
    packageTitle: string;
    packageContent: string;
    price: number;
    durationMinutes: number;
    categories: string[];
  };
  scheduledTime: string;
  additionalNote: string;
  bookingPaymentInfos: PaymentInfo[];
  redirectUrl: string | null;
}

interface PagingInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface BookingsState {
  bookings: BookingResponse[];
  paging: PagingInfo;
  loading: boolean;
  loadingMore: boolean;
  refreshing: boolean;
}

const ITEMS_PER_PAGE = 15;

export default function BookingScreen() {
  const [role, setRole] = useState<string>("");
  const [selectedTab, setSelectedTab] = useState<BookingStatus>("CONFIRMED");
  const tabBarHeight = useBottomTabBarHeight();
  const [state, setState] = useState<BookingsState>({
    bookings: [],
    paging: { page: 1, limit: ITEMS_PER_PAGE, total: 0, totalPages: 0 },
    loading: true,
    loadingMore: false,
    refreshing: false,
  });
  const [counts, setCounts] = useState({ upcoming: 0, completed: 0, canceled: 0 });

  const fetchBookings = useCallback(async (page: number = 1) => {
    try {
      // Mark loading state correctly
      setState(prev => ({
        ...prev,
        loading: page === 1,
        loadingMore: page > 1,
      }));

      let response;
      if (selectedTab === "CONFIRMED") {
        const itemsPerStatus = Math.ceil(ITEMS_PER_PAGE / 2);
        const startIndex = (page - 1) * ITEMS_PER_PAGE;
        const confirmedStartPage = Math.floor(startIndex / itemsPerStatus) + 1;
        const pendingStartPage = confirmedStartPage;

        const [confirmedRes, pendingRes] = await Promise.all([
          getMyBookings({
            page: confirmedStartPage,
            limit: itemsPerStatus,
            sortType: "desc",
            sortBy: "createdAt",
            status: "CONFIRMED"
          }),
          getMyBookings({
            page: pendingStartPage,
            limit: itemsPerStatus,
            sortType: "desc",
            sortBy: "createdAt",
            status: "PENDING"
          })
        ]);

        const allBookings = [...(confirmedRes.data.data || []), ...(pendingRes.data.data || [])];
        const sortedBookings = allBookings.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        const totalConfirmed = confirmedRes.data.paging?.total || 0;
        const totalPending = pendingRes.data.paging?.total || 0;
        const total = totalConfirmed + totalPending;

        // ✅ Fix: Slice based on page
        const start = (page - 1) * ITEMS_PER_PAGE;
        const end = start + ITEMS_PER_PAGE;
        const pagedData = sortedBookings.slice(start, end);

        response = {
          data: {
            data: pagedData,
            paging: {
              page,
              limit: ITEMS_PER_PAGE,
              total,
              totalPages: Math.ceil(total / ITEMS_PER_PAGE),
            },
          },
        };
      } else if (selectedTab === "CANCELED") {
        const itemsPerStatus = Math.ceil(ITEMS_PER_PAGE / 2);
        const startIndex = (page - 1) * ITEMS_PER_PAGE;
        const canceledStartPage = Math.floor(startIndex / itemsPerStatus) + 1;
        const failedStartPage = canceledStartPage;

        const [canceledRes, failedRes] = await Promise.all([
          getMyBookings({
            page: canceledStartPage,
            limit: itemsPerStatus,
            sortType: "desc",
            sortBy: "createdAt",
            status: "CANCELED"
          }),
          getMyBookings({
            page: failedStartPage,
            limit: itemsPerStatus,
            sortType: "desc",
            sortBy: "createdAt",
            status: "FAILED"
          })
        ]);

        const allBookings = [...(canceledRes.data.data || []), ...(failedRes.data.data || [])];
        const sortedBookings = allBookings.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        const totalCanceled = canceledRes.data.paging?.total || 0;
        const totalFailed = failedRes.data.paging?.total || 0;
        const total = totalCanceled + totalFailed;

        // ✅ Fix: Slice based on page
        const start = (page - 1) * ITEMS_PER_PAGE;
        const end = start + ITEMS_PER_PAGE;
        const pagedData = sortedBookings.slice(start, end);

        response = {
          data: {
            data: pagedData,
            paging: {
              page,
              limit: ITEMS_PER_PAGE,
              total,
              totalPages: Math.ceil(total / ITEMS_PER_PAGE),
            },
          },
        };
      } else {
        // Completed tab
        response = await getMyBookings({
          page,
          limit: ITEMS_PER_PAGE,
          sortType: "desc",
          sortBy: "createdAt",
          status: selectedTab,
        });
      }

      // ✅ Merge or replace bookings
      setState(prev => ({
        ...prev,
        bookings:
          page === 1
            ? response.data.data
            : [...prev.bookings, ...response.data.data],
        paging: { ...response.data.paging, page },
        loading: false,
        loadingMore: false,
        refreshing: false,
      }));
    } catch (error) {
      console.error("Error fetching bookings:", error);
      setState(prev => ({
        ...prev,
        loading: false,
        loadingMore: false,
        refreshing: false,
      }));
    }
  }, [selectedTab]);

  const fetchCounts = useCallback(async () => {
    try {
      const statuses = ["CONFIRMED", "PENDING", "COMPLETED", "CANCELED", "FAILED"] as BookingStatus[];
      const promises = statuses.map((s) =>
        getMyBookings({ page: 1, limit: 1, status: s, sortType: "desc", sortBy: "createdAt" })
          .then(res => ({ status: s, total: res?.data?.paging?.total ?? 0 }))
          .catch(() => ({ status: s, total: 0 }))
      );

      const results = await Promise.all(promises);
      const map = results.reduce((acc, cur) => {
        acc[cur.status] = cur.total;
        return acc;
      }, {} as Record<string, number>);

      const upcoming = (map["CONFIRMED"] || 0) + (map["PENDING"] || 0);
      const completed = map["COMPLETED"] || 0;
      const canceled = (map["CANCELED"] || 0) + (map["FAILED"] || 0);
      setCounts({ upcoming, completed, canceled });
    } catch (err) {
      console.error("Error fetching booking counts", err);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setState(prev => ({ ...prev, loading: true }));
      (async () => {
        try {
          const storedRole = await SecureStore.getItemAsync("userRole");
          if (storedRole) setRole(storedRole);
        } catch (e) {
          console.warn("Unable to read userRole from SecureStore", e);
        }
      })();
      fetchBookings(1);
      fetchCounts();
    }, [selectedTab, fetchBookings, fetchCounts])
  );

  const handleRefresh = useCallback(() => {
    setState(prev => ({ ...prev, refreshing: true }));
    fetchBookings(1);
  }, [fetchBookings]);

  const handleLoadMore = useCallback(() => {
    const { page, totalPages } = state.paging;
    if (page < totalPages && !state.loading && !state.loadingMore && !state.refreshing) {
      fetchBookings(page + 1);
    }
  }, [state.paging, state.loading, state.loadingMore, state.refreshing, fetchBookings]);

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeAreaView}>
      <TopBarNoSearch />

      <View style={{ backgroundColor: Colors.white, marginBottom: 15, borderBottomWidth: 1, borderBottomColor: '#E0E0E0' }}>
        <View style={{ margin: 10 }}>
          <View style={styles.headerBar}>
            <Text style={styles.title}>Lịch hẹn của tôi</Text>
            <TouchableOpacity style={styles.filterButton}>
              <Ionicons name="filter-outline" size={20} color="#111" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.newBookingBtn}>
            <Ionicons name="add" size={16} color="white" />
            <Text style={styles.newBookingText}>Đặt lịch mới</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.tabRow}>
        <TabButton label="Sắp tới" count={counts.upcoming} active={selectedTab === "CONFIRMED"} color={Colors.primary} onPress={() => setSelectedTab("CONFIRMED")} />
        <TabButton label="Hoàn thành" count={counts.completed} active={selectedTab === "COMPLETED"} color={Colors.green} onPress={() => setSelectedTab("COMPLETED")} />
        <TabButton label="Đã hủy" count={counts.canceled} active={selectedTab === "CANCELED"} color="#dc2626" onPress={() => setSelectedTab("CANCELED")} />
      </View>

      {state.loading && !state.refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={state.bookings}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <BookingCard booking={item} role={role} />}
          contentContainerStyle={{ paddingBottom: tabBarHeight }}
          onRefresh={handleRefresh}
          refreshing={state.refreshing}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Không có lịch hẹn nào</Text>
            </View>
          }
          ListFooterComponent={
            state.loadingMore ? (
              <ActivityIndicator color={Colors.primary} style={{ marginVertical: 20 }} />
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

function TabButton({ label, count, active, color, onPress }: { label: string; count: number; active: boolean; color: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.tabButton, { backgroundColor: active ? color : "white", borderColor: color }]} onPress={onPress}>
      <Text style={[styles.tabText, { color: active ? "white" : color }]}>{count}</Text>
      <Text style={[styles.tabText, { color: active ? "white" : "#111" }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const statusBadgeText: Record<BookingStatus, string> = {
  CONFIRMED: "Đã xác nhận",
  PENDING: "Chờ xác nhận",
  COMPLETED: "Hoàn thành",
  CANCELED: "Đã hủy",
  FAILED: "Thất bại"
};

function BookingCard({ booking, role }: { booking: BookingResponse; role: string }) {
  const formattedDate = dayjs(booking.scheduledTime).format("DD/MM/YYYY");
  const formattedTime = dayjs(booking.scheduledTime).format("HH:mm");
  const [avatarError, setAvatarError] = useState(false);

  return (
    <View style={styles.card}>
      <View style={styles.cardLeft}>
        <Image
          source={
            avatarError || !(role === "SEER" ? booking.customer.avatarUrl : booking.seer.avatarUrl)
              ? require("@/assets/images/user-placeholder.png")
              : { uri: role === "SEER" ? booking.customer.avatarUrl : booking.seer.avatarUrl }
          }
          style={styles.avatar}
          onError={() => setAvatarError(true)}
        />
        <View style={{ flex: 1 }}>
          <Text style={styles.name} numberOfLines={1}>{role === "SEER" ? booking.customer.fullName : booking.seer.fullName}</Text>
          <Text style={styles.desc} numberOfLines={2}>{booking.servicePackage.packageTitle}</Text>
          <View style={styles.row}>
            <Ionicons name="calendar-outline" size={14} color="#555" />
            <Text style={styles.infoText}>{formattedDate}</Text>
            <Ionicons name="time-outline" size={14} color="#555" style={{ marginLeft: 8 }} />
            <Text style={styles.infoText}>{formattedTime}</Text>
          </View>
        </View>
      </View>
      <View style={styles.badgeWrapper}>
        <Text style={[styles.badge, badgeColors[booking.status]]}>{statusBadgeText[booking.status]}</Text>
      </View>
      <TouchableOpacity onPress={() => router.push({ pathname: "/booking-detail", params: { bookingId: booking.id } })}>
        <ChevronRight size={20} style={{ marginLeft: 10 }} />
      </TouchableOpacity>
    </View>
  );
}

const badgeColors: Record<BookingStatus, any> = {
  CONFIRMED: { backgroundColor: "#e0e7ff", color: Colors.primary },
  PENDING: { backgroundColor: "#faffe0ff", color: "#d8c200ff" },
  COMPLETED: { backgroundColor: "#dcfce7", color: "#16a34a" },
  CANCELED: { backgroundColor: "#fee2e2", color: "#dc2626" },
  FAILED: { backgroundColor: "#fee2e2", color: "#dc2626" },
};

const styles = StyleSheet.create({
  safeAreaView: { flex: 1, backgroundColor: Colors.grayBackground },
  headerBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  title: { fontSize: 22, color: "#111" },
  filterButton: { padding: 6, borderRadius: 6, backgroundColor: "white", borderWidth: 1, borderColor: "#d1d5db" },
  newBookingBtn: { flexDirection: "row", backgroundColor: Colors.primary, padding: 10, borderRadius: 8, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  newBookingText: { color: "white", marginLeft: 4, fontFamily: "inter" },
  tabRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 15 },
  tabButton: { flex: 1, borderRadius: 8, borderWidth: 1, paddingVertical: 15, marginHorizontal: 10, alignItems: "center" },
  tabText: { fontSize: 15, fontFamily: "inter" },
  card: { flexDirection: "row", backgroundColor: "white", padding: 12, borderRadius: 10, marginBottom: 10, marginHorizontal: 10, borderWidth: 1, borderColor: "#e5e7eb", alignItems: "center" },
  cardLeft: { flexDirection: "row", flex: 1 },
  avatar: { width: 60, height: 60, borderRadius: 50, backgroundColor: Colors.background, marginRight: 10 },
  name: { fontSize: 15, fontFamily: "inter", fontWeight: "600", color: "#111" },
  desc: { fontSize: 13, fontFamily: "inter", color: "#333", marginBottom: 4 },
  row: { flexDirection: "row", alignItems: "center" },
  infoText: { fontSize: 12, color: "#666", marginLeft: 4, fontFamily: "inter" },
  badgeWrapper: { marginLeft: 8 },
  badge: { paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6, fontSize: 12, fontWeight: "600", overflow: "hidden" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  emptyText: { fontSize: 16, color: "#666", textAlign: "center" }
})
