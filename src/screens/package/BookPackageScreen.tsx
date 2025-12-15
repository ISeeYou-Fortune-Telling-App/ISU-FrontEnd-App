import Colors from "@/src/constants/colors";
import { theme } from "@/src/constants/theme";
import { createBooking, getServicePackageDetail } from "@/src/services/api.js";
import { MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect } from '@react-navigation/native';
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated, Image, KeyboardAvoidingView, Linking, Modal, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import Markdown from "react-native-markdown-display";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { Button, PaperProvider, Snackbar, Text, TextInput } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

export default function BookPackageScreen() {
  const { id, rating } = useLocalSearchParams();
  const [pkg, setPkg] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const { content } = useLocalSearchParams<{ content: string }>();
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [scheduledDate, setScheduledDate] = useState<string>("");
  const [scheduledDateISO, setScheduledDateISO] = useState<string>("");
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [scheduledTime, setScheduledTime] = useState<string>("");
  const [selectedDateObj, setSelectedDateObj] = useState<Date | null>(null);
  const [selectedTimeObj, setSelectedTimeObj] = useState<Date | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string>("PayPal");
  const [paymentDropdownOpen, setPaymentDropdownOpen] = useState<boolean>(false);
  const [paymentSelectorLayout, setPaymentSelectorLayout] = useState({ y: 0, height: 0 });
  const [note, setNote] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [snackbarVisible, setSnackbarVisible] = useState<boolean>(false);
  const [snackbarMsg, setSnackbarMsg] = useState<string>("");
  const [avatarError, setAvatarError] = useState(false);
  const [success, setSuccess] = useState(false);
  const [paymentInitiated, setPaymentInitiated] = useState(false);
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const [availableTimeSlots, setAvailableTimeSlots] = useState<timeSlot[]>([]);
  const [showBookingForm, setShowBookingForm] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await getServicePackageDetail(id);
      setPkg(res.data?.data);
      setAvailableTimeSlots(res.data?.data.availableTimeSlots);
    }
    catch (err) {
      setError(true);
      console.error(`Error fetching details for package ${id}:`, err);
    }
    finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchData();
  }, []);

  useFocusEffect(
    useCallback(() => {
      // If we just initiated payment and come back to this screen, 
      // it means payment was cancelled, so go to booking tab
      if (paymentInitiated && !success) {
        setPaymentInitiated(false);
        router.replace("/(tabs)/booking");
      }
    }, [paymentInitiated, success])
  );

  const pad = (n: number) => n.toString().padStart(2, "0");

  const formatDate = (date: Date) => {
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const formatTime = (date: Date) => {
    const hh = date.getHours().toString().padStart(2, "0");
    const mm = date.getMinutes().toString().padStart(2, "0");
    return `${hh}:${mm}`;
  };

  const updateScheduledDateISO = useCallback((date: Date, time: Date | null) => {
    if (!time) return;

    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();
    const hours = time.getHours();
    const minutes = time.getMinutes();

    const localIso = `${year}-${pad(month + 1)}-${pad(day)}T${pad(hours)}:${pad(minutes)}:00`;
    setScheduledDateISO(localIso);
  }, []);

  const handleConfirmDate = (date: Date) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const selectedDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    if (selectedDay < today) {
      setSnackbarMsg("Không thể chọn ngày trong quá khứ");
      setSnackbarVisible(true);
      setShowDatePicker(false);
      return;
    }

    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();

    setSelectedDateObj(date);
    setScheduledDate(`${pad(day)}/${pad(month + 1)}/${year}`);

    if (selectedTimeObj) {
      updateScheduledDateISO(date, selectedTimeObj);
    }

    setShowDatePicker(false);
  };

  const handleConfirmTime = (time: Date) => {
    if (!selectedDateObj) {
      setSnackbarMsg("Vui lòng chọn ngày trước");
      setSnackbarVisible(true);
      setShowTimePicker(false);
      return;
    }

    const now = new Date();
    const bookingDate = new Date(
      selectedDateObj.getFullYear(),
      selectedDateObj.getMonth(),
      selectedDateObj.getDate(),
      time.getHours(),
      time.getMinutes()
    );

    if (bookingDate <= now) {
      setSnackbarMsg("Giờ hẹn phải trong tương lai");
      setSnackbarVisible(true);
      setShowTimePicker(false);
      return;
    }

    const year = selectedDateObj.getFullYear();
    const month = selectedDateObj.getMonth();
    const day = selectedDateObj.getDate();
    const hours = time.getHours();
    const minutes = time.getMinutes();

    setSelectedTimeObj(time);
    setScheduledTime(`${pad(hours)}:${pad(minutes)}`);

    const localIso = `${year}-${pad(month + 1)}-${pad(day)}T${pad(hours)}:${pad(minutes)}:00`;
    setScheduledDateISO(localIso);

    setShowTimePicker(false);
  };

  const handleBook = async () => {
    if (!selectedDateObj) {
      setSnackbarMsg("Vui lòng chọn ngày hẹn");
      setSnackbarVisible(true);
      return;
    }

    if (!selectedTimeObj) {
      setSnackbarMsg("Vui lòng chọn giờ hẹn");
      setSnackbarVisible(true);
      return;
    }

    if (!paymentMethod) {
      setSnackbarMsg("Chọn phương thức thanh toán");
      setSnackbarVisible(true);
      return;
    }

    const now = new Date();
    const bookingDate = new Date(scheduledDateISO);
    if (bookingDate <= now) {
      setSnackbarMsg("Ngày giờ hẹn phải trong tương lai");
      setSnackbarVisible(true);
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        scheduledTime: scheduledDateISO,
        additionalNote: note,
        paymentMethod: paymentMethod.toUpperCase(),
      };

      const res = await createBooking(id as string, payload);
      const redirectUrl = res?.data?.data?.redirectUrl;

      setSuccess(true);
      setPaymentInitiated(true);
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        useNativeDriver: true,
      }).start();

      if (redirectUrl) {
        Linking.openURL(redirectUrl);
      }

      setTimeout(() => {
        Animated.timing(scaleAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start(() => {
          setSubmitting(false);
          setSuccess(false);
          //router.replace("/(tabs)/booking");
        });
      }, 1500);

    } catch (error) {
      const msg = (error as any)?.response?.data?.message || "Đặt lịch thất bại";
      setSnackbarMsg(msg);
      setSnackbarVisible(true);
      setPaymentInitiated(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PaperProvider theme={theme}>
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeAreaView}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}>
          <View style={styles.header}>
            <MaterialIcons name="arrow-back" size={28} color="black" onPress={() => router.back()} />
            <View style={styles.titleContainer}>
              <Text variant="titleLarge" style={styles.title}>Đặt gói</Text>
            </View>
            <View style={{ width: 28 }} />
          </View>

          {error && <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
            <Text style={styles.errorText}>Lỗi khi lấy chi tiết gói</Text>
            <Button mode="contained" style={styles.retryButton} onPress={fetchData}>
              Thử lại
            </Button>
          </View>}

          {loading ? <View style={{ flex: 1, justifyContent: "center" }}>
            <ActivityIndicator size="large" color={Colors.primary} style={{ flex: 1, alignContent: "center" }} />
          </View> :
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 10 }}>
              {/* Package summary card */}
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Thông tin thầy bói</Text>
                <View style={styles.rowCenter}>
                  <Image
                    source={
                      avatarError || !pkg.seer.avatarUrl
                        ? require('@/assets/images/user-placeholder.png')
                        : { uri: pkg.seer.avatarUrl }
                    }
                    style={styles.avatarSmall}
                    onError={(e) => {
                      console.log('Avatar image failed to load:', e.nativeEvent);
                      setAvatarError(true);
                    }}
                  />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.seerNameCard}>{pkg.seer.fullName ?? 'Không Tên'}</Text>
                    <Text style={styles.rating}>⭐ {rating ?? '0.0'}</Text>
                  </View>
                </View>
              </View>

              {/* Package detail card */}
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Chi tiết gói</Text>
                <Text style={styles.packageTitleCard}>{pkg.packageTitle}</Text>
                <View style={{ marginTop: 8 }}>
                  <Markdown style={{
                    body: { ...styles.packageContentCard, margin: 0 },
                    paragraph: { marginBottom: 4 },
                  }}>
                    {(content || '').replace(/\\n/g, '\n')}
                  </Markdown>
                </View>

                {pkg.categories && <View style={styles.categoryChipsRow}>
                  {pkg.categories.map((c: any) => {
                    const key = getCategoryKeyFromName(c.name || c);
                    const col = (Colors.categoryColors as any)[key] || (Colors.categoryColors as any).other;
                    return (
                      <View key={c.id || c} style={[styles.chip, { backgroundColor: col.chip }]}>
                        <Text style={[styles.chipText, { color: col.icon }]} numberOfLines={1}>{c.name || c}</Text>
                      </View>
                    );
                  })}
                </View>}

                <View style={styles.infoRowBox}>
                  <View style={styles.infoBox}>
                    <Text style={styles.infoLabel}>Giá tiền</Text>
                    <Text style={styles.infoValue}>{pkg.price.toLocaleString() ?? '0.000'} VNĐ</Text>
                  </View>
                  <View style={styles.infoBox}>
                    <Text style={styles.infoLabel}>Thời lượng</Text>
                    <Text style={styles.infoValue}>{pkg.durationMinutes ?? '0'} phút</Text>
                  </View>
                </View>
              </View>

              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Thời gian rảnh</Text>
                {availableTimeSlots.length > 0 && (
                  <View style={{ marginTop: 14 }}>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      {availableTimeSlots
                        .slice()
                        .sort((a, b) => a.weekDate - b.weekDate)
                        .map((s) => (
                          <View key={s.weekDate} style={styles.selectedSummary}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                              <Text style={{ fontWeight: '700', marginRight: 8 }}>{s.weekDate == 8 ? "Chủ Nhật" : "Thứ " + s.weekDate}</Text>
                            </View>
                            <Text>{displayTime(s.availableFrom)} - {displayTime(s.availableTo)}</Text>
                          </View>
                        ))}
                    </View>
                  </View>
                )}
              </View>

              {!showBookingForm &&
                <Button
                  mode="contained"
                  onPress={() => setShowBookingForm(true)}
                  style={styles.bookButton}
                  contentStyle={{ height: 48 }}
                >
                  Đặt lịch
                </Button>
              }

              {/* Booking inputs */}
              {showBookingForm &&
                <View style={styles.card}>
                  <Text style={styles.sectionTitle}>Ngày hẹn</Text>
                  <TouchableOpacity onPress={() => setShowDatePicker(true)}>
                    <TextInput
                      label="Nhập ngày hẹn gặp"
                      mode="outlined"
                      value={scheduledDate}
                      editable={false}
                      right={<TextInput.Icon icon="calendar" />}
                      style={styles.input}
                    />
                  </TouchableOpacity>
                  <DateTimePickerModal
                    isVisible={showDatePicker}
                    mode="date"
                    minimumDate={new Date()}
                    onConfirm={handleConfirmDate}
                    onCancel={() => setShowDatePicker(false)}
                  />

                  <Text style={[styles.sectionTitle, { marginTop: 12 }]}>Giờ hẹn</Text>
                  <TouchableOpacity onPress={() => setShowTimePicker(true)}>
                    <TextInput
                      label="Nhập giờ cụ thể"
                      mode="outlined"
                      value={scheduledTime}
                      editable={false}
                      right={<TextInput.Icon icon="clock" onPress={() => setShowTimePicker(true)} />}
                      style={styles.input}
                    />
                  </TouchableOpacity>
                  <DateTimePickerModal
                    isVisible={showTimePicker}
                    mode="time"
                    onConfirm={handleConfirmTime}
                    onCancel={() => setShowTimePicker(false)}
                  />

                  {/* 
                <View style={styles.paymentContainer}>
                  <TouchableOpacity
                    style={styles.paymentSelector}
                    onPress={() => setPaymentDropdownOpen((v) => !v)}
                    activeOpacity={0.85}
                    onLayout={(e) => {
                      const { y, height } = e.nativeEvent.layout;
                      setPaymentSelectorLayout({ y, height });
                    }}
                  >
                    <Text style={[styles.paymentSelectorText, !paymentMethod && styles.paymentPlaceholder]}>
                      {paymentMethod || "Chọn phương thức"}
                    </Text>
                    {paymentDropdownOpen ? (
                      <ChevronUp size={20} color="#6B7280" />
                    ) : (
                      <ChevronDown size={20} color="#6B7280" />
                    )}
                  </TouchableOpacity>

                  {paymentDropdownOpen && (
                    <View style={[
                      styles.paymentListBox,
                      {
                        position: 'absolute',
                        top: paymentSelectorLayout.height + 4,
                        left: 0,
                        right: 0,
                        zIndex: 9999,
                        elevation: 10,
                      }
                    ]}>
                      {[
                        { value: "PayPal", label: "PayPal" },
                        { value: "VNPay", label: "VNPay" },
                      ].map((option) => (
                        <TouchableOpacity
                          key={option.value}
                          style={[
                            styles.paymentOption,
                            paymentMethod === option.value && styles.paymentOptionActive
                          ]}
                          onPress={() => {
                            setPaymentMethod(option.value);
                            setPaymentDropdownOpen(false);
                          }}
                        >
                          <Text style={[
                            styles.paymentOptionText,
                            paymentMethod === option.value && styles.paymentOptionTextActive
                          ]}>
                            {option.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
                */}

                  <Text style={[styles.sectionTitle, { marginTop: 12 }]}>Ghi chú</Text>
                  <TextInput
                    label="Ghi chú (tuỳ chọn)"
                    mode="outlined"
                    value={note}
                    onChangeText={setNote}
                    style={styles.input}
                    multiline
                  />

                  <Text style={[styles.sectionTitle, { marginTop: 12 }]}>Phương thức trả tiền: {paymentMethod}</Text>

                  <View style={{ height: 20 }} />
                  <Button
                    mode="contained"
                    onPress={handleBook}
                    loading={submitting}
                    style={styles.bookButton}
                    contentStyle={{ height: 48 }}
                    disabled={loading}
                  >
                    Đặt
                  </Button>
                </View>
              }
            </ScrollView>
          }

          {/* Sticky footer booking button */}
          {/* <View style={styles.footer} pointerEvents="box-none">

          </View> */}

          <Snackbar visible={snackbarVisible} onDismiss={() => setSnackbarVisible(false)}>{snackbarMsg}</Snackbar>
        </KeyboardAvoidingView>

        {/* ⏳ Blocking modal with spinner or success animation */}
        <Modal visible={submitting} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            {!success ? (
              <View style={styles.modalBox}>
                <ActivityIndicator size="large" color={Colors.primary || "#1877F2"} />
                <Text style={styles.modalText}>Đang đặt lịch...</Text>
              </View>
            ) : (
              <Animated.View style={[styles.successBox, { transform: [{ scale: scaleAnim }] }]}>
                <MaterialIcons name="check-circle" size={70} color="#16a34a" />
                <Text style={styles.successText}>Đặt lịch thành công!</Text>
              </Animated.View>
            )}
          </View>
        </Modal>

      </SafeAreaView>
    </PaperProvider>
  );
}

