import Colors from "@/src/constants/colors";
import { getMySeerPerformance } from "@/src/services/api";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { ArrowLeft, ChevronLeft, ChevronRight, TrendingUp } from "lucide-react-native";
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

export default function SeerPerformanceScreen() {
  const now = new Date();

  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const yearOptions = useMemo(() => {
    const arr: number[] = [];
    for (let y = now.getFullYear() - 5; y <= now.getFullYear() + 1; y++) arr.push(y);
    return arr;
  }, []);

  const isFutureMonth = (m: number, y: number) => {
    if (y > now.getFullYear()) return true;
    if (y === now.getFullYear() && m > now.getMonth() + 1) return true;
    return false;
  };

  const isFutureYear = (y: number) => y > now.getFullYear();

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
      const res = await getMySeerPerformance(params);
      const payload = res?.data?.data ?? res?.data ?? res ?? null;
      setData(payload);
    } catch {
      setError("Không thể tải dữ liệu");
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

  const formattedVND = (v: number) =>
    Intl.NumberFormat("vi-VN").format(v) + " VNĐ";

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.container}>

      <View style={styles.header}>
        <ArrowLeft size={28} onPress={() => router.back()} />
        <View style={styles.titleContainer}>
          <Text variant="titleLarge" style={styles.title}>Hiệu suất của tôi</Text>
          {/* <Text style={styles.subtitle}>{MONTHS[month - 1]} / {year}</Text> */}
        </View>
        <View style={{ width: 28 }} />
      </View>

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
              <Button mode="contained" onPress={() => fetchData(month, year)} style={{ marginTop: 8 }}>
                Thử lại
              </Button>
            </View>
          ) : (
            <>
              <LinearGradient colors={[Colors.primary, Colors.purple]} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.iconCircle}>
                    <TrendingUp size={22} color="#fff" />
                  </View>
                  <RNText style={[styles.cardTitle, { color: "#fff", marginLeft: 12 }]}>Thông số & xếp hạng</RNText>
                </View>

                <View style={styles.cardBody}>
                  <View>
                    <RNText style={[styles.bigNumber, { color: "#fff" }]}>{data?.performancePoint ?? "-"}</RNText>
                    <RNText style={[styles.smallText, { color: "#fff" }]}>{data?.performanceTier ?? "—"}</RNText>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <RNText style={[styles.rank, { color: "#fff" }]}>#{data?.ranking ?? "-"}</RNText>
                    <RNText style={[styles.smallText, { color: "#fff" }]}>Xếp hạng</RNText>
                  </View>
                </View>

                <View style={styles.statsRow}>
                  <View style={styles.statBox}>
                    <RNText style={[styles.statNumber, { color: "#fff" }]}>{data?.totalPackages ?? 0}</RNText>
                    <RNText style={[styles.statLabel, { color: "#fff" }]}>Gói</RNText>
                  </View>
                  <View style={styles.statBox}>
                    <RNText style={[styles.statNumber, { color: "#fff" }]}>{data?.totalBookings ?? 0}</RNText>
                    <RNText style={[styles.statLabel, { color: "#fff" }]}>Tổng cuộc hẹn</RNText>
                  </View>
                  <View style={styles.statBox}>
                    <RNText style={[styles.statNumber, { color: "#fff" }]}>{data?.completedBookings ?? 0}</RNText>
                    <RNText style={[styles.statLabel, { color: "#fff" }]}>Hoàn thành</RNText>
                  </View>
                </View>

                <View style={styles.statsRow}>
                  <View style={styles.statBox}>
                    <RNText style={[styles.statNumber, { color: Colors.yellow }]}>{data?.totalRates ?? 0}</RNText>
                    <RNText style={[styles.statLabel, { color: "#fff" }]}>Lượt đánh giá</RNText>
                  </View>
                  <View style={styles.statBox}>
                    <RNText style={[styles.statNumber, { color: Colors.yellow }]}>
                      {(typeof data?.avgRating === "number" ? data.avgRating.toFixed(2) : data?.avgRating) ?? "-"}
                    </RNText>
                    <RNText style={[styles.statLabel, { color: "#fff" }]}>Đánh giá TB</RNText>
                  </View>
                  <View style={styles.statBox}>
                    <RNText style={[styles.statNumber, { color: Colors.green }]}>{formattedVND(data?.totalRevenue ?? 0)}</RNText>
                    <RNText style={[styles.statLabel, { color: "#fff" }]}>Doanh thu</RNText>
                  </View>
                </View>

                {month != (now.getMonth() + 1) && <View style={styles.cardFooterRow}>
                  <TouchableOpacity style={styles.primaryBtn} onPress={gotoThisMonth}>
                    <Text style={{ color: Colors.white }}>Xem tháng hiện tại</Text>
                  </TouchableOpacity>
                </View>}
              </LinearGradient>

              <View style={{ height: 20 }} />

              {/* Extra detail card */}
              <LinearGradient colors={["#fff", "#F7F7F7"]} style={styles.detailCard}>
                <RNText style={styles.cardTitle}>Chi tiết</RNText>
                <View style={{ flexDirection: "row" }}>
                  <RNText style={styles.cardText}>Thưởng: </RNText>
                  <RNText style={[styles.cardText, { color: Colors.lightGreen }]}>{formattedVND(data?.bonus ?? 0)}</RNText>
                </View>
                <RNText style={styles.cardText}>Số lịch bị huỷ bởi bạn: {data?.cancelledBySeer ?? 0}</RNText>
              </LinearGradient>
            </>
          )}

          <View style={{ height: 80 }} />
        </ScrollView>
      }

      {/* Picker modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={{ fontWeight: "700", marginBottom: 10 }}>Chọn tháng & năm</Text>

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
                        mNum === month && styles.pickerItemSelected,
                        disabled && { opacity: 0.3 }
                      ]}
                    >
                      <Text style={mNum === month ? { color: "#fff", fontWeight: "700" } : undefined}>
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
    borderBottomColor: "#eee",
    borderBottomWidth: 1,
  },
  titleContainer: { flex: 1, alignItems: "center" },
  title: { fontWeight: "700" },
  subtitle: { color: "#444", fontSize: 12 },

  monthRow: {
    flexDirection: "row",
    justifyContent: "center",
    paddingVertical: 10,
    alignItems: "center",
    gap: 10,
  },
  monthBtn: { padding: 8 },
  monthLabel: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 8
  },

  center: { justifyContent: "center", alignItems: "center", padding: 20 },
  card: { borderRadius: 14, padding: 14 },
  cardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  cardTitle: { fontSize: 18, fontWeight: "700" },
  cardSub: { fontSize: 12 },

  cardBody: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8 },
  bigNumber: { fontSize: 28, fontWeight: "800" },
  smallText: { fontSize: 12 },
  rank: { fontWeight: "800", fontSize: 18 },

  statsRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 12 },
  statBox: { flex: 1, alignItems: "center" },
  statNumber: { fontWeight: "700" },
  statLabel: { fontSize: 12, marginTop: 4 },

  cardFooterRow: { flexDirection: "row", justifyContent: "center", marginTop: 12 },
  ghostBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  primaryBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: Colors.primary,
  },

  detailCard: {
    padding: 14,
    borderRadius: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
  },
  modal: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: "#fff",
    width: "90%",
  },

  pickerColumn: { width: "50%", maxHeight: 260 },
  pickerItem: { padding: 14 },
  pickerItemSelected: { backgroundColor: Colors.primary, borderRadius: 8 },
  cardText: { marginTop: 4, fontFamily: "inter" }
});
