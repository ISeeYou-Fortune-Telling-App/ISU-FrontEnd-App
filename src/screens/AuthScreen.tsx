import Colors from "@/src/constants/colors";
import { theme } from "@/src/constants/theme";
import { loginUser, registerUser } from "@/src/services/api";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { Eye } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Alert, ImageBackground, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { Button, Checkbox, Menu, SegmentedButtons, Text, TextInput } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

const isValidMonthDay = (month: number, day: number): boolean => {
    if (month < 1 || month > 12 || day < 1) {
        return false;
    }
    const daysInMonth = new Date(2000, month, 0).getDate();
    return day <= daysInMonth;
};

const parseMonthDay = (value: string): { month: number; day: number } | null => {
    const trimmedValue = value.trim();
    if (!trimmedValue) {
        return null;
    }

    const parts = trimmedValue.split(/[\/\-.]/).filter(Boolean);
    if (parts.length === 3) {
        const numeric = parts.map((part) => Number.parseInt(part, 10));
        if (numeric.some((num) => Number.isNaN(num))) {
            return null;
        }

        let month = numeric[0];
        let day = numeric[1];

        if (parts[0].length === 4) {
            month = numeric[1];
            day = numeric[2];
        } else if (parts[2].length === 4) {
            day = numeric[0];
            month = numeric[1];
        } else if (numeric[0] > 12 && numeric[1] <= 12) {
            day = numeric[0];
            month = numeric[1];
        }

        if (!isValidMonthDay(month, day)) {
            return null;
        }

        return { month, day };
    }

    const parsedDate = new Date(trimmedValue);
    if (Number.isNaN(parsedDate.getTime())) {
        return null;
    }

    return {
        month: parsedDate.getMonth() + 1,
        day: parsedDate.getDate(),
    };
};

const calculateZodiacSign = (value: string): string => {
    const result = parseMonthDay(value);
    if (!result) {
        return "";
    }

    const { month, day } = result;

    if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) {
        return "Bảo Bình";
    }
    if ((month === 2 && day >= 19) || (month === 3 && day <= 20)) {
        return "Song Ngư";
    }
    if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) {
        return "Bạch Dương";
    }
    if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) {
        return "Kim Ngưu";
    }
    if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) {
        return "Song Tử";
    }
    if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) {
        return "Cự Giải";
    }
    if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) {
        return "Sư Tử";
    }
    if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) {
        return "Xử Nữ";
    }
    if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) {
        return "Thiên Bình";
    }
    if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) {
        return "Bọ Cạp";
    }
    if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) {
        return "Nhân Mã";
    }
    return "Ma Kết";
};

type AuthOption = "login" | "signup";

