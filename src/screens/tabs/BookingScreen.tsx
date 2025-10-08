import TopBarNoSearch from "@/src/components/TopBarNoSearch";
import Colors from "@/src/constants/colors";
import { Ionicons } from "@expo/vector-icons";
import { ChevronRight } from "lucide-react-native";
import { useState } from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type BookingStatus = "upcoming" | "completed" | "cancelled";

interface Booking {
  id: string;
  name: string;
  description: string;
  date: string;
  time: string;
  status: BookingStatus;
  badge?: string; // "Đã xác nhận" / "Chờ xác nhận" / "Hoàn thành" / "Đã hủy"
}

const mockData: Booking[] = [
  {
    id: "1",
    name: "Thầy Minh Tuệ",
    description: "Xem bói tổng quát cuộc đời 2024",
    date: "15/08/2024",
    time: "14:30",
    status: "upcoming",
    badge: "Đã xác nhận",
  },
  {
    id: "2",
    name: "Cô Thanh Loan",
    description: "Tư vấn tình duyên & hôn nhân",
    date: "20/10/2024",
    time: "09:30",
    status: "upcoming",
    badge: "Chờ xác nhận",
  },
  {
    id: "3",
    name: "Thầy Minh Tuệ",
    description: "Xem bói tổng quát cuộc đời 2024",
    date: "15/08/2024",
    time: "14:30",
    status: "completed",
    badge: "Hoàn thành",
  },
  {
    id: "4",
    name: "Thầy Minh Tuệ",
    description: "Xem bói tổng quát cuộc đời 2024",
    date: "15/08/2024",
    time: "14:30",
    status: "completed",
    badge: "Hoàn thành",
  },
  {
    id: "5",
    name: "Thầy Minh Tuệ",
    description: "Xem bói tổng quát cuộc đời 2024",
    date: "15/08/2024",
    time: "14:30",
    status: "completed",
    badge: "Hoàn thành",
  },
  {
    id: "6",
    name: "Thầy Minh Tuệ",
    description: "Xem bói tổng quát cuộc đời 2024",
    date: "15/08/2024",
    time: "14:30",
    status: "completed",
    badge: "Hoàn thành",
  },
  {
    id: "7",
    name: "Thầy Minh Tuệ",
    description: "Xem bói tổng quát cuộc đời 2024",
    date: "15/08/2024",
    time: "14:30",
    status: "completed",
    badge: "Hoàn thành",
  },
  {
    id: "8",
    name: "Thầy Minh Tuệ",
    description: "Xem bói tổng quát cuộc đời 2024",
    date: "15/08/2024",
    time: "14:30",
    status: "completed",
    badge: "Hoàn thành",
  },
  {
    id: "9",
    name: "Thầy Minh Tuệ",
    description: "Xem bói tổng quát cuộc đời 2024",
    date: "15/08/2024",
    time: "14:30",
    status: "completed",
    badge: "Hoàn thành",
  },
  {
    id: "10",
    name: "Thầy Minh Tuệ",
    description: "Xem bói tổng quát cuộc đời 2024",
    date: "15/08/2024",
    time: "14:30",
    status: "cancelled",
    badge: "Đã hủy",
  },
];

export default function BookingScreen() {
  const [selectedTab, setSelectedTab] = useState<BookingStatus>("upcoming");

  const filteredData = mockData.filter((item) => item.status === selectedTab);

  return (
    <SafeAreaView style={styles.safeAreaView}>

      <TopBarNoSearch/>

      <View style={{backgroundColor: Colors.white, marginBottom: 15, borderBottomWidth: 1, borderBottomColor: '#E0E0E0'}}>
        <View style={{margin: 10}}>

          <View style={styles.headerBar}>
            <Text style={styles.title}>Lịch hẹn của tôi</Text>
            <TouchableOpacity style={styles.filterButton}>
              <Ionicons name="filter-outline" size={20} color="#111" />
            </TouchableOpacity>
          </View>

          {/* New Booking Button */}
          <TouchableOpacity style={styles.newBookingBtn}>
            <Ionicons name="add" size={16} color="white" />
            <Text style={styles.newBookingText}>Đặt lịch mới</Text>
          </TouchableOpacity>        
        </View>
      </View>


        {/* Tabs */}
        <View style={styles.tabRow}>
          <TabButton
            label="Sắp tới"
            count={mockData.filter(b => b.status === "upcoming").length}
            active={selectedTab === "upcoming"}
            color={Colors.primary}
            onPress={() => setSelectedTab("upcoming")}
          />
          <TabButton
            label="Hoàn thành"
            count={mockData.filter(b => b.status === "completed").length}
            active={selectedTab === "completed"}
            color="#16a34a"
            onPress={() => setSelectedTab("completed")}
          />
          <TabButton
            label="Đã hủy"
            count={mockData.filter(b => b.status === "cancelled").length}
            active={selectedTab === "cancelled"}
            color="#dc2626"
            onPress={() => setSelectedTab("cancelled")}
          />
        </View>

        {/* Booking List */}
        <FlatList
          data={filteredData}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <BookingCard booking={item} />}
          contentContainerStyle={{ paddingBottom: 20 }}
        />

    </SafeAreaView>
  );
}

