import { useFonts } from "expo-font";
import { useState } from "react";
import { KeyboardAvoidingView, StyleSheet, View } from "react-native";
import { Button, SegmentedButtons, Text, TextInput } from 'react-native-paper';
import Colors from "../constants/colors";

export default function AuthScreen() {
    const [isSignUp, setIsSignUp] = useState<boolean>(false);
    const [email, setEmail] = useState<string>("");
    const [password, setPassword] = useState<string>("");
    const [confirmPassword, setConfirmPassword] = useState<string>("");
    const [fullName, setFullName] = useState<string>("");
    const [phone, setPhone] = useState<string>("");
    const [DOB, setDOB] = useState<string>("");
    const [gender, setGender] = useState<string>("");
    const [error, setError] = useState<string | null>("");
    const [option, setOption] = useState("login");
    const [secure, setSecure] = useState(true);
    const [secure2, setSecure2] = useState(true);
    const [fontsLoaded] = useFonts({
        "inter": require("../assets/fonts/Inter-VariableFont_opsz,wght.ttf")
    });

    return (
        <KeyboardAvoidingView style={styles.container}>
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
                <View>
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

                    <Button mode="contained" style={styles.btnLogin}>
                        Đăng nhập
                    </Button>
                </View>
            ) : (
                <View>
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
                        onChangeText={setDOB}
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

                    <Button mode="contained" style={styles.btnLogin}>
                        Đăng ký
                    </Button>
                </View>
            )}
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        justifyContent: "center",
        flex: 1,
        marginHorizontal: 10
    },
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
        marginTop: 5,
    },
    btnLogin: {
        marginTop: 20,
        backgroundColor: Colors.primary,
        borderRadius: 10
    }
})