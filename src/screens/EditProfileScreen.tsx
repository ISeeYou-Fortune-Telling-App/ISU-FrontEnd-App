import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { ActivityIndicator, Button, Menu, Text, TextInput } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import Colors from "../constants/colors";
import { updateProfile } from "../services/api";

export default function EditProfileScreen() {
    const [loading, setLoading] = useState(false); // change later to 'true'
    const [showDatePicker, setShowDatePicker] = useState(false);

    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [gender, setGender] = useState("");
    const [fullName, setFullName] = useState("");
    const [dob, setDob] = useState("");
    const [description, setDescription] = useState("");
    const [menuVisible, setMenuVisible] = useState<boolean>(false);

    const openMenu = () => setMenuVisible(true);
    const closeMenu = () => setMenuVisible(false);

    // đừng có xoá
    //   useEffect(() => {
    //     const fetchProfile = async () => {
    //       try {
    //         const res = await getProfile();
    //         const data = res.data;

    //         setEmail(data.email || "");
    //         setPhone(data.phone || "");
    //         setGender(data.gender || "");
    //         setFullName(data.fullName || "");
    //         setDob(data.birthDate ? data.birthDate.split("T")[0] : "");
    //         setDescription(data.profileDescription || "");
    //       } catch (err: any) {
    //         console.error("Error fetching profile:", err);
    //         Alert.alert("Lỗi", "Không thể tải thông tin người dùng");
    //       } finally {
    //         setLoading(false);
    //       }
    //     };

    //     fetchProfile();
    //   }, []);

    const formatDate = (date: Date) => {
        const day = date.getDate().toString().padStart(2, "0");
        const month = (date.getMonth() + 1).toString().padStart(2, "0");
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    };

    const handleConfirmDate = (date: Date) => {
        setDob(formatDate(date));
        setShowDatePicker(false);
    };

    const handleSave = () => {
        Alert.alert("Cập nhật", "Bạn có chắc chắn muốn thay đổi thông tin?", [
            { text: "Huỷ", style: "cancel" },
            {
                text: "Lưu",
                style: "default",
                onPress: async () => {
                    try {
                        const payload = {
                            email,
                            phone,
                            gender,
                            fullName,
                            birthDate: dob ? new Date(dob).toISOString() : null,
                            profileDescription: description,
                        };

                        const res = await updateProfile(payload);
                        console.log("Updated user:", res.data);

                        Alert.alert("Đã lưu thông tin", "Thông tin của bạn đã được lưu thành công.", [
                            { text: "Đồng ý", onPress: () => router.back() },
                        ]);
                    } catch (err: any) {
                        console.error(err);
                        Alert.alert("Lỗi", err.response?.data?.message || "Có lỗi xảy ra khi cập nhật.");
                    }
                },
            },
        ]);
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <ActivityIndicator size="large" color={Colors.primary} style={{ flex: 1 }} />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={{ flex: 1 }}
            >
                <View style={styles.header}>
                    <MaterialIcons name="arrow-back" size={28} color={Colors.black} onPress={() => router.back()} />
                    <View style={styles.titleContainer}>
                        <Text variant="titleLarge" style={styles.title}>
                            Thay đổi thông tin
                        </Text>
                    </View>
                    <View style={styles.headerPlaceholder} />
                </View>

                <ScrollView
                    style={styles.content}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Tên</Text>
                        <TextInput mode="outlined" onChangeText={setFullName} value={fullName} left={<TextInput.Icon icon="account" />} />
                    </View>

                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Ngày sinh</Text>
                        <TouchableOpacity onPress={() => setShowDatePicker(true)}>
                            <TextInput
                                mode="outlined"
                                value={dob}
                                editable={false}
                                pointerEvents="none"
                                left={<TextInput.Icon icon="calendar" />}
                            />
                        </TouchableOpacity>
                    </View>

                    <DateTimePickerModal
                        isVisible={showDatePicker}
                        mode="date"
                        onConfirm={handleConfirmDate}
                        onCancel={() => setShowDatePicker(false)}
                    />

                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Giới tính</Text>
                        <Menu
                            visible={menuVisible}
                            onDismiss={closeMenu}
                            anchor={
                                <TextInput
                                    mode="outlined"
                                    value={gender}
                                    left={<TextInput.Icon icon="gender-male-female" />}
                                    right={<TextInput.Icon icon="chevron-down" onPress={openMenu} />}
                                    onTouchStart={openMenu}
                                    editable={false}
                                />
                            }
                        >
                            <Menu.Item onPress={() => { setGender("Nam"); closeMenu(); }} title="Nam" />
                            <Menu.Item onPress={() => { setGender("Nữ"); closeMenu(); }} title="Nữ" />
                            <Menu.Item onPress={() => { setGender("Khác"); closeMenu(); }} title="Khác" />
                        </Menu>
                    </View>

                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Số điện thoại</Text>
                        <TextInput mode="outlined" onChangeText={setPhone} value={phone} keyboardType="numeric" left={<TextInput.Icon icon="phone" />} />
                    </View>

                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Email</Text>
                        <TextInput mode="outlined" onChangeText={setEmail} value={email} keyboardType="email-address" left={<TextInput.Icon icon="email" />} />
                    </View>

                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Mô tả</Text>
                        <TextInput mode="outlined" onChangeText={setDescription} value={description} multiline numberOfLines={5} left={<TextInput.Icon icon="file-document-edit" />} />
                    </View>

                    <Button mode="contained" style={styles.btnLogin} onPress={handleSave}>
                        Lưu
                    </Button>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

{/* <TouchableOpacity activeOpacity={0.7} style={styles.card} >
                    <Text style={styles.cardTitle}>Ảnh đại diện</Text>
                </TouchableOpacity>

                <TouchableOpacity activeOpacity={0.7} style={styles.card} >
                    <Text style={styles.cardTitle}>Hình nền</Text>
                </TouchableOpacity> */}

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
    btnLogin: {
        margin: 10,
        backgroundColor: Colors.primary,
        borderRadius: 10,
    },
});