function TabButton({
  label,
  count,
  active,
  color,
  onPress,
}: {
  label: string;
  count: number;
  active: boolean;
  color: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.tabButton,
        { backgroundColor: active ? color : "white", borderColor: color },
      ]}
      onPress={onPress}
    >
      <Text style={[styles.tabText, { color: active ? "white" : color }]}>
        {count}
      </Text>
      <Text style={[styles.tabText, { color: active ? "white" : "#111" }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function BookingCard({ booking }: { booking: Booking }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardLeft}>
        <View style={styles.avatar} />
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{booking.name}</Text>
          <Text style={styles.desc}>{booking.description}</Text>
          <View style={styles.row}>
            <Ionicons name="calendar-outline" size={14} color="#555" />
            <Text style={styles.infoText}>{booking.date}</Text>
            <Ionicons name="time-outline" size={14} color="#555" style={{ marginLeft: 8 }} />
            <Text style={styles.infoText}>{booking.time}</Text>
          </View>
        </View>
      </View>
      <View style={styles.badgeWrapper}>
        <Text style={[styles.badge, badgeColors[booking.status]]}>
          {booking.badge}
        </Text>
      </View>
      <ChevronRight size={20} style={{marginLeft: 10}}/>
    </View>
  );
}

const badgeColors: Record<BookingStatus, any> = {
  upcoming: { backgroundColor: "#e0e7ff", color: Colors.primary },
  completed: { backgroundColor: "#dcfce7", color: "#16a34a" },
  cancelled: { backgroundColor: "#fee2e2", color: "#dc2626" },
};

const styles = StyleSheet.create({
    safeAreaView: {
        flex: 1,
        backgroundColor: Colors.grayBackground
    },
    topBar: {
        flexDirection: "row", 
        alignItems: "center", 
        justifyContent: "space-between", 
        backgroundColor: Colors.white, 
        paddingHorizontal: 8, 
        paddingVertical: 8 
    },
    topBarLeft: {
        flexDirection: "row", 
        alignItems: "center", 
        marginLeft: 8 
    },
      safeArea: {
    flex: 1,
    backgroundColor: "#f3f4f6",
    padding: 12,
  },
  headerBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  title: { fontSize: 22, color: "#111" },
  filterButton: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#d1d5db",
  },
  newBookingBtn: {
    flexDirection: "row",
    backgroundColor: Colors.primary,
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  newBookingText: { color: "white", marginLeft: 4, fontFamily: "inter" },

  tabRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  tabButton: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    paddingVertical: 15,
    marginHorizontal: 10,
    alignItems: "center",
  },
  tabText: { fontSize: 15, fontFamily:"inter" },

  card: {
    flexDirection: "row",
    backgroundColor: "white",
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
    marginHorizontal: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    alignItems: "center",
  },
  cardLeft: { flexDirection: "row", flex: 1 },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 50,
    backgroundColor: "#d1d5db",
    marginRight: 10,
  },
  name: { fontSize: 15, fontFamily: "inter", fontWeight: "600", color: "#111" },
  desc: { fontSize: 13, fontFamily: "inter", color: "#555", marginBottom: 4 },
  row: { flexDirection: "row", alignItems: "center" },
  infoText: { fontSize: 12, color: "#333", marginLeft: 4 },

  badgeWrapper: { marginLeft: 8 },
  badge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    fontSize: 12,
    fontWeight: "600",
    overflow: "hidden",
  },
})
