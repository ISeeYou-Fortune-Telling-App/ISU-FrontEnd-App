import { theme } from "@/src/constants/theme";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useState } from "react";
import { Alert, KeyboardAvoidingView, StyleSheet, TouchableOpacity, View } from "react-native";
import { Button, Checkbox, SegmentedButtons, Text, TextInput } from 'react-native-paper';
import Colors from "../constants/colors";
import { loginUser, registerUser } from '../services/api';

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
        return "Aquarius";
    }
    if ((month === 2 && day >= 19) || (month === 3 && day <= 20)) {
        return "Pisces";
    }
    if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) {
        return "Aries";
    }
    if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) {
        return "Taurus";
    }
    if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) {
        return "Gemini";
    }
    if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) {
        return "Cancer";
    }
    if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) {
        return "Leo";
    }
    if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) {
        return "Virgo";
    }
    if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) {
        return "Libra";
    }
    if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) {
        return "Scorpio";
    }
    if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) {
        return "Sagittarius";
    }
    return "Capricorn";
};


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
    const [error, setError] = useState<string | null>("");
    const [option, setOption] = useState("login");
    const [secure, setSecure] = useState(true);
    const [secure2, setSecure2] = useState(true);
    const router = useRouter();

    const handleDOBChange = (value: string) => {
        setDOB(value);
        setZodiac(calculateZodiacSign(value));
    };

    const handleLogin = async () => {
        if (!email || !password) {
            setError("Điền hết các trường.");
            return;
        }
        if (password.length < 8) {
            setError("Mật khẩu phải dài ít nhất 8 ký tự.");
            return;
        }
        setError(null);

        router.replace("/(tabs)/home");
        try {
            const res = await loginUser({ email, password });
            if(res.status === 200) {
                const { token, refreshToken, userId, role } = res.data;
                await SecureStore.setItemAsync("authToken", token);
                await SecureStore.setItemAsync("refreshToken", refreshToken);
                router.replace("/(tabs)/home");
            }
            setError("Lỗi khi đăng nhập: " + res.status.toString());
        } catch (error) {
            console.error(error);
        }
    }

    const handleRegister = async () => {
        if (!fullName || !email || !password || !confirmPassword || !phone || !DOB || !gender) {
            setError("Điền hết các trường.");
            return;
        }
        if (password.length < 8) {
            setError("Mật khẩu phải dài ít nhất 8 ký tự.");
            return;
        }
        if(password != confirmPassword) {
            setError("Mật khẩu phải trùng vói nhau.");
            return;
        }
        
            const computedZodiac = calculateZodiacSign(DOB);
            if(!computedZodiac) {
                setError("Ngày sinh không hợp lệ.");
                return
            }

          try {
            const res = await registerUser({ fullName, email, phone, DOB, gender, password, confirmPassword });
            if(res.status === 200) {
                const {statusCode, message} = res.data;
                Alert.alert("Register", `${res.data.statusCode} - ${res.data.message}`);
            }
            setError("Lỗi khi đăng ký: " + res.status.toString());
        } catch (error) {
            console.error(error);
        }  

            setZodiac(computedZodiac);
        setError(null);
    }


    return (
        <KeyboardAvoidingView style={styles.keyboardAvoidingView}>
            <Text style={styles.header} variant="headlineSmall">Chào mừng đến với I See You</Text>
            <Text style={styles.header2} variant="titleSmall">Kết nối với các thầy bói uy tín nhất</Text>

            <SegmentedButtons value={option}
                onValueChange={setOption}
                buttons={[
                    { value: "login", label: "Đăng nhập" },
                    { value: "signup", label: "Đăng ký" },
                ]}
                style={{ marginBottom: 20 }}
            />

            {option === "login" ? (
                <View key={"login"}>
                    <TextInput
                        label="Email"
                        autoCapitalize="none"
                        keyboardType="email-address"
                        placeholder="Nhập email của bạn"
                        mode="outlined"
                        style={styles.TextInput}
                        left={<TextInput.Icon icon="email" />}
                        onChangeText={setEmail}
                    />

                    <TextInput
                        label="Mật khẩu"
                        autoCapitalize="none"
                        placeholder="Nhập mật khẩu của bạn"
                        mode="outlined"
                        style={styles.TextInput}
                        secureTextEntry={secure}
                        left={<TextInput.Icon icon="lock" />}
                        right={
                            <TextInput.Icon
                                icon={secure ? "eye-off" : "eye"}
                                onPress={() => setSecure(!secure)}
                            />}
                        onChangeText={setPassword}
                    />

                    {error && <Text style={{ color: theme.colors.error }}>{error}</Text>}

                    <View style={styles.flexRowJustifyBetweenItemsCenterMt2}>
                        <View style={styles.flexRowItemsCenter}>
                            <Checkbox
                                status={rememberMe ? "checked" : "unchecked"}
                                onPress={() => setRememberMe((prev) => !prev)}
                            />
                            <Text style={styles.text}>Ghi nhớ tôi</Text>
                        </View>

                        <TouchableOpacity onPress={() => router.replace("/password-recovery")}>
                            <Text style={styles.link}>Quên mật khẩu?</Text>
                        </TouchableOpacity>
                    </View>

                    <Button mode="contained" style={styles.btnLogin} onPress={() => {
                        handleLogin();
                    }}>
                        Đăng nhập
                    </Button>
                </View>
            ) : (
                <View key={"register"}>
                    <TextInput
                        label="Họ và tên"
                        placeholder="Nhập họ và tên"
                        mode="outlined"
                        style={styles.TextInput}
                        left={<TextInput.Icon icon="account" />}
                        onChangeText={setFullName}
                    />

                    <TextInput
                        label="Email"
                        autoCapitalize="none"
                        keyboardType="email-address"
                        placeholder="Nhập email của bạn"
                        mode="outlined"
                        style={styles.TextInput}
                        left={<TextInput.Icon icon="email" />}
                        onChangeText={setEmail}
                    />

                    <TextInput
                        label="Số điện thoại"
                        keyboardType="numeric"
                        placeholder="Nhập số điện thoại"
                        mode="outlined"
                        style={styles.TextInput}
                        left={<TextInput.Icon icon="phone" />}
                        onChangeText={setPhone}
                    />

                    <TextInput
                        label="Ngày sinh"
                        placeholder="Nhập ngày sinh của bạn"
                        mode="outlined"
                        style={styles.TextInput}
                        left={<TextInput.Icon icon="calendar" />}
                        onChangeText={handleDOBChange}
                    />

                    <TextInput
                        label="Cung hoàng đạo"
                        mode="outlined"
                        style={styles.TextInput}
                        value={zodiac}
                        placeholder="Tự động tính toán"
                        left={<TextInput.Icon icon="star-four-points-outline" />}
                        editable={false}
                    />

                    <TextInput
                        label="Giới tính"
                        mode="outlined"
                        style={styles.TextInput}
                        left={<TextInput.Icon icon="gender-male-female" />}
                        onChangeText={setGender}
                    />

                    <TextInput
                        label="Mật khẩu"
                        autoCapitalize="none"
                        placeholder="Nhập mật khẩu"
                        mode="outlined"
                        style={styles.TextInput}
                        secureTextEntry={secure}
                        left={<TextInput.Icon icon="lock" />}
                        right={
                            <TextInput.Icon
                                icon={secure ? "eye-off" : "eye"}
                                onPress={() => setSecure(!secure)}
                            />}
                        onChangeText={setPassword}
                    />

                    <TextInput
                        label="Xác nhận mật khẩu"
                        autoCapitalize="none"
                        placeholder="Nhập lại mật khẩu"
                        mode="outlined"
                        style={styles.TextInput}
                        secureTextEntry={secure}
                        left={<TextInput.Icon icon="lock" />}
                        right={
                            <TextInput.Icon
                                icon={secure ? "eye-off" : "eye"}
                                onPress={() => setSecure2(!secure2)}
                            />}
                        onChangeText={setConfirmPassword}
                    />

                    {error && <Text style={{ color: theme.colors.error }}>{error}</Text>}

                    <Text style={styles.text}>Bằng cách đăng ký, bạn đồng ý với Điều khoản dịch vụ và Chính sách bảo mật của chúng tôi.</Text>

                    <Button mode="contained" style={styles.btnLogin} onPress={() => {
                        handleRegister();
                    }}>
                        Đăng ký
                    </Button>
                    <Button 
                        mode="contained" 
                        style={styles.btnFortuneTeller} 
                        onPress={() => router.push("/seer-registration")}
                    >
                        Đăng ký Nhà tiên tri
                    </Button>
                </View>
            )}
        </KeyboardAvoidingView>
    );
}


const styles = StyleSheet.create({
    header: {
        textAlign: "center",
        fontFamily: "inter"
    },
    header2: {
        textAlign: "center",
        fontWeight: "light",
        fontFamily: "inter",
        color: Colors.gray,
        marginBottom: 20
    },
    TextInput: {
        margin: 5,
    },
    btnLogin: {
        marginTop: 20,
        backgroundColor: Colors.primary,
        borderRadius: 10
    },
    text: {
        fontSize: 16,
        fontFamily: "inter"
    },
    link: {
        fontSize: 16,
        fontFamily: "inter",
        color: Colors.primary
    },
    btnFortuneTeller: {
        marginTop: 10,
        backgroundColor: Colors.purple,
        borderRadius: 10
    },
    keyboardAvoidingView: {
        justifyContent: "center", // justify-center
        flex: 1,                  // flex-1
        marginHorizontal: 16      // mx-4
    },
    flexRowJustifyBetweenItemsCenterMt2: {
        flexDirection: "row",     // flex-row
        justifyContent: "space-between", // justify-between
        alignItems: "center",     // items-center
        marginTop: 8              // mt-2
    },
    flexRowItemsCenter: {
        flexDirection: "row",     // flex-row
        alignItems: "center"      // items-center
    }
})
