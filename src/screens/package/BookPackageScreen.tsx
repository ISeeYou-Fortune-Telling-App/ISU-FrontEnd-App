import Colors from "@/src/constants/colors";
import { createBooking } from "@/src/services/api.js";
import { MaterialIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Image, KeyboardAvoidingView, Linking, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { Button, Menu, Snackbar, Text, TextInput } from "react-native-paper";
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
  const [bookingLoading, setBookingLoading] = useState<boolean>(false);
  const [snackbarVisible, setSnackbarVisible] = useState<boolean>(false);
  const [snackbarMsg, setSnackbarMsg] = useState<string>("");

  const openMenu = () => setMenuVisible(true);
  const closeMenu = () => setMenuVisible(false);

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
    setSelectedDateObj(date);
    setScheduledDate(formatDate(date));
    // store date ISO for now (time will be added when time is picked)
    setScheduledDateISO(date.toISOString());
    setShowDatePicker(false);
  };

  const handleConfirmTime = (time: Date) => {
    // time is a Date where hours/minutes represent the chosen time
    setSelectedTimeObj(time);
    setScheduledTime(formatTime(time));

    // Combine selected date and time into one ISO string
    const baseDate = selectedDateObj ? new Date(selectedDateObj) : new Date();
    baseDate.setHours(time.getHours(), time.getMinutes(), 0, 0);
    setScheduledDateISO(baseDate.toISOString());

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

    setBookingLoading(true);
    try {
      const payload = {
        scheduledTime: scheduledDateISO,
        additionalNote: note,
        paymentMethod: paymentMethod.toUpperCase(),
      };

      const res = await createBooking(id as string, payload);
      const redirectUrl = res?.data?.data?.redirectUrl;

      setSnackbarMsg("Đặt lịch thành công");
      setSnackbarVisible(true);

      if (redirectUrl) {
        // open payment/approval page if provided by backend
        Linking.openURL(redirectUrl);
      } else {
        // go back to previous screen
        router.back();
      }
    } catch (error) {
      const msg = (error as any)?.response?.data?.message || "Đặt lịch thất bại";
      setSnackbarMsg(msg);
      setSnackbarVisible(true);
    } finally {
      setBookingLoading(false);
    }
  };

  return (
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
              <Image source={avatarUrl ? { uri: avatarUrl as string } : require('@/assets/images/user-placeholder.png')} style={styles.avatarSmall} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.seerNameCard}>{seer ?? 'Thầy Ông Nội'}</Text>
                <Text style={styles.rating}>⭐ {rating ?? '4.1'}</Text>
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
                <Text style={styles.infoValue}>{price ?? '1000.000 VNĐ'}</Text>
              </View>
              <View style={styles.infoBox}>
                <Text style={styles.infoLabel}>Thời lượng</Text>
                <Text style={styles.infoValue}>{duration ?? '90 phút'}</Text>
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
            loading={bookingLoading}
            style={styles.bookButton}
            contentStyle={{ height: 48 }}
          >
            Đặt lịch
          </Button>
        </View>

        <Snackbar visible={snackbarVisible} onDismiss={() => setSnackbarVisible(false)}>{snackbarMsg}</Snackbar>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
  }
})