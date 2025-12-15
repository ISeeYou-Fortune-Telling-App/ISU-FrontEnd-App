import Colors from "@/src/constants/colors";
import { logoutUser } from "@/src/services/api";
import { logoutCometChatUser } from "@/src/services/cometchat";
import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Animated, Modal, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

type SettingAction = "PASSWORD" | "DELETE_ACCOUNT" | "LOGOUT" | "PROFILE" | "IMAGE" | "MANAGE_CERTIFICATE";

export default function SettingScreen() {
    const [role, setRole] = useState<string | null>(null);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const scaleAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        SecureStore.getItemAsync("userRole").then(setRole);
    }, []);

    const handlePress = (action: SettingAction) => {
        switch (action) {
            case "PROFILE":
                router.push("/edit-profile");
                break;
            case "IMAGE":
                router.push("/edit-profile-images");
                break;
            case "MANAGE_CERTIFICATE":
                router.push("/manage-certificate");
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
                                setIsLoggingOut(true);
                                try {
                                    const demo = await SecureStore.getItemAsync("userId");
                                    if (demo && demo != "demo-user") {
                                        const fcmToken = await SecureStore.getItemAsync("fcmToken") || "";
                                        await logoutUser(fcmToken);
                                        logoutCometChatUser();
                                    }
                                    await SecureStore.deleteItemAsync("authToken");
                                    await SecureStore.deleteItemAsync("refreshToken");
                                    await SecureStore.deleteItemAsync("userRole");
                                    await SecureStore.deleteItemAsync("userId");
                                    await SecureStore.deleteItemAsync("cometChatUid");

                                    setShowSuccess(true);
                                    Animated.spring(scaleAnim, {
                                        toValue: 1,
                                        friction: 6,
                                        useNativeDriver: true,
                                    }).start();

                                    setTimeout(() => {
                                        Animated.timing(scaleAnim, {
                                            toValue: 0,
                                            duration: 200,
                                            useNativeDriver: true,
                                        }).start(() => {
                                            setIsLoggingOut(false);
                                            setShowSuccess(false);
                                            router.dismissAll();
                                            router.replace("/auth");
                                        });
                                    }, 1500);
                                } catch (err) {
                                    setIsLoggingOut(false);
                                    Alert.alert("Lỗi", "Không thể đăng xuất. Vui lòng thử lại.");
                                }
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
                    <Text style={styles.cardSubtitle}>Tên, ngày sinh, giới tính, v.v.</Text>
                </TouchableOpacity>

                <TouchableOpacity activeOpacity={0.7} style={styles.card} onPress={() => handlePress("IMAGE")}>
                    <Text style={styles.cardTitle}>Thay đổi ảnh</Text>
                    <Text style={styles.cardSubtitle}>Ảnh đại diện, ảnh nền.</Text>
                </TouchableOpacity>

                {role === "SEER" && (
                    <TouchableOpacity activeOpacity={0.7} style={styles.card} onPress={() => handlePress("MANAGE_CERTIFICATE")}>
                        <Text style={styles.cardTitle}>Quản lý chứng chỉ</Text>
                        <Text style={styles.cardSubtitle}>Thêm, chỉnh sửa hoặc xóa chứng chỉ của bạn.</Text>
                    </TouchableOpacity>
                )}

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

            <Modal visible={isLoggingOut} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    {!showSuccess ? (
                        <View style={styles.modalBox}>
                            <ActivityIndicator size="large" color={Colors.primary || "#1877F2"} />
                            <Text style={styles.modalText}>Đang đăng xuất...</Text>
                        </View>
                    ) : (
                        <Animated.View style={[styles.successBox, { transform: [{ scale: scaleAnim }] }]}>
                            <MaterialIcons name="check-circle" size={70} color="#16a34a" />
                            <Text style={styles.successText}>Đăng xuất thành công!</Text>
                        </Animated.View>
                    )}
                </View>
            </Modal>
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
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.4)",
        justifyContent: "center",
        alignItems: "center",
    },
    modalBox: {
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 24,
        alignItems: "center",
        justifyContent: "center",
        width: 220,
    },
    modalText: {
        marginTop: 12,
        color: "#000",
        fontWeight: "600",
        textAlign: "center",
    },
    successBox: {
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 24,
        alignItems: "center",
        justifyContent: "center",
    },
    successText: {
        marginTop: 8,
        color: "#16a34a",
        fontWeight: "bold",
        fontSize: 18,
    },
});
