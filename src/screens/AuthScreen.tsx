import Colors from "@/src/constants/colors";
import { theme } from "@/src/constants/theme";
import { loginUser, registerUser } from "@/src/services/api";
import { bootstrapCometChatUser } from "@/src/services/cometchatBootstrap";
import { runRealtimeSelfCheck } from "@/src/services/diagnostics";
import { CometChat } from "@cometchat/chat-sdk-react-native";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { ChevronDown, ChevronUp, Eye } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Alert, ImageBackground, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { Button, Checkbox, SegmentedButtons, Text, TextInput } from "react-native-paper";
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
    const [genderDropdownOpen, setGenderDropdownOpen] = useState<boolean>(false);
    const [genderSelectorLayout, setGenderSelectorLayout] = useState({ y: 0, height: 0 });

    useEffect(() => {
        (async () => {
            try {
                const savedEmail = await SecureStore.getItemAsync("savedEmail");
                const savedPassword = await SecureStore.getItemAsync("savedPassword");
                if (savedEmail && savedPassword) {
                    setEmail(savedEmail);
                    setPassword(savedPassword);
                    setRememberMe(true);
                    return;
                }

                const presetEmail = process.env.EXPO_PUBLIC_DEMO_EMAIL;
                const presetPassword = process.env.EXPO_PUBLIC_DEMO_PASSWORD;

                if (presetEmail) {
                    setEmail(presetEmail);
                }
                if (presetPassword) {
                    setPassword(presetPassword);
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
            const fcmToken = await SecureStore.getItemAsync("fcmToken");
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

            const { token, refreshToken, userId, role, cometChatUid, cometChatAuthToken } = response.data.data;

            const effectiveCometChatUid = cometChatUid || userId;

            console.log("[Auth] Login successful", { userId, role, effectiveCometChatUid });

            await SecureStore.setItemAsync("authToken", token);
            await SecureStore.setItemAsync("refreshToken", refreshToken);
            await SecureStore.setItemAsync("userId", userId);
            await SecureStore.setItemAsync("userRole", role);

            if (effectiveCometChatUid) {
                await SecureStore.setItemAsync("cometChatUid", effectiveCometChatUid);
                if (cometChatAuthToken) {
                    await SecureStore.setItemAsync("cometAuthToken", cometChatAuthToken);
                }

                console.log("[Auth] Logging into CometChat with uid", effectiveCometChatUid);
                bootstrapCometChatUser({ forceRelogin: false })
                    .then(async () => {
                        const loggedUser = await CometChat.getLoggedinUser().catch(() => null);
                        console.log("[Auth] CometChat login result:", loggedUser?.getUid?.() ?? "none");
                        return runRealtimeSelfCheck({ waitForLogin: true, label: "HealthCheck:Auth" });
                    })
                    .catch((error) => {
                        console.warn("Không thể đăng nhập CometChat", {
                            code: (error as any)?.code,
                            name: (error as any)?.name,
                            message: (error as any)?.message,
                        });
                    })
                    .catch((error) => {
                        console.warn("HealthCheck after login failed", error);
                    });
            } else {
                await SecureStore.deleteItemAsync("cometChatUid");
                console.warn("Login payload thiếu CometChat UID và userId");
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

            if ((err?.response?.status === 403 || err?.response?.data?.statusCode === 403) &&
                err?.response?.data?.message?.includes("Email chưa được xác thực")) {
                console.log("Navigating to OTP screen with email:", email);
                router.push({
                    pathname: "/otp-verification",
                    params: { email: email }
                });
                return;
            }

            if (err?.response?.status === 401) {
                setError("Sai tài khoản/mật khẩu hoặc tài khoản chưa được cấp. Vui lòng kiểm tra lại.");
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
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setError("Email không hợp lệ.");
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
                    onPress: () => router.push({ pathname: "/otp-verification", params: { email: email } })
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
                    keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}>
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
                                    maxLength={100}
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
                                
                                {/*<Button mode="text" style={styles.skipButton} onPress={handleSkipLogin} disabled={submitting}>
                                    Bỏ qua (demo)
                                </Button> */}

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
                                    maxLength={100}
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
                                    maxLength={100}
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
                                    maxLength={11}
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

                                <View>
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
    label: {
        fontSize: 13,
        color: "#374151",
        marginTop: 8,
        marginBottom: 4,
        marginLeft: 5,
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
        backgroundColor: Colors.white,
        margin: 5,
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
        backgroundColor: Colors.white,
        marginHorizontal: 5,
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
