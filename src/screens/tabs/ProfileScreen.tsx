import Colors from "@/src/constants/colors";
import { router } from "expo-router";
import { Bell, Calendar, Mail, Phone, Settings, Star, User } from "lucide-react-native";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ProfileScreen() {
  const [fullName, setFullName] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [dob, setDob] = useState<number>(Date.now);
  const [gender, setGender] = useState<string>("");
  const [phone, setPhone] = useState<number>(0);
  const [email, setEmail] = useState<number>(0);
  const [zodiac, setZodiac] = useState<string>("");
  const [likeCount, setLikeCount] = useState<number>(0);
  const [bookingCount, setBookingCount] = useState<number>(0);
  const [reviewCount, setReviewCount] = useState<number>(0);
  return (
    <SafeAreaView style={styles.safeAreaView}>

      <View style={styles.topBar}>
        <Bell size={32} color={Colors.black} onPress={() => router.push("/notification")} />
        <Settings size={32} color={Colors.black} />
      </View>

      <View style={{ height: 150 }} />

      <View style={{ flexShrink: 1, backgroundColor: Colors.background,paddingBottom: 20 }}>
        <View style={styles.container}>
          <View style={styles.avatar} />
          <Text style={styles.name}>Nguyễn Thị Mai</Text>
          <Text style={{fontFamily: "InterRegular", marginTop: 10}}>Thầy Minh Tuệ với hơn 15 năm kinh nghiệm trong lĩnh vực tử vi, cung hoàng đạo. Đã tư vấn cho hơn 5000 khách hàng với độ chính xác cao. Chuyên về dự đoán vận mệnh, tình duyên và sự nghiệp.</Text>
        </View>
      </View>

      <View style={{marginHorizontal: 10}}>
        <ZodiacCard zodiac="Cự Giải"/>
        <StatsRow likeCount={likeCount} bookingCount={bookingCount} reviewCount={reviewCount}/> 
        <PersonalInfoCard/>
      </View>

      

      

    </SafeAreaView>
  );
}


export function ZodiacCard({ zodiac }: { zodiac: string }) {
  return (
    <View style={styles.ZodiacCard}>
      <Star size={20} color="#7C3AED" /> 
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

function StatCard({ value, label, color }: StatCardProps) {
  return (
    <View style={styles.statCard}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export function StatsRow({likeCount, bookingCount, reviewCount}: StatProps ) {
  return (
    <View style={styles.statRow}>
      <StatCard value={likeCount} label="Lượt thích" color="#3B82F6" />
      <StatCard value={bookingCount} label="Cuộc hẹn" color="#22C55E" />
      <StatCard value={reviewCount} label="Bình luận" color="#F59E0B" />
    </View>
  );
}

export function PersonalInfoCard() {
  return (
    <View style={styles.infoContainer}>
      <View style={styles.header}>
        <User size={18} color="#0284C7" />
        <Text style={styles.headerText}>Thông tin cá nhân</Text>
      </View>

      <View style={styles.infoRow}>
        <Calendar size={16} color="#555" />
        <Text style={styles.infoText}>22/07/1980</Text>
      </View>

      <View style={styles.infoRow}>
        <Text style={styles.icon}>♀</Text>
        <Text style={styles.infoText}>Nữ</Text>
      </View>

      <View style={styles.infoRow}>
        <Phone size={16} color="#555" />
        <Text style={styles.infoText}>0991234567</Text>
      </View>

      <View style={styles.infoRow}>
        <Mail size={16} color="#555" />
        <Text style={styles.infoText}>nguyentmai@gmail.com</Text>
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
    marginTop: 12,
    fontSize: 18,
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
    fontSize: 15,
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
    color: "#111",
  },
  icon: {
    fontSize: 16,
    color: "#555",
  },
})
