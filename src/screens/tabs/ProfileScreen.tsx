import StatusDropdown from "@/src/components/StatusDropdown";
import Colors from "@/src/constants/colors";
import { router } from "expo-router";
import { Bell, Calendar, Mail, Mars, Phone, Settings, Star, User, Venus, VenusAndMars } from "lucide-react-native";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ProfileScreen() {
  const [fullName, setFullName] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [dob, setDob] = useState<number>(Date.now);
  const [gender, setGender] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [zodiac, setZodiac] = useState<string>("");
  const [likeCount, setLikeCount] = useState<number>(0);
  const [bookingCount, setBookingCount] = useState<number>(0);
  const [reviewCount, setReviewCount] = useState<number>(0);
  const [status, setStatus] = useState<string>("ACTIVE");

  return (
    <SafeAreaView style={styles.safeAreaView}>

      <View style={styles.topBar}>
        <Bell size={32} color={Colors.black} onPress={() => router.push("/notification")} />
        <Settings size={32} color={Colors.black} onPress={() => router.push("/profile-setting")} />
      </View>


      <View style={{ height: 150 }} />

      <View style={{ flexShrink: 1, backgroundColor: Colors.white, paddingBottom: 20 }}>
        <View style={styles.container}>
          <View style={styles.avatar} />
          <Text style={styles.name}>Nguyễn Thị Mai</Text>
          <StatusDropdown value={status} onChange={setStatus} />
          <Text style={{ fontFamily: "inter", marginTop: 10 }}>Thầy Minh Tuệ với hơn 15 năm kinh nghiệm trong lĩnh vực tử vi, cung hoàng đạo. Đã tư vấn cho hơn 5000 khách hàng với độ chính xác cao. Chuyên về dự đoán vận mệnh, tình duyên và sự nghiệp.</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}>

        <View style={{ marginHorizontal: 10 }}>
          <ZodiacCard zodiac="Cự Giải" />
          <StatsRow likeCount={likeCount} bookingCount={bookingCount} reviewCount={reviewCount} />
          <PersonalInfoCard dob="22/07/1980" gender="Nữ" phone="0991234567" email="nguyentmai@gmail.com" />
        </View>

      </ScrollView>

    </SafeAreaView>
  );
}


export function ZodiacCard({ zodiac }: { zodiac: string }) {
  return (
    <View style={styles.ZodiacCard}>
      <Star size={24} color="#7C3AED" />
      <Text style={styles.zodiacText}>Cung hoàng đạo: {zodiac}</Text>
    </View>
  );
}

type StatCardProps = {
  value: number;
  label: string;
  color: string;
};

type StatProps = {
  likeCount: number;
  bookingCount: number;
  reviewCount: number;
};

type InfoProps = {
  dob: string;
  gender: string;
  phone: string;
  email: string
};

function StatCard({ value, label, color }: StatCardProps) {
  return (
    <View style={styles.statCard}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export function StatsRow({ likeCount, bookingCount, reviewCount }: StatProps) {
  return (
    <View style={styles.statRow}>
      <StatCard value={likeCount} label="Lượt thích" color="#3B82F6" />
      <StatCard value={bookingCount} label="Cuộc hẹn" color="#22C55E" />
      <StatCard value={reviewCount} label="Bình luận" color="#F59E0B" />
    </View>
  );
}

export function PersonalInfoCard({ dob, gender, phone, email }: InfoProps) {
  return (
    <View style={styles.infoContainer}>
      <View style={styles.header}>
        <User size={24} color="#0284C7" />
        <Text style={styles.headerText}>Thông tin cá nhân</Text>
      </View>

      <View style={styles.infoRow}>
        <Calendar size={20} color={Colors.gray} />
        <Text style={styles.infoText}>{dob}</Text>
      </View>

      <View style={styles.infoRow}>
        {gender.toLowerCase() === "nữ" ? (<Venus size={20} color={Colors.gray} />) : gender.toLowerCase() === "nam" ? (<Mars size={20} color={Colors.gray} />) : (<VenusAndMars size={20} color={Colors.gray} />)}
        <Text style={styles.infoText}>{gender}</Text>
      </View>

      <View style={styles.infoRow}>
        <Phone size={20} color={Colors.gray} />
        <Text style={styles.infoText}>{phone}</Text>
      </View>

      <View style={styles.infoRow}>
        <Mail size={20} color={Colors.gray} />
        <Text style={styles.infoText}>{email}</Text>
      </View>
    </View>
  );
}

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
  container: {
    alignItems: "center",
    marginTop: -64,
    marginHorizontal: 16
  },
  avatar: {
    width: 128,
    height: 128,
    borderRadius: 9999,
    backgroundColor: "#d1d5db",
    borderWidth: 4,
    borderColor: "#fff",
  },
  name: {
    marginVertical: 12,
    fontSize: 18,
    fontFamily: "inter",
    fontWeight: "600",
    color: "#000",
  },


  ZodiacCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: "#d1d5db",
    marginVertical: 10,
  },
  zodiacText: {
    marginLeft: 8,
    fontSize: 15,
    fontFamily: "inter",
    color: "#111",
  },


  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  statCard: {
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 10,
    padding: 10,
    flex: 1,
    marginHorizontal: 5,
    borderWidth: 1,
    borderColor: "#d1d5db",
  },
  statValue: {
    fontSize: 20,
    fontWeight: "bold",
  },
  statLabel: {
    fontSize: 13,
    color: "#555",
    marginTop: 4,
  },


  infoContainer: {
    backgroundColor: "white",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#d1d5db",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  headerText: {
    marginLeft: 6,
    fontSize: 16,
    fontWeight: "bold",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 4,
  },
  infoText: {
    marginLeft: 6,
    fontSize: 14,
    fontFamily: "inter",
    color: "#111",
  },
  icon: {
    fontSize: 16,
    color: "#555",
  },
})
