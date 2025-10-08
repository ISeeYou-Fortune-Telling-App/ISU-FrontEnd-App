import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { Alert, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import Colors from "../constants/colors";

type SettingAction = "PROFILE" | "PASSWORD" | "DELETE_ACCOUNT" | "LOGOUT";

export default function SettingScreen() {
    const handlePress = (action: SettingAction) => {
        switch (action) {
            case "PROFILE":
                Alert.alert("Sắp ra mắt", "Tính năng cập nhật thông tin cá nhân sẽ sớm khả dụng.");
                break;
            case "PASSWORD":
                Alert.alert("Sắp ra mắt", "Tính năng đổi mật khẩu sẽ sớm khả dụng.");
                break;
            case "DELETE_ACCOUNT":
                router.push("/delete-account");
                break;
            case "LOGOUT":
                Alert.alert(
                    "Đăng xuất",
                    "Bạn có chắc chắn muốn đăng xuất khỏi ứng dụng?",
                    [
                        { text: "Huỷ", style: "cancel" },
                        {
                            text: "Đăng xuất",
                            style: "destructive",
                            onPress: async () => {
                                await SecureStore.deleteItemAsync("authToken");
                                await SecureStore.deleteItemAsync("refreshToken");
                                await SecureStore.deleteItemAsync("userRole");
                                await SecureStore.deleteItemAsync("userId");
                                router.replace("/auth");
                            },
                        },
                    ],
                );
                break;
            default:
                break;
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <MaterialIcons name="arrow-back" size={28} color={Colors.black} onPress={() => router.back()} />
                <View style={styles.titleContainer}>
                    <Text variant="titleLarge" style={styles.title}>Cài đặt</Text>
                </View>
                <View style={styles.headerPlaceholder} />
            </View>

            <ScrollView
                style={styles.content}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                <TouchableOpacity activeOpacity={0.7} style={styles.card} onPress={() => handlePress("PROFILE")}>
                    <Text style={styles.cardTitle}>Thay đổi thông tin cá nhân</Text>
                    <Text style={styles.cardSubtitle}>Tên, ngày sinh, ảnh đại diện, v.v.</Text>
                </TouchableOpacity>

                <TouchableOpacity activeOpacity={0.7} style={styles.card} onPress={() => handlePress("PASSWORD")}>
                    <Text style={styles.cardTitle}>Đổi mật khẩu</Text>
                    <Text style={styles.cardSubtitle}>Tăng cường bảo mật cho tài khoản của bạn.</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    activeOpacity={0.7}
                    style={styles.card}
                    onPress={() => handlePress("DELETE_ACCOUNT")}
                >
                    <Text style={styles.cardTitleDanger}>Xoá tài khoản</Text>
                    <Text style={styles.cardSubtitle}>Thao tác này là vĩnh viễn, hãy cân nhắc cẩn thận.</Text>
                </TouchableOpacity>

                <TouchableOpacity activeOpacity={0.7} style={styles.card} onPress={() => handlePress("LOGOUT")}>
                    <Text style={styles.cardTitle}>Đăng xuất</Text>
                    <Text style={styles.cardSubtitle}>Thoát khỏi ứng dụng và quay lại màn hình đăng nhập.</Text>
                </TouchableOpacity>
            </ScrollView>
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
        color: Colors.black,
    },
    headerPlaceholder: {
        width: 28,
        height: 28,
    },
    content: {
        flex: 1,
    },
    card: {
        backgroundColor: Colors.white,
        paddingHorizontal: 16,
        paddingVertical: 18,
        borderBottomWidth: 1,
        borderBottomColor: Colors.borderGray,
    },
    cardTitle: {
        fontSize: 18,
        fontFamily: "inter",
        color: Colors.black,
        marginBottom: 6,
    },
    cardTitleDanger: {
        fontSize: 18,
        fontFamily: "inter",
        color: "#ef4444",
        marginBottom: 6,
    },
    cardSubtitle: {
        fontSize: 14,
        fontFamily: "segoeui",
        color: Colors.gray,
    },
});