export default function AuthScreen() {
    const [rememberMe, setRememberMe] = useState<boolean>(false);
    const [email, setEmail] = useState<string>("");
    const [password, setPassword] = useState<string>("");
    const [confirmPassword, setConfirmPassword] = useState<string>("");
    const [fullName, setFullName] = useState<string>("");
    const [phone, setPhone] = useState<string>("");
    const [DOB, setDOB] = useState<string>("");
    const [actualDOB, setActualDOB] = useState<string>("");
    const [zodiac, setZodiac] = useState<string>("");
    const [gender, setGender] = useState<string>("");
    const [error, setError] = useState<string | null>(null);
    const [option, setOption] = useState<AuthOption>("login");
    const [secure, setSecure] = useState<boolean>(true);
    const [secure2, setSecure2] = useState<boolean>(true);
    const [submitting, setSubmitting] = useState<boolean>(false);
    const router = useRouter();
    const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
    const [menuVisible, setMenuVisible] = useState<boolean>(false);

    const openMenu = () => setMenuVisible(true);
    const closeMenu = () => setMenuVisible(false);

    useEffect(() => {
        (async () => {
            try {
                const savedEmail = await SecureStore.getItemAsync("savedEmail");
                const savedPassword = await SecureStore.getItemAsync("savedPassword");
                if (savedEmail && savedPassword) {
                    setEmail(savedEmail);
                    setPassword(savedPassword);
                    setRememberMe(true);
                }
            } catch (e) {
                console.warn("Failed to load saved credentials", e);
            }
        })();
    }, []);

    const handleDOBChange = (value: string) => {
        setDOB(value);
        setZodiac(calculateZodiacSign(value));
    };

    const handleLogin = async () => {
        if (!email || !password) {
            setError("Vui lòng điền đầy đủ thông tin đăng nhập.");
            return;
        }

        setError(null);

        try {
            setSubmitting(true);
            const fcmToken = await SecureStore.getItemAsync("fcmToken") || "";
            console.log('Uploaded FCM Token: ', fcmToken);
            const response = await loginUser({ email, password, fcmToken });
            const payload = response?.data?.data;

            if (!payload?.token) {
                setError("Không nhận được token đăng nhập.");
                return;
            }

            await SecureStore.setItemAsync("authToken", payload.token);

            if (payload.refreshToken) {
                await SecureStore.setItemAsync("refreshToken", payload.refreshToken);
            }
            if (payload.role) {
                await SecureStore.setItemAsync("userRole", payload.role);
            }
            if (payload.userId) {
                await SecureStore.setItemAsync("userId", payload.userId);
            }

            try {
                if (rememberMe) {
                    await SecureStore.setItemAsync("savedEmail", email);
                    await SecureStore.setItemAsync("savedPassword", password);
                } else {
                    await SecureStore.deleteItemAsync("savedEmail");
                    await SecureStore.deleteItemAsync("savedPassword");
                }
            } catch (e) {
                console.warn("SecureStore operation failed", e);
            }

            router.replace("/(tabs)/home");
        } catch (err: any) {
            console.error("Đăng nhập thất bại", err);
            console.log("Error response:", err?.response);
            console.log("Error status:", err?.response?.status);
            console.log("Error data:", err?.response?.data);

            // Check if email needs verification (403 error with specific message)
            if ((err?.response?.status === 403 || err?.response?.data?.statusCode === 403) &&
                err?.response?.data?.message?.includes("Email chưa được xác thực")) {
                console.log("Navigating to OTP screen with email:", email);
                // Navigate to OTP verification screen with the email
                router.push({
                    pathname: "/otp-verification",
                    params: { email: email }
                });
                return;
            }

            const message =
                err?.response?.data?.message ||
                err?.message ||
                "Không thể đăng nhập. Vui lòng thử lại.";
            setError(message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleSkipLogin = async () => {
        try {
            setError(null);
            await SecureStore.setItemAsync("authToken", "demo-token");
            await SecureStore.setItemAsync("refreshToken", "demo-refresh-token");
            await SecureStore.setItemAsync("userRole", "CUSTOMER");
            await SecureStore.setItemAsync("userId", "demo-user");
            router.replace("/(tabs)/home");
        } catch (err) {
            console.error("Không thể bỏ qua đăng nhập", err);
            setError("Không thể bỏ qua đăng nhập. Vui lòng thử lại.");
        }
    };

    const handleRegister = async () => {
        if (!fullName || !email || !password || !confirmPassword || !phone || !DOB || !gender) {
            setError("Vui lòng điền đầy đủ thông tin đăng ký.");
            return;
        }
        if (password.length < 8) {
            setError("Mật khẩu phải có ít nhất 8 ký tự.");
            return;
        }
        if (password !== confirmPassword) {
            setError("Mật khẩu xác nhận không trùng khớp.");
            return;
        }

        const computedZodiac = calculateZodiacSign(DOB);
        if (!computedZodiac) {
            setError("Ngày sinh không hợp lệ.");
            return;
        }

        try {
            setSubmitting(true);
            setZodiac(computedZodiac);
            setError(null);

            const data = {
                fullName,
                email,
                phoneNumber: phone,
                birthDate: actualDOB,
                gender,
                password,
                passwordConfirm: confirmPassword
            }

            const res = await registerUser(data);

            Alert.alert("Thành công", "Xin hãy nhập mã OTP để xác nhận tài khoản.", [
                {
                    text: "OK",
                    onPress: () => router.push("/otp-verification")
                }
            ]);
        }
        catch (err) {
            Alert.alert("Lỗi", "Hiện giờ không thể đăng ký. Xin hãy thử lại sau.");
        }
        finally {
            setSubmitting(false);
        }
    };

    const formatDate = (date: Date) => {
        const day = date.getDate().toString().padStart(2, "0");
        const month = (date.getMonth() + 1).toString().padStart(2, "0");
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    };

    const handleConfirmDate = (date: Date) => {
        setActualDOB(date.toISOString())
        setDOB(formatDate(date));
        handleDOBChange(formatDate(date));
        setShowDatePicker(false);
    };

    return (
        <ImageBackground
            source={require("@/assets/images/authBackground.png")}
            resizeMode="cover"
            style={{ flex: 1 }}>


            <SafeAreaView edges={['top', 'left', 'right']} style={styles.SafeAreaView}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    style={styles.keyboardAvoidingView}
                    keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 24}>
                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                        contentContainerStyle={[
                            styles.scrollContent,
                            option === "login" ? styles.scrollContentCentered : null,
                        ]}>
                        <Text style={styles.header} variant="headlineSmall">Chào mừng đến với I See You</Text>
                        <Text style={styles.header2} variant="titleSmall">Kết nối với các Nhà tiên tri uy tín nhất</Text>

                        <SegmentedButtons
                            value={option}
                            onValueChange={(value) => {
                                setOption(value);
                                setError(null);
                                setEmail("");
                                setPassword("");
                                setConfirmPassword("");
                                setFullName("");
                                setPhone("");
                                setDOB("");
                                setZodiac("");
                                setGender("");
                            }}
                            buttons={[
                                { value: "login", label: "Đăng nhập" },
                                { value: "signup", label: "Đăng ký" },
                            ]}
                            style={{ marginBottom: 20 }}
                        />

                        {option === "login" ? (
                            <View key="login">
                                <TextInput
                                    label="Email"
                                    autoCapitalize="none"
                                    keyboardType="email-address"
                                    placeholder="Nhập email của bạn"
                                    mode="outlined"
                                    style={styles.textInput}
                                    left={<TextInput.Icon icon="email" />}
                                    onChangeText={setEmail}
                                    value={email}
                                />

                                <TextInput
                                    label="Mật khẩu"
                                    autoCapitalize="none"
                                    placeholder="Nhập mật khẩu của bạn"
                                    mode="outlined"
                                    style={styles.textInput}
                                    secureTextEntry={secure}
                                    left={<TextInput.Icon icon="lock" />}
                                    right={
                                        <TextInput.Icon
                                            icon={secure ? "eye-off" : "eye"}
                                            onPress={() => setSecure((prev) => !prev)}
                                        />
                                    }
                                    onChangeText={setPassword}
                                    value={password}
                                />

                                {error && <Text style={styles.errorText}>{error}</Text>}

                                <View style={styles.flexRowJustifyBetweenItemsCenterMt2}>
                                    <View style={styles.flexRowItemsCenter}>
                                        <Checkbox
                                            status={rememberMe ? "checked" : "unchecked"}
                                            onPress={() => setRememberMe((prev) => !prev)}
                                        />
                                        <Text style={styles.text}>Ghi nhớ tài khoản</Text>
                                    </View>

                                    <TouchableOpacity onPress={() => router.push("/forgot-password")}>
                                        <Text style={styles.link}>Quên mật khẩu?</Text>
                                    </TouchableOpacity>
                                </View>

                                <Button mode="contained" style={styles.btnLogin} onPress={handleLogin} loading={submitting} disabled={submitting}>
                                    Đăng nhập
                                </Button>

                                <Button mode="contained" style={styles.btnOTP} onPress={() => router.push("/otp-verification")}>
                                    Xác thực OTP
                                </Button>

                                <Button mode="text" style={styles.skipButton} onPress={handleSkipLogin} disabled={submitting}>
                                    Bỏ qua (demo)
                                </Button>

                            </View>
                        ) : (
                            <View key="register">
                                <TextInput
                                    label="Họ và tên"
                                    placeholder="Nhập họ và tên"
                                    mode="outlined"
                                    style={styles.textInput}
                                    left={<TextInput.Icon icon="account" />}
                                    onChangeText={setFullName}
                                    value={fullName}
                                />

                                <TextInput
                                    label="Email"
                                    autoCapitalize="none"
                                    keyboardType="email-address"
                                    placeholder="Nhập email của bạn"
                                    mode="outlined"
                                    style={styles.textInput}
                                    left={<TextInput.Icon icon="email" />}
                                    onChangeText={setEmail}
                                    value={email}
                                />

                                <TextInput
                                    label="Số điện thoại"
                                    keyboardType="phone-pad"
                                    placeholder="Nhập số điện thoại"
                                    mode="outlined"
                                    style={styles.textInput}
                                    left={<TextInput.Icon icon="phone" />}
                                    onChangeText={setPhone}
                                    value={phone}
                                />

                                <TouchableOpacity onPress={() => setShowDatePicker(true)}>
                                    <TextInput
                                        label="Ngày sinh"
                                        mode="outlined"
                                        value={DOB}
                                        editable={false}
                                        pointerEvents="none"
                                        style={styles.textInput}
                                        left={<TextInput.Icon icon="calendar" />}
                                    />
                                </TouchableOpacity>
                                <DateTimePickerModal
                                    isVisible={showDatePicker}
                                    mode="date"
                                    onConfirm={handleConfirmDate}
                                    onCancel={() => setShowDatePicker(false)}
                                />

                                <TextInput
                                    label="Cung hoàng đạo"
                                    mode="outlined"
                                    style={styles.textInput}
                                    value={zodiac}
                                    placeholder="Tự động tính toán"
                                    left={<TextInput.Icon icon="star-four-points-outline" />}
                                    editable={false}
                                />

                                <Menu
                                    visible={menuVisible}
                                    onDismiss={closeMenu}
                                    anchor={
                                        <TextInput
                                            label="Giới tính"
                                            mode="outlined"
                                            style={styles.textInput}
                                            value={gender}
                                            left={<TextInput.Icon icon="gender-male-female" />}
                                            right={<TextInput.Icon icon="chevron-down" onPress={openMenu} />}
                                            onTouchStart={openMenu}
                                            editable={false}
                                        />
                                    }>
                                    <Menu.Item onPress={() => { setGender("Nam"); closeMenu(); }} title="Nam" />
                                    <Menu.Item onPress={() => { setGender("Nữ"); closeMenu(); }} title="Nữ" />
                                    <Menu.Item onPress={() => { setGender("Khác"); closeMenu(); }} title="Khác" />
                                </Menu>

                                <TextInput
                                    label="Mật khẩu"
                                    autoCapitalize="none"
                                    placeholder="Nhập mật khẩu"
                                    mode="outlined"
                                    style={styles.textInput}
                                    secureTextEntry={secure}
                                    left={<TextInput.Icon icon="lock" />}
                                    right={
                                        <TextInput.Icon
                                            icon={secure ? "eye-off" : "eye"}
                                            onPress={() => setSecure((prev) => !prev)}
                                        />
                                    }
                                    onChangeText={setPassword}
                                    value={password}
                                />

                                <TextInput
                                    label="Xác nhận mật khẩu"
                                    autoCapitalize="none"
                                    placeholder="Nhập lại mật khẩu"
                                    mode="outlined"
                                    style={styles.textInput}
                                    secureTextEntry={secure2}
                                    left={<TextInput.Icon icon="lock" />}
                                    right={
                                        <TextInput.Icon
                                            icon={secure2 ? "eye-off" : "eye"}
                                            onPress={() => setSecure2((prev) => !prev)}
                                        />
                                    }
                                    onChangeText={setConfirmPassword}
                                    value={confirmPassword}
                                />

                                {error && <Text style={styles.errorText}>{error}</Text>}

                                <Text style={styles.text}>
                                    Bằng việc đăng ký, bạn đồng ý với Điều khoản dịch vụ và Chính sách bảo mật của chúng tôi.
                                </Text>

                                <Button mode="contained" style={styles.btnLogin} onPress={handleRegister} loading={submitting} disabled={submitting}>
                                    Đăng ký
                                </Button>

                                <Button
                                    mode="contained"
                                    style={styles.btnFortuneTeller}
                                    onPress={() => router.push("/seer-registration")}
                                    icon={() => <Eye size={18} color={Colors.white} />}
                                >
                                    Đăng ký Nhà tiên tri
                                </Button>
                            </View>
                        )}
                    </ScrollView>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </ImageBackground>
    );
}

const styles = StyleSheet.create({
    header: {
        textAlign: "center",
        fontFamily: "inter",
    },
    header2: {
        textAlign: "center",
        fontWeight: "300",
        fontFamily: "inter",
        color: Colors.gray,
        marginBottom: 20,
    },
    textInput: {
        margin: 5,
    },
    btnLogin: {
        marginTop: 20,
        backgroundColor: Colors.primary,
        borderRadius: 10,
    },
    btnOTP: {
        marginTop: 10,
        backgroundColor: Colors.green,
        borderRadius: 10,
    },
    skipButton: {
        marginTop: 8,
    },
    errorText: {
        marginTop: 8,
        marginBottom: 8,
        color: theme.colors.error,
    },
    text: {
        fontSize: 16,
        fontFamily: "inter",
        marginTop: 8,
    },
    link: {
        fontSize: 16,
        fontFamily: "inter",
        color: Colors.primary,
    },
    btnFortuneTeller: {
        marginTop: 10,
        backgroundColor: Colors.purple,
        borderRadius: 10,
    },
    keyboardAvoidingView: {
        flex: 1,
    },
    SafeAreaView: {
        flex: 1,
        marginHorizontal: 16,
    },
    scrollContent: {
        flexGrow: 1,
        paddingBottom: 40,
    },
    scrollContentCentered: {
        justifyContent: "center",
    },
    flexRowJustifyBetweenItemsCenterMt2: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: 12,
    },
    flexRowItemsCenter: {
        flexDirection: "row",
        alignItems: "center",
    },
});
