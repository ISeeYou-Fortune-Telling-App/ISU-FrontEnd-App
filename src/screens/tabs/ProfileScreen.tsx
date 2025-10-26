import StatusDropdown from "@/src/components/StatusDropdown";
import Colors from "@/src/constants/colors";
import { getProfile, updateUserStatus } from "@/src/services/api";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { router, useFocusEffect } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { Bell, Calendar, Mail, Mars, Phone, Rat, Settings, Star, User, Venus, VenusAndMars } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ProfileScreen() {
  const [fullName, setFullName] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [dob, setDob] = useState<string>("");
  const [gender, setGender] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [zodiac, setZodiac] = useState<string>("");
  const [chineseZodiac, setChineseZodiac] = useState<string>("");
  const [cashCount, setCashCount] = useState<number>(0);
  const [bookingCount, setBookingCount] = useState<number>(0);
  const [reviewCount, setReviewCount] = useState<number>(0);
  const [status, setStatus] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [coverUrl, setCoverUrl] = useState<string>("");
  const tabBarHeight = useBottomTabBarHeight();
  const [role, setRole] = useState<string>("CUSTOMER");

  useEffect(() => {
    fetchData();
    (async () => {
      try {
        const storedRole = await SecureStore.getItemAsync("userRole");
        if (storedRole) setRole(storedRole);
      } catch (e) {
        console.warn("Unable to read userRole from SecureStore", e);
      }
    })();
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchData();
      return () => { };
    }, [])
  );

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await getProfile();
      const payload = res?.data?.data ?? res?.data ?? null;
      if (payload) {
        setFullName(payload.fullName);
        setDescription(payload.profileDescription);
        // birthDate example: "1988-11-25T00:00:00" -> format as dd/mm/yyyy
        if (payload.birthDate) {
          const d = new Date(payload.birthDate);
          const day = String(d.getDate()).padStart(2, "0");
          const month = String(d.getMonth() + 1).padStart(2, "0");
          const year = d.getFullYear();
          setDob(`${day}/${month}/${year}`);
        }
        setGender(payload.gender);
        setPhone(payload.phone);
        setEmail(payload.email);

        setZodiac(payload.profile?.zodiacSign ?? "");
        setChineseZodiac(payload.profile?.chineseZodiac ?? "");
        setAvatarUrl(payload.avatarUrl ?? "");
        setCoverUrl(payload.coverUrl ?? "");
        // persist user id for other screens
        if (payload.id) {
          await SecureStore.setItemAsync("userId", payload.id);
        }
        setStatus(payload.status ?? status);
        // If the API returns counts, set them. Keep defaults otherwise.
        if (typeof payload.cashCount === "number") setCashCount(payload.cashCount);
        if (typeof payload.bookingCount === "number") setBookingCount(payload.bookingCount);
        if (typeof payload.reviewCount === "number") setReviewCount(payload.reviewCount);
      }
    } catch (err) {
      console.error("Failed to load profile:", err);
      Alert.alert("Lỗi", "Không thể tải thông tin người dùng");
    } finally {
      setLoading(false);
    }
  }

  const handleStatusChange = async (newStatus: string) => {
    try {
      setStatus(newStatus);
      const id = await SecureStore.getItemAsync("userId");
      if (!id) {
        Alert.alert("Lỗi", "Không tìm thấy userId");
        return;
      }
      const res = await updateUserStatus(id, newStatus);
      Alert.alert("Thành công", "Cập nhật trạng thái thành công");
    } catch (err) {
      console.error(err);
      Alert.alert("Lỗi", "Không thể cập nhật trạng thái");
    }
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeAreaView}>

      <View style={styles.topBar}>
        <Bell size={32} color={Colors.black} onPress={() => router.push("/notification")} />
        <View style={styles.centerIconWrapper} pointerEvents="none">
          <View style={styles.appIconWrapper}>
            <Image source={require('@/assets/images/app_icon.png')} style={styles.appIconSmall} resizeMode="contain" />
          </View>
        </View>
        <Settings size={32} color={Colors.black} onPress={() => router.push("/profile-setting")} />
      </View>


      <View style={styles.coverWrapper}>
        {coverUrl ? (
          <Image source={{ uri: coverUrl }} style={styles.cover} />
        ) : (
          <View style={styles.coverPlaceholder} />
        )}
      </View>

      <View style={{ backgroundColor: Colors.white, paddingBottom: 16 }}>
        <View style={[styles.container, styles.headerContainer]}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={styles.avatar} />
          )}
          <Text style={styles.name}>{fullName}</Text>
          <StatusDropdown value={status} onChange={handleStatusChange} />
          <Text style={{ fontFamily: "inter", marginTop: 10 }}>{description}</Text>
        </View>
      </View>

      {loading && (
        <View style={styles.loadingOverlay} pointerEvents="none">
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}>

        {role === "CUSTOMER" && <ZodiacCard zodiac={zodiac} animal={chineseZodiac} />}

        <StatsRow bookingCount={bookingCount} reviewCount={reviewCount} cashCount={cashCount} />
        <PersonalInfoCard dob={dob} gender={gender} phone={phone} email={email} />

      </ScrollView>

    </SafeAreaView>
  );
}


export function ZodiacCard({ zodiac, animal }: { zodiac: string, animal: string }) {
  return (
    <View style={styles.ZodiacCard}>
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 5 }}>
        <Star size={24} color="#7C3AED" />
        <Text style={styles.zodiacText}>Cung hoàng đạo: {zodiac}</Text>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <Rat size={24} color="#693d00ff" />
        <Text style={styles.zodiacText}>Con giáp: {animal}</Text>
      </View>
    </View>
  );
}

type StatCardProps = {
  value: number;
  label: string;
  color: string;
};

type StatProps = {
  bookingCount: number;
  reviewCount: number;
  cashCount: number;
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

export function StatsRow({ bookingCount, reviewCount, cashCount }: StatProps) {
  return (
    <>
      <View style={styles.statRow}>
        <StatCard value={bookingCount} label="Cuộc hẹn" color={Colors.primary} />
        <StatCard value={reviewCount} label="Bình luận" color="#F59E0B" />
      </View>
      <StatCard value={cashCount} label="Tổng chi tiêu (VNĐ)" color="#00ce00ff" />
      <View style={{ height: 10 }} />
    </>
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
    paddingVertical: 8,
    height: 64,
  },
  centerIconWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    pointerEvents: 'none',
  },
  appIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  appIconSmall: {
    width: 40,
    height: 40,
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
    borderColor: Colors.grayBackground,
  },
  name: {
    marginVertical: 12,
    fontSize: 18,
    fontFamily: "inter",
    fontWeight: "600",
    color: "#000",
  },


  ZodiacCard: {
    backgroundColor: "white",
    borderRadius: 10,
    padding: 10,
    marginHorizontal: 10,
    borderWidth: 1,
    borderColor: Colors.primary,
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
    marginVertical: 10,
  },
  statCard: {
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 10,
    padding: 10,
    flex: 1,
    marginHorizontal: 10,
    borderWidth: 1,
    borderColor: Colors.primary,
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
    marginHorizontal: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.primary,
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
  coverWrapper: {
    height: 150,
    backgroundColor: Colors.grayBackground,
  },
  cover: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  coverPlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: Colors.grayBackground,
  },
  loadingOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.6)",
  },
  headerContainer: {
    marginTop: -64,
    alignItems: "center",
  },
})
