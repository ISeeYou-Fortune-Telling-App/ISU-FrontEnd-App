import Colors from "@/src/constants/colors";
import { verifyForgotPassword } from "@/src/services/api";
import { MaterialIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, View } from "react-native";
import { Button, Text, TextInput } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

export default function PasswordRecoveryScreen() {
  const { email } = useLocalSearchParams(); // 👈 get email from params
  const [OTP, setOTP] = useState("");
  const [password, setPassword] = useState("");
  const [ConfirmPassword, setConfirmPassword] = useState("");
  const [secure, setSecure] = useState(true);
  const [secure2, setSecure2] = useState(true);
  const [loading, setLoading] = useState(false);

  const handlePasswordReset = async () => {
    if (!OTP || !password || !ConfirmPassword) {
      Alert.alert("Thiếu thông tin", "Vui lòng nhập đầy đủ thông tin.");
      return;
    }
    if (password !== ConfirmPassword) {
      Alert.alert("Lỗi", "Mật khẩu xác nhận không khớp.");
      return;
    }

    try {
      setLoading(true);
      const res = await verifyForgotPassword({
        email,
        otpCode: OTP,
        password,
        confirmPassword: ConfirmPassword,
      });
      Alert.alert("Thành công", res.data.message, [
        { text: "OK", onPress: () => router.replace("/auth") },
      ]);
    } catch (err) {
      console.error(err);
      Alert.alert("Lỗi", "Không thể đặt lại mật khẩu. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <View style={styles.header}>
          <MaterialIcons name="arrow-back" size={28} color="black" onPress={() => router.back()} />
          <View style={styles.titleContainer}>
            <Text variant="titleLarge" style={styles.title}>Tạo mật khẩu</Text>
          </View>
          <View style={{ width: 28 }} />
        </View>

        <View style={{ justifyContent: "center", flex: 1 }}>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Nhập mật khẩu của bạn</Text>
            <TextInput
              autoCapitalize="none"
              mode="outlined"
              left={<TextInput.Icon icon="lock" />}
              right={<TextInput.Icon icon={secure ? "eye-off" : "eye"} onPress={() => setSecure(!secure)} />}
              secureTextEntry={secure}
              onChangeText={setPassword}
              value={password}
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Xác nhận mật khẩu</Text>
            <TextInput
              autoCapitalize="none"
              mode="outlined"
              left={<TextInput.Icon icon="lock" />}
              right={<TextInput.Icon icon={secure2 ? "eye-off" : "eye"} onPress={() => setSecure2(!secure2)} />}
              secureTextEntry={secure2}
              onChangeText={setConfirmPassword}
              value={ConfirmPassword}
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Nhập mã OTP</Text>
            <TextInput
              autoCapitalize="none"
              mode="outlined"
              left={<TextInput.Icon icon="form-textbox-password" />}
              onChangeText={setOTP}
              value={OTP}
              keyboardType="numeric"
            />
            <Button
              mode="contained"
              style={styles.btnLogin}
              onPress={handlePasswordReset}
              loading={loading}
              disabled={loading}
            >
              Tạo mật khẩu mới
            </Button>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.grayBackground,
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
  titleContainer: {
    flex: 1,
    alignItems: "center",
  },
  title: {
    fontWeight: "bold",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    margin: 10,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    fontFamily: "inter",
    marginBottom: 12,
  },
  btnLogin: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    marginTop: 20,
  },
});
