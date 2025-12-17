import Colors from "@/src/constants/colors";
import { getMyCustomerPotential } from "@/src/services/api";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { ArrowLeft, ChevronLeft, ChevronRight, Star } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Text as RNText,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Button, Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

const MONTHS = [
  "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
  "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"
];

export default function CustomerPotentialScreen() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const yearOptions = useMemo(() => {
    const list: number[] = [];
    for (let y = now.getFullYear() - 5; y <= now.getFullYear() + 1; y++) list.push(y);
    return list;
  }, []);

  const isFutureMonth = (m: number, y: number) => {
    if (y > now.getFullYear()) return true;
    if (y === now.getFullYear() && m > now.getMonth() + 1) return true;
    return false;
  };

  const isFutureYear = (y: number) => {
    return y > now.getFullYear();
  };

  useEffect(() => {
    fetchData(month, year);
  }, [month, year]);

  const fetchData = async (m: number, y: number) => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        month: m,
        year: y
      }
      const res = await getMyCustomerPotential(params);
      const payload = res?.data?.data ?? res?.data ?? res ?? null;
      setData(payload);
    } catch (err) {
      setError("Không thể tải dữ liệu");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const prevMonth = () => {
    const d = new Date(year, month - 2, 1);
    setMonth(d.getMonth() + 1);
    setYear(d.getFullYear());
  };

  const nextMonth = () => {
    if (isFutureMonth(month + 1, year)) return;
    const d = new Date(year, month, 1);
    setMonth(d.getMonth() + 1);
    setYear(d.getFullYear());
  };

  const gotoThisMonth = () => {
    const d = new Date();
    setMonth(d.getMonth() + 1);
    setYear(d.getFullYear());
  };

  const formattedVND = (v: number) => {
    return Intl.NumberFormat("vi-VN").format(v) + " VNĐ";
  };

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <ArrowLeft size={28} onPress={() => router.back()} />
        <View style={styles.titleContainer}>
          <Text variant="titleLarge" style={styles.title}>Tiềm năng của tôi</Text>
        </View>
        <View style={{ width: 28 }} />
      </View>

      {/* Month Switch */}
      <View style={styles.monthRow}>
        <TouchableOpacity onPress={prevMonth} style={styles.monthBtn}>
          <ChevronLeft size={20} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.monthLabel} onPress={() => setModalVisible(true)}>
          <Text style={{ fontWeight: "700" }}>{MONTHS[month - 1]} / {year}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={nextMonth}
          disabled={isFutureMonth(month + 1, year)}
          style={[
            styles.monthBtn,
            isFutureMonth(month + 1, year) && { opacity: 0.3 }
          ]}
        >
          <ChevronRight size={20} />
        </TouchableOpacity>
      </View>

      {/* Content */}
      {loading ?
        <SafeAreaView style={styles.container}>
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        </SafeAreaView>
        :
        <ScrollView style={{ flex: 1, paddingHorizontal: 12 }}>
          {error ? (
            <View style={styles.center}>
              <Text>{error}</Text>
              <Button mode="contained" style={{ marginTop: 10 }} onPress={() => fetchData(month, year)}>
                Thử lại
              </Button>
            </View>
          ) : (
            <LinearGradient colors={["#F0F8FF", "#E7FFF3"]} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.iconCircle}>
                  <Star size={22} color={Colors.primary} />
                </View>
                <View style={{ marginLeft: 12 }}>
                  <RNText style={styles.cardTitle}>Điểm tiềm năng</RNText>
                  <RNText style={styles.cardSub}>Xếp hạng & điểm tháng</RNText>
                </View>
              </View>

              <View style={styles.cardBody}>
                <View>
                  <RNText style={styles.bigNumber}>{data?.potentialPoint ?? "-"}</RNText>
                  <RNText style={styles.smallText}>Tổng điểm ({data?.potentialTier ?? "—"})</RNText>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <RNText style={styles.bigNumber}>#{data?.ranking ?? "-"}</RNText>
                  <RNText style={styles.smallText}>Xếp hạng</RNText>
                </View>
              </View>

              <View style={styles.statsRow}>
                <View style={styles.statBox}>
                  <RNText style={styles.statNumber}>{data?.totalBookingRequests ?? 0}</RNText>
                  <RNText style={styles.statLabel}>Lịch yêu cầu</RNText>
                </View>
                <View style={styles.statBox}>
                  <RNText style={styles.statNumber}>{data?.cancelledByCustomer ?? 0}</RNText>
                  <RNText style={styles.statLabel}>Bị huỷ</RNText>
                </View>
                <View style={styles.statBox}>
                  <RNText style={styles.statNumber}>{formattedVND(data?.totalSpending ?? 0)}</RNText>
                  <RNText style={styles.statLabel}>Tổng chi</RNText>
                </View>
              </View>

              {month != (now.getMonth() + 1) && <View style={styles.cardFooterRow}>
                <TouchableOpacity style={styles.primaryBtn} onPress={gotoThisMonth}>
                  <Text style={{ color: Colors.white }}>Xem tháng hiện tại</Text>
                </TouchableOpacity>
              </View>}
            </LinearGradient>
          )}
          <View style={{ height: 80 }} />
        </ScrollView>
      }


      {/* Month/Year modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={{ fontWeight: "700", marginBottom: 8 }}>Chọn tháng & năm</Text>

            <View style={{ flexDirection: "row", gap: 8 }}>
              {/* Month column */}
              <ScrollView style={styles.pickerColumn}>
                {MONTHS.map((label, idx) => {
                  const mNum = idx + 1;
                  const disabled = isFutureMonth(mNum, year);
                  return (
                    <TouchableOpacity
                      key={label}
                      onPress={() => !disabled && setMonth(mNum)}
                      disabled={disabled}
                      style={[
                        styles.pickerItem,
                        month === mNum && styles.pickerItemSelected,
                        disabled && { opacity: 0.3 }
                      ]}
                    >
                      <Text style={month === mNum ? { color: "#fff", fontWeight: "700" } : undefined}>
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Year column */}
              <ScrollView style={styles.pickerColumn}>
                {yearOptions.map((y) => {
                  const disabled = isFutureYear(y);
                  return (
                    <TouchableOpacity
                      key={String(y)}
                      onPress={() => !disabled && setYear(y)}
                      disabled={disabled}
                      style={[
                        styles.pickerItem,
                        year === y && styles.pickerItemSelected,
                        disabled && { opacity: 0.3 }
                      ]}
                    >
                      <Text style={year === y ? { color: "#fff", fontWeight: "700" } : undefined}>
                        {y}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Footer buttons */}
            <View style={{ flexDirection: "row", justifyContent: "flex-end", marginTop: 12 }}>
              <Button onPress={() => setModalVisible(false)}>Huỷ</Button>

              <Button
                mode="contained"
                disabled={isFutureMonth(month, year)}
                style={{ marginLeft: 8 }}
                onPress={() => {
                  setModalVisible(false);
                  fetchData(month, year);
                }}
              >
                Áp dụng
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.grayBackground },

  loadingOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.7)"
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  titleContainer: { flex: 1, alignItems: "center" },
  title: { fontWeight: "700" },
  subtitle: { color: "#666", fontSize: 12 },

  monthRow: {
    flexDirection: "row",
    justifyContent: "center",
    paddingVertical: 10,
    alignItems: "center",
    gap: 12,
  },
  monthBtn: { padding: 8 },
  monthLabel: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderRadius: 8,
    borderColor: "#eee",
  },

  center: { justifyContent: "center", alignItems: "center", padding: 20 },

  card: {
    borderRadius: 14,
    padding: 14,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  iconCircle: {
    width: 48, height: 48,
    backgroundColor: "#fff",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  cardTitle: { fontSize: 18, fontWeight: "700" },
  cardSub: { fontSize: 12, color: "#555", fontFamily: "inter" },

  cardBody: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8 },
  bigNumber: { fontSize: 28, fontWeight: "800" },
  smallText: { color: "#666", fontFamily: "inter" },
  rank: { fontWeight: "800", fontSize: 18 },

  statsRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 12 },
  statBox: { flex: 1, alignItems: "center" },
  statNumber: { fontWeight: "700", fontSize: 18 },
  statLabel: { color: "#555", fontSize: 12, marginTop: 4, fontFamily: "inter" },

  cardFooterRow: { flexDirection: "row", justifyContent: "center", marginTop: 12 },
  ghostBtn: {
    backgroundColor: "#fff",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  primaryBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
  },
  modal: { width: "90%", backgroundColor: "#fff", borderRadius: 12, padding: 16 },

  pickerColumn: { width: "50%", maxHeight: 260 },
  pickerItem: { padding: 14 },
  pickerItemSelected: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
  },
});
