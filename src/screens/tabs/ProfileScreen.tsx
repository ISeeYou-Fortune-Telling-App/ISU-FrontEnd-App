import StatusDropdown from "@/src/components/StatusDropdown";
import Colors from "@/src/constants/colors";
import { getMyPackages, getProfile, updateUserStatus } from "@/src/services/api";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { Bell, Calendar, ChevronRight, Mail, Mars, Package, Phone, Rat, Settings, Star, User, Venus, VenusAndMars } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
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
  const [certCount, setCertCount] = useState<number>(0);
  const [packCount, setPackCount] = useState<number>(0);
  const [packageApprovedCount, setPackageApprovedCount] = useState<number>(0);
  const [packagePendingCount, setPackagePendingCount] = useState<number>(0);
  const [packageRejectedCount, setPackageRejectedCount] = useState<number>(0);
  const [status, setStatus] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [coverUrl, setCoverUrl] = useState<string>("");
  const tabBarHeight = useBottomTabBarHeight();
  const [role, setRole] = useState<string>("CUSTOMER");
  const [avatarError, setAvatarError] = useState(false);
  const [coverError, setCoverError] = useState(false);

  useEffect(() => {
    fetchData();
    fetchPackageStats();
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
      fetchPackageStats();
      return () => { };
    }, [])
  );
  const fetchPackageStats = async () => {
    try {
      const res = await getMyPackages();
      const packages = res?.data?.data ?? [];
      let approved = 0, pending = 0, rejected = 0;
      for (const pkg of packages) {
        if (pkg.status === "AVAILABLE") approved++;
        else if (pkg.status === "HIDDEN") pending++;
        else if (pkg.status === "REJECTED") rejected++;
      }
      setPackageApprovedCount(approved);
      setPackagePendingCount(pending);
      setPackageRejectedCount(rejected);
    } catch (err) {
      console.error("Failed to load package stats:", err);
    }
  };

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
        // service package counts (some API shapes may provide packCount or nested stats)
        if (typeof payload.packCount === "number") setPackCount(payload.packCount);
        if (typeof payload.certCount === "number") setCertCount(payload.certCount);
        // optional nested stats object
        const spStats = payload.servicePackageStats ?? payload.packageStats ?? null;
        if (spStats) {
          if (typeof spStats.total === "number") setPackCount(spStats.total);
          if (typeof spStats.approved === "number") setPackageApprovedCount(spStats.approved);
          if (typeof spStats.pending === "number") setPackagePendingCount(spStats.pending);
        }
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
      const id = await SecureStore.getItemAsync("userId");
      if (!id) {
        Alert.alert("Lỗi", "Không tìm thấy userId");
        return;
      }
      const res = await updateUserStatus(id, newStatus);
      setStatus(newStatus);
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
        <Image
          source={
            coverError || !coverUrl
              ? require("@/assets/images/placeholder.png")
              : { uri: coverUrl }
          }
          style={styles.cover}
          onError={(e) => {
            console.log('Cover image failed to load:', e.nativeEvent);
            setCoverError(true);
          }}
        />
      </View>

      <View style={{ backgroundColor: Colors.white, paddingBottom: 16 }}>
        <View style={[styles.container, styles.headerContainer]}>
          <Image
            source={
              avatarError || !avatarUrl
                ? require('@/assets/images/user-placeholder.png')
                : { uri: avatarUrl }
            }
            style={styles.avatar}
            onError={(e) => {
              console.log('Avatar image failed to load:', e.nativeEvent);
              setAvatarError(true);
            }}
          />
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
        {role === "CUSTOMER" && <StatsRow bookingCount={bookingCount} reviewCount={reviewCount} cashCount={cashCount} />}

        {role === "SEER" && <SeerStatsRow packCount={packCount} bookingCount={bookingCount} certCount={certCount} />}
        {role === "SEER" && (
          <MyServicePackagesCard
            approved={packageApprovedCount}
            pending={packagePendingCount}
            rejected={packageRejectedCount}
          />
        )}

        <PersonalInfoCard dob={dob} gender={gender} phone={phone} email={email} />
      </ScrollView>

    </SafeAreaView>
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

type SeerStatProps = {
  bookingCount: number;
  packCount: number;
  certCount: number;
};

type InfoProps = {
  dob: string;
  gender: string;
  phone: string;
  email: string
};

