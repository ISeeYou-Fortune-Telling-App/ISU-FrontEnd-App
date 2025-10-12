import { theme } from "@/src/constants/theme";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { Eye } from "lucide-react-native";
import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, TouchableOpacity, View } from "react-native";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { Button, Checkbox, Menu, SegmentedButtons, Text, TextInput } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import Colors from "../constants/colors";

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
    const [zodiac, setZodiac] = useState<string>("");
    const [gender, setGender] = useState<string>("");
    const [error, setError] = useState<string | null>(null);
    const [option, setOption] = useState<AuthOption>("login");
    const [secure, setSecure] = useState(true);
    const [secure2, setSecure2] = useState(true);
    const router = useRouter();
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [menuVisible, setMenuVisible] = useState<boolean>(false);

    const openMenu = () => setMenuVisible(true);
    const closeMenu = () => setMenuVisible(false);

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
            await SecureStore.setItemAsync("authToken", "demo-token");
            await SecureStore.setItemAsync("refreshToken", "demo-refresh-token");
            await SecureStore.setItemAsync("userRole", "CUSTOMER");
            await SecureStore.setItemAsync("userId", "demo-user");
        } catch (err) {
            console.error("Không thể lưu thông tin phiên đăng nhập mẫu", err);
        }

        router.replace("/(tabs)/home");
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

        setZodiac(computedZodiac);
        setError(null);

        Alert.alert("Đăng ký thành công", "Bạn có thể đăng nhập ngay bây giờ.", [
            {
                text: "Đăng nhập",
                onPress: () => setOption("login"),
            },
        ]);
    };

    const formatDate = (date: Date) => {
        const day = date.getDate().toString().padStart(2, "0");
        const month = (date.getMonth() + 1).toString().padStart(2, "0");
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    };

    const handleConfirmDate = (date: Date) => {
        setDOB(formatDate(date));
        handleDOBChange(formatDate(date));
        setShowDatePicker(false);
    };

    return (
        <SafeAreaView style={styles.SafeAreaView}>
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={styles.keyboardAvoidingView}>
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

                            <TouchableOpacity onPress={() => router.push("/password-recovery")}>
                                <Text style={styles.link}>Quên mật khẩu?</Text>
                            </TouchableOpacity>
                        </View>

                        <Button mode="contained" style={styles.btnLogin} onPress={handleLogin}>
                            Đăng nhập
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

                        <Button mode="contained" style={styles.btnLogin} onPress={handleRegister}>
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
            </KeyboardAvoidingView>
        </SafeAreaView>
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
        justifyContent: "center",
    },
    SafeAreaView: {
        flex: 1,
        marginHorizontal: 16,
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