type timeSlot = {
  weekDate: number,
  availableFrom: string,
  availableTo: string
}

const displayTime = (t: string) => (t ? t.slice(0, 5) : '');

const getCategoryKeyFromName = (name: string) => {
  if (!name) return "other";
  const n = name.toLowerCase();
  if (n.includes("tarot")) return "tarot";
  if (n.includes("cung") || n.includes("đạo") || n.includes("hoàng")) return "zodiac";
  if (n.includes("chỉ tay")) return "palmistry";
  if (n.includes("phong")) return "fengshui";
  if (n.includes("tử vi")) return "horoscope";
  if (n.includes("bói") || n.includes("bài") || n.includes("card")) return "card";
  if (n.includes("nhân") || n.includes("tướng")) return "physiognomy";
  if (n.includes("ngũ") || n.includes("hành")) return "elements";
  return "other";
};

const styles = StyleSheet.create({
  safeAreaView: {
    flex: 1,
    backgroundColor: Colors.grayBackground
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    backgroundColor: Colors.background,
  },
  /* Booking page styles */
  card: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ECECEC'
  },
  sectionTitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
    fontFamily: 'inter'
  },
  rowCenter: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  avatarSmall: {
    width: 56,
    height: 56,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: Colors.borderGray,
  },
  seerNameCard: {
    fontSize: 16,
    fontWeight: '600'
  },
  rating: {
    marginTop: 4,
    color: '#F59E0B'
  },
  packageTitleCard: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 4
  },
  packageContentCard: {
    marginTop: 8,
    color: '#374151',
    fontFamily: "inter"
  },
  categoryChip: {
    alignSelf: 'flex-start',
    marginTop: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#EEF2FF'
  },
  categoryChipText: {
    color: '#7C3AED',
    fontWeight: '600'
  },
  infoRowBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12
  },
  infoBox: {
    flex: 1,
    backgroundColor: '#FAFAFA',
    padding: 10,
    borderRadius: 8,
    marginRight: 8
  },
  infoLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontFamily: "inter"
  },
  infoValue: {
    marginTop: 6,
    fontWeight: '700',
    color: '#10B981'
  },
  input: {

  },
  titleContainer: {
    flex: 1,
    alignItems: "center",
  },
  title: {
    fontWeight: "bold",
  },
  textInput: {
    margin: 5
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
    backgroundColor: 'transparent',
    alignItems: 'center',
  },
  bookButton: {
    width: '100%',
    borderRadius: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBox: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    width: 220,
  },
  modalText: {
    marginTop: 12,
    color: "#000",
    fontWeight: "600",
    textAlign: "center",
  },
  successBox: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  successText: {
    marginTop: 8,
    color: "#16a34a",
    fontWeight: "bold",
    fontSize: 18,
  },
  categoryChipsRow: { flexDirection: "row", alignItems: "center", marginTop: 5 },
  chip: { paddingVertical: 4, paddingHorizontal: 8, borderRadius: 12, marginRight: 6, maxWidth: 140 },
  chipText: { fontSize: 12, fontFamily: "inter" },
  overflowChip: { backgroundColor: "#e5e7eb" },
  errorText: {
    fontSize: 16,
    color: "red",
    textAlign: "center",
    paddingHorizontal: 24,
    marginBottom: 16,
    fontFamily: "Inter",
  },
  retryButton: {
    borderRadius: 10,
    backgroundColor: Colors.primary,
  },
  selectedSummary: {
    backgroundColor: Colors.likeChipBg,
    padding: 8,
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 8,
    minWidth: 120,
    alignItems: 'flex-start',
  },
  paymentContainer: {
    position: 'relative',
    width: '100%',
    zIndex: 1000,
    marginBottom: 8,
  },
  paymentSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#79747E",
    borderRadius: 4,
    backgroundColor: "#fff",
  },
  paymentSelectorText: {
    color: "#374151",
    fontSize: 16,
  },
  paymentPlaceholder: {
    color: "#6B7280",
  },
  paymentListBox: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    padding: 8,
    backgroundColor: "#fff",
  },
  paymentOption: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  paymentOptionActive: {
    backgroundColor: "#EEF2FF",
  },
  paymentOptionText: {
    color: "#374151",
    fontSize: 16,
  },
  paymentOptionTextActive: {
    color: Colors.primary,
    fontWeight: "600",
  },
})