function ZodiacCard({ zodiac, animal }: { zodiac: string, animal: string }) {
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

function StatCard({ value, label, color }: StatCardProps) {
  return (
    <View style={[styles.statCard, styles.cardShadow]}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function StatsRow({ bookingCount, reviewCount, cashCount }: StatProps) {
  return (
    <>
      <View style={styles.statRow}>
        <StatCard value={bookingCount} label="Cuộc hẹn" color={Colors.primary} />
        <StatCard value={reviewCount} label="Bình luận" color={Colors.yellow} />
      </View>
      <StatCard value={cashCount} label="Tổng chi tiêu (VNĐ)" color={Colors.green} />
      <View style={{ height: 10 }} />
    </>
  );
}

function SeerStatsRow({ packCount, bookingCount, certCount }: SeerStatProps) {
  return (
    <>
      <View style={styles.statRow}>
        <StatCard value={packCount} label="Gói dịch vụ" color={Colors.primary} />
        <StatCard value={bookingCount} label="Buổi tư vấn" color={Colors.green} />
        <StatCard value={certCount} label="Chứng chỉ" color={Colors.pink} />
      </View>
      <View style={{ height: 10 }} />
    </>
  );
}

function MyServicePackagesCard({ approved, pending, rejected }: { approved: number; pending: number; rejected: number }) {
  return (
    <LinearGradient
      colors={[Colors.primary, Colors.purple]}
      start={[0, 0]}
      end={[.4, .9]}
      style={[styles.serviceCard, styles.cardShadow]}
    >
      <View style={styles.serviceCardHeader}>
        <View style={styles.serviceIconWrapper}>
          <Package size={24} color={Colors.white} />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.serviceTitle}>Gói dịch vụ của tôi</Text>
          <Text style={styles.serviceSubtitle}>Quản lý các gói dịch vụ bạn đã tạo</Text>
        </View>
      </View>
      <View style={styles.serviceInner}>
        <View style={styles.serviceStatsRow}>
          <View style={styles.serviceStatBox}>
            <Text style={[styles.serviceStatValue, { color: Colors.green }]}>{approved}</Text>
            <Text style={styles.serviceStatLabel}>Đã duyệt</Text>
          </View>
          <View style={styles.serviceStatBox}>
            <Text style={[styles.serviceStatValue, { color: Colors.yellow }]}>{pending}</Text>
            <Text style={styles.serviceStatLabel}>Chờ duyệt</Text>
          </View>
          <View style={styles.serviceStatBox}>
            <Text style={[styles.serviceStatValue, { color: Colors.pink }]}>{rejected}</Text>
            <Text style={styles.serviceStatLabel}>Bị từ chối</Text>
          </View>
        </View>
      </View>
      <TouchableOpacity style={styles.serviceFooter} onPress={() => router.push('/my-packages')}>
        <Text style={styles.serviceFooterText}>Nhấn để xem chi tiết</Text>
        <ChevronRight size={20} color={Colors.white} />
      </TouchableOpacity>
    </LinearGradient>
  );
}

function PersonalInfoCard({ dob, gender, phone, email }: InfoProps) {
  return (
    <View style={[styles.infoContainer, styles.cardShadow]}>
      <View style={styles.header}>
        <User size={24} color={Colors.primary} />
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
    color: Colors.black,
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
    // borderWidth: 1,
    // borderColor: Colors.primary,
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
    borderRadius: 15,
    marginHorizontal: 10,
    marginBottom: 10,
    padding: 16,
    // borderWidth: 1,
    // borderColor: Colors.primary,
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
  cardShadow: {
    shadowColor: Colors.black,
    shadowOffset: { width: 10, height: 6 },
    shadowOpacity: .12,
    shadowRadius: 16,
    elevation: 6,
  },
  serviceCard: {
    borderRadius: 18,
    marginHorizontal: 10,
    padding: 14,
    marginBottom: 15,
  },
  serviceCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  serviceIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  serviceTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  serviceSubtitle: {
    color: 'rgba(255,255,255,0.9)',
    marginTop: 4,
    fontSize: 13,
  },
  serviceInner: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 10,
  },
  serviceStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  serviceStatBox: {
    flex: 1,
    alignItems: 'center',
  },
  serviceStatValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
  serviceStatLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 4,
  },
  serviceFooter: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'center'
  },
  serviceFooterText: {
    color: 'rgba(255,255,255,0.95)',
    fontSize: 14,
    fontWeight: '600',
  },
})
