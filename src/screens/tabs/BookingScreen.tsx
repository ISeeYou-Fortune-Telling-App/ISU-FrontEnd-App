import TopBarNoSearch from "@/src/components/TopBarNoSearch";
import Colors from "@/src/constants/colors";
import { getMyBookings } from "@/src/services/api";
import { Ionicons } from "@expo/vector-icons";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import dayjs from "dayjs";
import { router, useFocusEffect } from "expo-router";
import * as SecureStore from 'expo-secure-store';
import { ChevronRight } from "lucide-react-native";
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Image, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Calendar } from "react-native-calendars";
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

const MAX_BOOKINGS = 1000;

export default function BookingScreen() {
  const [role, setRole] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>(dayjs().format("YYYY-MM-DD"));
  const [allBookings, setAllBookings] = useState<BookingResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const tabBarHeight = useBottomTabBarHeight();

  const fetchAllBookings = useCallback(async (isRefresh = false) => {
    setLoading(!isRefresh);
    setRefreshing(isRefresh);

    try {
      const statuses: BookingStatus[] = ["PENDING", "CONFIRMED", "COMPLETED", "CANCELED", "FAILED"];

      const promises = statuses.map((status) =>
        getMyBookings({
          page: 1,
          limit: MAX_BOOKINGS,
          sortType: "desc",
          sortBy: "createdAt",
          status,
        })
      );

      const results = await Promise.allSettled(promises);
      let combinedBookings: BookingResponse[] = [];

      results.forEach((result, index) => {
        if (result.status === "fulfilled") {
          const data = (result as PromiseFulfilledResult<any>).value.data.data || [];
          combinedBookings.push(...data);
        } else {
          console.error(`Error fetching ${statuses[index]} bookings:`, (result as PromiseRejectedResult).reason);
        }
      });

      combinedBookings.sort(
        (a, b) => new Date(b.scheduledTime).getTime() - new Date(a.scheduledTime).getTime()
      );

      setAllBookings(combinedBookings);
    } catch (error) {
      console.error("Error fetching all bookings:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const filteredBookings = useMemo(() => {
    const startOfDay = dayjs(selectedDate).startOf("day").toDate();
    const endOfDay = dayjs(selectedDate).endOf("day").toDate();
    return allBookings.filter((booking) => {
      const scheduled = new Date(booking.scheduledTime);
      return scheduled >= startOfDay && scheduled <= endOfDay;
    });
  }, [allBookings, selectedDate]);

  const markedDates = useMemo(() => {
    const upcomingStatuses: BookingStatus[] = ["PENDING", "CONFIRMED"];
    const pastStatuses: BookingStatus[] = ["COMPLETED", "CANCELED", "FAILED"];

    const datesWithUpcoming = allBookings
      .filter((booking) => upcomingStatuses.includes(booking.status))
      .map((booking) => dayjs(booking.scheduledTime).format("YYYY-MM-DD"))
      .filter((date, index, self) => self.indexOf(date) === index);

    const datesWithPast = allBookings
      .filter((booking) => pastStatuses.includes(booking.status))
      .map((booking) => dayjs(booking.scheduledTime).format("YYYY-MM-DD"))
      .filter((date, index, self) => self.indexOf(date) === index);

    const marked: { [key: string]: any } = {};

    datesWithUpcoming.forEach((date) => {
      marked[date] = {
        selected: true,
        selectedColor: '#e0e7ff',
        selectedTextColor: Colors.primary
      };
    });

    datesWithPast.forEach((date) => {
      if (!marked[date]) {
        marked[date] = {
          selected: true,
          selectedColor: '#f3f4f6',
          selectedTextColor: Colors.gray
        };
      }
    });

    marked[selectedDate] = {
      ...marked[selectedDate],
      selected: true,
      selectedColor: Colors.primary,
      selectedTextColor: 'white'
    };

    return marked;
  }, [allBookings, selectedDate]);

  const handleRefresh = useCallback(() => {
    fetchAllBookings(true);
  }, [fetchAllBookings]);

  useFocusEffect(
    useCallback(() => {
      const loadRole = async () => {
        try {
          const storedRole = await SecureStore.getItemAsync("userRole");
          if (storedRole) setRole(storedRole);
        } catch (e) {
          console.warn("Unable to read userRole from SecureStore", e);
        }
      };
      loadRole();
      fetchAllBookings(false);
    }, [fetchAllBookings])
  );

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

          {role === "CUSTOMER" && <TouchableOpacity style={styles.newBookingBtn} onPress={() => router.replace("/(tabs)/home")}>
            <Ionicons name="add" size={16} color="white" />
            <Text style={styles.newBookingText}>Đặt lịch mới</Text>
          </TouchableOpacity>}
        </View>
      </View>

      <Calendar
        style={styles.calendar}
        current={selectedDate}
        onDayPress={(day) => {
          setSelectedDate(day.dateString);
        }}
        markedDates={markedDates}
      />

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredBookings}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <BookingCard booking={item} role={role} />}
          contentContainerStyle={{ paddingBottom: tabBarHeight }}
          onRefresh={handleRefresh}
          refreshing={refreshing}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[Colors.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                Không có lịch hẹn nào vào ngày {dayjs(selectedDate).format("DD/MM/YYYY")}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
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
    <TouchableOpacity onPress={() => router.push({ pathname: "/booking-detail", params: { bookingId: booking.id } })}>
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

        <ChevronRight size={20} style={{ marginLeft: 10 }} />

      </View>
    </TouchableOpacity>
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
  calendar: { marginHorizontal: 10, marginBottom: 15 },
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
});