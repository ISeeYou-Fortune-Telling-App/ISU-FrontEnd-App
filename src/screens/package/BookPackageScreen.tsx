import Colors from "@/src/constants/colors";
import { theme } from "@/src/constants/theme";
import { createBooking } from "@/src/services/api.js";
import { MaterialIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useRef, useState } from "react";
import { ActivityIndicator, Animated, Image, KeyboardAvoidingView, Linking, Modal, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { Button, Menu, PaperProvider, Snackbar, Text, TextInput } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

export default function BookPackageScreen() {
  const { id, title, content, rating, price, duration, seer, avatarUrl } = useLocalSearchParams();
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [scheduledDate, setScheduledDate] = useState<string>("");
  const [scheduledDateISO, setScheduledDateISO] = useState<string>("");
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [scheduledTime, setScheduledTime] = useState<string>("");
  const [selectedDateObj, setSelectedDateObj] = useState<Date | null>(null);
  const [selectedTimeObj, setSelectedTimeObj] = useState<Date | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [menuVisible, setMenuVisible] = useState<boolean>(false);
  const [note, setNote] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [snackbarVisible, setSnackbarVisible] = useState<boolean>(false);
  const [snackbarMsg, setSnackbarMsg] = useState<string>("");
  const [avatarError, setAvatarError] = useState(false);
  const [success, setSuccess] = useState(false);
  const scaleAnim = useRef(new Animated.Value(0)).current;

  const openMenu = () => setMenuVisible(true);
  const closeMenu = () => setMenuVisible(false);
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

  const handleConfirmDate = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();

    setSelectedDateObj(date);
    setScheduledDate(`${pad(day)}/${pad(month + 1)}/${year}`);
    setShowDatePicker(false);
  };

  const handleConfirmTime = (time: Date) => {
    if (!selectedDateObj) {
      setSnackbarMsg("Vui lòng chọn ngày trước");
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
          router.replace("/(tabs)/booking");
        });
      }, 1500);

    } catch (error) {
      const msg = (error as any)?.response?.data?.message || "Đặt lịch thất bại";
      setSnackbarMsg(msg);
      setSnackbarVisible(true);
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

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
          {/* Package summary card */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Thông tin thầy bói</Text>
            <View style={styles.rowCenter}>
              <Image
                source={
                  avatarError || !avatarUrl
                    ? require('@/assets/images/user-placeholder.png')
                    : { uri: avatarUrl }
                }
                style={styles.avatarSmall}
                onError={(e) => {
                  console.log('Avatar image failed to load:', e.nativeEvent);
                  setAvatarError(true);
                }}
              />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.seerNameCard}>{seer ?? 'Không Tên'}</Text>
                <Text style={styles.rating}>⭐ {rating ?? '0.0'}</Text>
              </View>
            </View>
          </View>

          {/* Package detail card */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Chi tiết gói</Text>
            <Text style={styles.packageTitleCard}>{title}</Text>
            <Text style={styles.packageContentCard}>{content}</Text>

            <TouchableOpacity style={styles.categoryChip}>
              <Text style={styles.categoryChipText}>Cung Hoàng Đạo</Text>
            </TouchableOpacity>

            <View style={styles.infoRowBox}>
              <View style={styles.infoBox}>
                <Text style={styles.infoLabel}>Giá tiền</Text>
                <Text style={styles.infoValue}>{price ?? '0.000 VNĐ'}</Text>
              </View>
              <View style={styles.infoBox}>
                <Text style={styles.infoLabel}>Thời lượng</Text>
                <Text style={styles.infoValue}>{duration ?? '0 phút'}</Text>
              </View>
            </View>
          </View>

          {/* Booking inputs */}
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

            <Text style={[styles.sectionTitle, { marginTop: 12 }]}>Phương thức trả tiền</Text>
            <Menu
              visible={menuVisible}
              onDismiss={closeMenu}
              anchor={
                <TextInput
                  label="Chọn phương thức"
                  mode="outlined"
                  style={styles.input}
                  value={paymentMethod}
                  editable={false}
                  right={<TextInput.Icon icon="chevron-down" onPress={openMenu} />}
                />
              }>
              <Menu.Item onPress={() => { setPaymentMethod("PayPal"); closeMenu(); }} title="PayPal" />
              <Menu.Item onPress={() => { setPaymentMethod("VNPay"); closeMenu(); }} title="VNPay" />
            </Menu>

            <Text style={[styles.sectionTitle, { marginTop: 12 }]}>Ghi chú</Text>
            <TextInput
              label="Ghi chú (tuỳ chọn)"
              mode="outlined"
              value={note}
              onChangeText={setNote}
              style={styles.input}
              multiline
            />
          </View>

        </ScrollView>

        {/* Sticky footer booking button */}
        <View style={styles.footer} pointerEvents="box-none">
          <Button
            mode="contained"
            onPress={handleBook}
            loading={submitting}
            style={styles.bookButton}
            contentStyle={{ height: 48 }}
          >
            Đặt lịch
          </Button>
        </View>

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
    fontFamily: 'Inter'
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
    color: '#374151'
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
    color: '#6B7280'
  },
  infoValue: {
    marginTop: 6,
    fontWeight: '700',
    color: '#10B981'
  },
  input: {
    marginTop: 8
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
    margin: 10,
  },
  // ✅ Modal styles
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
})