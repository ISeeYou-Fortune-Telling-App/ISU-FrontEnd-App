import Colors from "@/src/constants/colors";
import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, View } from "react-native";
import { Button, Text, TextInput } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ForgotPasswordScreen() {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);

    const GetOTP = async () => {
        if (!email) {
            Alert.alert("Email", "Hãy nhập địa chỉ Email của bạn.");
            return;
        }

        Alert.alert("Thành công", "res.data", [
                {
                    text: "OK",
                    onPress: () => {
                        router.push({ pathname: "/password-recovery", params: { email } });
                    },
                },
            ]);
        // try {
        //     setLoading(true);
        //     const res = await forgotPassword(email);
        //     Alert.alert("Thành công", res.data, [
        //         {
        //             text: "OK",
        //             onPress: () => {
        //                 router.push({ pathname: "/password-recovery", params: { email } });
        //             },
        //         },
        //     ]);
        // } catch (error) {
        //     console.error(error);
        //     Alert.alert("Lỗi", "Không thể gửi OTP. Vui lòng thử lại.");
        // } finally {
        //     setLoading(false);
        // }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
                <View style={styles.header}>
                    <MaterialIcons name="arrow-back" size={28} color="black" onPress={() => router.back()} />
                    <View style={styles.titleContainer}>
                        <Text variant="titleLarge" style={styles.title}>Quên mật khẩu</Text>
                    </View>
                    <View style={{ width: 28 }} />
                </View>

                <View style={{ justifyContent: "center", flex: 1 }}>
                    <View style={styles.card}>
                        <Text style={styles.sectionTitle}>Nhập email của bạn</Text>
                        <Text style={styles.text}>Xin hãy đảm bảo địa chỉ Email hợp lệ.</Text>
                        <TextInput
                            label="Email"
                            autoCapitalize="none"
                            keyboardType="email-address"
                            mode="outlined"
                            left={<TextInput.Icon icon="email" />}
                            onChangeText={setEmail}
                            value={email}
                        />
                        <Button
                            mode="contained"
                            style={styles.btnLogin}
                            onPress={GetOTP}
                            loading={loading}
                            disabled={loading}
                        >
                            Lấy OTP
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
        backgroundColor: Colors.grayBackground
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 14,
        borderBottomWidth: 1,
        borderBottomColor: "#eee",
        backgroundColor: Colors.background
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
    },
    text: {
        fontSize: 12,
        fontWeight: "600",
        fontFamily: "inter",
        color: Colors.gray,
        marginVertical: 5,
    },
    btnLogin: {
        backgroundColor: Colors.primary,
        borderRadius: 10,
        marginTop: 20
    },
});
