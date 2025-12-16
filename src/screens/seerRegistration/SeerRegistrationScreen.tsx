import Colors from "@/src/constants/colors";
import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { ChevronDown, ChevronUp } from "lucide-react-native";
import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { Button, Text, TextInput } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SeerRegistrationScreen() {
  const [fullName, setFullName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [dob, setDob] = useState<string>("");
  const [gender, setGender] = useState<string>("Nam");
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [securePassword, setSecurePassword] = useState<boolean>(true);
  const [secureConfirmPassword, setSecureConfirmPassword] = useState<boolean>(true);
  const [genderDropdownOpen, setGenderDropdownOpen] = useState<boolean>(false);
  const [genderSelectorLayout, setGenderSelectorLayout] = useState({ y: 0, height: 0 });
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    const clearPreviousData = async () => {
      try {
        await SecureStore.deleteItemAsync("tempCertificates");
        await SecureStore.deleteItemAsync("seerRegistrationStep1");
        await SecureStore.deleteItemAsync("seerRegistrationStep2");
      } catch (error) {
        console.error("Error clearing previous data:", error);
      }
    };

    clearPreviousData();
  }, []);

  const formatDate = (date: Date) => {
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const handleConfirmDate = (date: Date) => {
    setDob(formatDate(date));
    setShowDatePicker(false);
  };

  const handleNext = async () => {
    if (!fullName.trim()) {
      alert("Vui lòng nhập họ và tên");
      return;
    }
    if (!email.trim()) {
      alert("Vui lòng nhập email");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      alert("Email không hợp lệ");
      return;
    }
    if (!phone.trim()) {
      alert("Vui lòng nhập số điện thoại");
      return;
    }
    if (!dob) {
      alert("Vui lòng chọn ngày sinh");
      return;
    }
    if (!password) {
      alert("Vui lòng nhập mật khẩu");
      return;
    }
    if (password.length < 8) {
      alert("Mật khẩu phải có ít nhất 8 ký tự");
      return;
    }
    if (password !== confirmPassword) {
      alert("Mật khẩu xác nhận không khớp");
      return;
    }

    const dateParts = dob.split("/");
    const isoDate = `${dateParts[2]}-${dateParts[1].padStart(2, '0')}-${dateParts[0].padStart(2, '0')}T00:00:00`;

    const step1Data = {
      fullName: fullName.trim(),
      email: email.trim(),
      phoneNumber: phone.trim(),
      birthDate: isoDate,
      gender,
      password,
      passwordConfirm: confirmPassword,
    };

    try {
      await SecureStore.setItemAsync("seerRegistrationStep1", JSON.stringify(step1Data));
      router.push("/seer-registration-step2" as any);
    } catch (error) {
      alert("Có lỗi xảy ra. Vui lòng thử lại.");
    }
  };


  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <MaterialIcons name="arrow-back" size={24} color="black" onPress={() => router.back()} />
        <View style={styles.titleContainer}>
          <Text variant="titleMedium" style={styles.title}>Đăng ký Nhà tiên tri</Text>
          <Text variant="bodySmall" style={styles.subtitle}>Bước 1/3</Text>
        </View>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView
        behavior="padding"
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
      >
        <ScrollView
          style={styles.content}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 50 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <MaterialIcons name="person-outline" size={40} color={Colors.primary} />
            </View>
          </View>

          <Text variant="headlineSmall" style={styles.sectionTitle}>Thông tin cá nhân</Text>
          <Text variant="bodyMedium" style={styles.sectionSubtitle}>Hãy cho chúng tôi biết về bạn</Text>

          <TextInput
            label="Họ và tên"
            mode="outlined"
            style={styles.input}
            placeholder="Nhập họ và tên"
            value={fullName}
            onChangeText={setFullName}
            left={<TextInput.Icon icon="account" />}
          />

          <TextInput
            label="Email"
            mode="outlined"
            style={styles.input}
            placeholder="Nhập email của bạn"
            value={email}
            onChangeText={setEmail}
            left={<TextInput.Icon icon="email" />}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <TextInput
            label="Số điện thoại"
            mode="outlined"
            style={styles.input}
            placeholder="Nhập số điện thoại của bạn"
            value={phone}
            onChangeText={setPhone}
            left={<TextInput.Icon icon="phone" />}
            keyboardType="phone-pad"
          />

          <TouchableOpacity onPress={() => setShowDatePicker(true)}>
            <TextInput
              label="Ngày sinh"
              mode="outlined"
              value={dob}
              editable={false}
              pointerEvents="none"
              style={styles.input}
              left={<TextInput.Icon icon="calendar" />}
            />
          </TouchableOpacity>
          <DateTimePickerModal
            isVisible={showDatePicker}
            mode="date"
            onConfirm={handleConfirmDate}
            onCancel={() => setShowDatePicker(false)}
            maximumDate={new Date()}
          />
          
          <Text style={styles.label}>Giới tính</Text>
          <View style={styles.genderContainer}>
            <TouchableOpacity
              style={styles.genderSelector}
              onPress={() => setGenderDropdownOpen((v) => !v)}
              activeOpacity={0.85}
              onLayout={(e) => {
                const { y, height } = e.nativeEvent.layout;
                setGenderSelectorLayout({ y, height });
              }}
            >
              <Text style={[styles.genderSelectorText, !gender && styles.genderPlaceholder]}>
                {gender || "Chọn giới tính"}
              </Text>
              {genderDropdownOpen ? (
                <ChevronUp size={20} color="#6B7280" />
              ) : (
                <ChevronDown size={20} color="#6B7280" />
              )}
            </TouchableOpacity>

            {genderDropdownOpen && (
              <View style={[
                styles.genderListBox,
                {
                  position: 'absolute',
                  top: genderSelectorLayout.height + 4,
                  left: 0,
                  right: 0,
                  zIndex: 9999,
                  elevation: 10,
                }
              ]}>
                {[
                  { value: "Nam", label: "Nam" },
                  { value: "Nữ", label: "Nữ" },
                  { value: "Khác", label: "Khác" },
                ].map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.genderOption,
                      gender === option.value && styles.genderOptionActive
                    ]}
                    onPress={() => {
                      setGender(option.value);
                      setGenderDropdownOpen(false);
                    }}
                  >
                    <Text style={[
                      styles.genderOptionText,
                      gender === option.value && styles.genderOptionTextActive
                    ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <TextInput
            label="Mật khẩu"
            mode="outlined"
            style={styles.input}
            placeholder="Tạo mật khẩu"
            value={password}
            onChangeText={setPassword}
            left={<TextInput.Icon icon="lock" />}
            right={
              <TextInput.Icon
                icon={securePassword ? "eye-off" : "eye"}
                onPress={() => setSecurePassword(!securePassword)}
              />
            }
            secureTextEntry={securePassword}
          />

          <TextInput
            label="Xác nhận mật khẩu"
            mode="outlined"
            style={styles.input}
            placeholder="Nhập lại mật khẩu"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            left={<TextInput.Icon icon="lock" />}
            right={
              <TextInput.Icon
                icon={secureConfirmPassword ? "eye-off" : "eye"}
                onPress={() => setSecureConfirmPassword(!secureConfirmPassword)}
              />
            }
            secureTextEntry={secureConfirmPassword}
          />
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.footer}>
        <Button
          mode="outlined"
          style={styles.backButton}
          onPress={() => router.back()}
        >
          Quay lại
        </Button>
        <Button
          mode="contained"
          style={styles.nextButton}
          onPress={handleNext}
        >
          Tiếp tục
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff"
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  titleContainer: {
    flex: 1,
    alignItems: "center",
  },
  title: {
    fontWeight: "bold",
  },
  subtitle: {
    color: Colors.gray,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  avatarContainer: {
    alignItems: "center",
    marginVertical: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#e6f2ff",
    justifyContent: "center",
    alignItems: "center",
  },
  sectionTitle: {
    fontWeight: "bold",
    textAlign: "center",
    marginTop: 8,
  },
  sectionSubtitle: {
    textAlign: "center",
    color: Colors.gray,
    marginBottom: 24,
  },
  input: {
    marginBottom: 16,
  },
  footer: {
    flexDirection: "row",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  backButton: {
    flex: 1,
    marginRight: 8,
    borderColor: Colors.primary,
    borderRadius: 10,
  },
  nextButton: {
    flex: 1,
    marginLeft: 8,
    backgroundColor: Colors.primary,
    borderRadius: 10,
  },
  genderMenu: {
    width: '90%',
  },
  genderContainer: {
    position: 'relative',
    width: '100%',
    marginBottom: 16,
    zIndex: 1000,
  },
  label: {
    fontSize: 13,
    color: "#374151",
    marginBottom: 4,
  },
  genderSelector: {
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
  genderSelectorText: {
    color: "#374151",
    fontSize: 16,
  },
  genderPlaceholder: {
    color: "#6B7280",
  },
  genderListBox: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    padding: 8,
    backgroundColor: "#fff",
  },
  genderOption: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  genderOptionActive: {
    backgroundColor: "#EEF2FF",
  },
  genderOptionText: {
    color: "#374151",
    fontSize: 16,
  },
  genderOptionTextActive: {
    color: Colors.primary,
    fontWeight: "600",
  },
});