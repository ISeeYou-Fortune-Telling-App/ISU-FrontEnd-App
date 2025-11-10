import Colors from "@/src/constants/colors";
import { resendOTP, verifyEmail } from "@/src/services/api";
import { MaterialIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, View } from "react-native";
import { Button, Text, TextInput } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

export default function OTPVerificationScreen() {
  const { email: paramEmail } = useLocalSearchParams(); // get email from params
  const [email, setEmail] = useState(typeof paramEmail === 'string' ? paramEmail : "");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  const isEmailProvided = typeof paramEmail === 'string' && paramEmail.length > 0; // If email is passed via params, hide email input

  const handleEmailVerification = async () => {
    if (!email || !otp) {
      Alert.alert("Thiếu thông tin", "Vui lòng nhập đầy đủ email và mã OTP.");
      return;
    }

    try {
      setLoading(true);
      console.log("Verifying email with data:", { email, otpCode: otp });
      const res = await verifyEmail({
        email,
        otpCode: otp,
      });
      Alert.alert("Thành công", res.data.message, [
        { text: "OK", onPress: () => router.replace("/auth") },
      ]);
    } catch (err: any) {
      console.error("Verify email error:", err);
      console.log("Error response:", err?.response);
      const message = err?.response?.data?.message || "Không thể xác thực email. Vui lòng thử lại.";
      Alert.alert("Lỗi", message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendOTP = async () => {
    if (!email) {
      Alert.alert("Thiếu thông tin", "Vui lòng nhập email.");
      return;
    }

    try {
      setLoading(true);
      console.log("Sending OTP to email:", email);
      await resendOTP(email);
      setOtpSent(true);
      Alert.alert("Thành công", "Mã OTP đã được gửi đến email của bạn.");
    } catch (err: any) {
      console.error("Send OTP error:", err);
      console.log("Error response:", err?.response);
      const message = err?.response?.data?.message || "Không thể gửi mã OTP. Vui lòng thử lại.";
      Alert.alert("Lỗi", message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (!email) {
      Alert.alert("Thiếu thông tin", "Vui lòng nhập email.");
      return;
    }

    try {
      setLoading(true);
      await resendOTP(email);
      Alert.alert("Thành công", "Mã OTP đã được gửi lại đến email của bạn.");
    } catch (err: any) {
      console.error(err);
      const message = err?.response?.data?.message || "Không thể gửi lại mã OTP. Vui lòng thử lại.";
      Alert.alert("Lỗi", message);
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
            <Text variant="titleLarge" style={styles.title}>Xác thực email</Text>
          </View>
          <View style={{ width: 28 }} />
        </View>

        <View style={{ justifyContent: "center", flex: 1 }}>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>
              {isEmailProvided ? "Nhập mã OTP" : otpSent ? "Nhập mã OTP" : "Gửi mã OTP"}
            </Text>
            <Text style={styles.description}>
              {isEmailProvided 
                ? `Chúng tôi đã gửi mã OTP đến email ${email}. Vui lòng kiểm tra và nhập mã để xác thực tài khoản.`
                : otpSent
                  ? `Chúng tôi đã gửi mã OTP đến email ${email}. Vui lòng kiểm tra và nhập mã để xác thực tài khoản.`
                  : "Vui lòng nhập email để nhận mã OTP xác thực tài khoản."
              }
            </Text>
            
            <TextInput
              autoCapitalize="none"
              mode="outlined"
              left={<TextInput.Icon icon="email" />}
              onChangeText={setEmail}
              value={email}
              keyboardType="email-address"
              placeholder="Nhập email của bạn"
              style={styles.textInput}
              disabled={isEmailProvided || otpSent} // Disable if email provided or OTP already sent
            />
            
            {(isEmailProvided || otpSent) && (
              <TextInput
                autoCapitalize="none"
                mode="outlined"
                left={<TextInput.Icon icon="form-textbox-password" />}
                onChangeText={setOtp}
                value={otp}
                keyboardType="numeric"
                placeholder="Nhập mã OTP"
                style={styles.textInput}
              />
            )}
            
            {!otpSent && !isEmailProvided ? (
              <Button
                mode="contained"
                style={styles.btnVerify}
                onPress={handleSendOTP}
                loading={loading}
                disabled={loading || !email}
              >
                Gửi mã OTP
              </Button>
            ) : (
              <>
                <Button
                  mode="contained"
                  style={styles.btnVerify}
                  onPress={handleEmailVerification}
                  loading={loading}
                  disabled={loading || !otp}
                >
                  Xác thực email
                </Button>
                <Button
                  mode="text"
                  style={styles.btnResend}
                  onPress={handleResendOTP}
                  disabled={loading}
                  loading={loading}
            >
                  Gửi lại mã OTP
                </Button>
              </>
            )}
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
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: Colors.gray,
    marginBottom: 16,
    lineHeight: 20,
  },
  btnVerify: {
    backgroundColor: Colors.primary,
    marginTop: 16,
  },
  btnResend: {
    marginTop: 8,
  },
  textInput: {
    marginBottom: 12,
  },
});