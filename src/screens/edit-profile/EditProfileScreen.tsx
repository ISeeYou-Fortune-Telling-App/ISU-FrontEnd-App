import Colors from "@/src/constants/colors";
import { getProfile, updateProfile } from "@/src/services/api";
import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { ChevronDown, ChevronUp } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { ActivityIndicator, Button, Text, TextInput } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

export default function EditProfileScreen() {
    const [loading, setLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);

    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [gender, setGender] = useState("");
    const [fullName, setFullName] = useState("");
    const [dob, setDob] = useState("");
    const [realDob, setRealDob] = useState("");
    const [description, setDescription] = useState("");
    const [genderDropdownOpen, setGenderDropdownOpen] = useState<boolean>(false);
    const [genderSelectorLayout, setGenderSelectorLayout] = useState({ y: 0, height: 0 });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await getProfile();
            const payload = res?.data?.data ?? res?.data ?? null;
            if (payload) {
                setFullName(payload.fullName);
                setDescription(payload.profileDescription);
                if (payload.birthDate) {
                    setRealDob(payload.birthDate);
                    const d = new Date(payload.birthDate);
                    const day = String(d.getDate()).padStart(2, "0");
                    const month = String(d.getMonth() + 1).padStart(2, "0");
                    const year = d.getFullYear();
                    setDob(`${day}/${month}/${year}`);
                }
                setGender(payload.gender);
                setPhone(payload.phone);
                setEmail(payload.email);
            }
        } catch (err) {
            console.error("Failed to load profile:", err);
            Alert.alert("Lỗi", "Không thể tải thông tin người dùng");
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (date: Date) => {
        const day = date.getDate().toString().padStart(2, "0");
        const month = (date.getMonth() + 1).toString().padStart(2, "0");
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    };

    const handleConfirmDate = (date: Date) => {
        setRealDob(date.toISOString());
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
                    setIsSubmitting(true);
                    try {
                        const payload = {
                            email,
                            phone,
                            gender,
                            fullName,
                            birthDate: realDob,
                            profileDescription: description,
                        };

                        const res = await updateProfile(payload);
                        // Persist returned user id so other screens can use it
                        const returned = res?.data?.data ?? res?.data ?? null;
                        if (returned?.id) {
                            await SecureStore.setItemAsync("userId", returned.id);
                        }

                        Alert.alert("Đã lưu thông tin", "Thông tin của bạn đã được lưu thành công.", [
                            { text: "Đồng ý", onPress: () => router.replace('/(tabs)/profile') },
                        ]);
                    } catch (err: any) {
                        console.error(err);
                        Alert.alert("Lỗi", err.response?.data?.message || "Có lỗi xảy ra khi cập nhật.");
                    } finally {
                        setIsSubmitting(false);
                    }
                },
            },
        ]);
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <Modal visible={loading} transparent animationType="fade">
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalBox}>
                            <ActivityIndicator size="large" color={Colors.primary || "#1877F2"} />
                            <Text style={styles.modalText}>Đang tải...</Text>
                        </View>
                    </View>
                </Modal>
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
                        <TextInput mode="outlined" onChangeText={setFullName} value={fullName} left={<TextInput.Icon icon="account" />} maxLength={100}/>
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
                        maximumDate={new Date()}
                    />

                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Giới tính</Text>
                        <View style={styles.genderContainer}>
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
                    </View>

                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Số điện thoại</Text>
                        <TextInput mode="outlined" onChangeText={setPhone} value={phone} keyboardType="numeric" left={<TextInput.Icon icon="phone" />} maxLength={11}/>
                    </View>

                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Email</Text>
                        <TextInput mode="outlined" onChangeText={setEmail} value={email} keyboardType="email-address" left={<TextInput.Icon icon="email" />} maxLength={100}/>
                    </View>

                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Mô tả</Text>
                        <TextInput mode="outlined" onChangeText={setDescription} value={description} multiline numberOfLines={5} left={<TextInput.Icon icon="file-document-edit" />} maxLength={1000}/>
                    </View>

                    <Button mode="contained" style={styles.btnLogin} onPress={handleSave}>
                        Lưu
                    </Button>
                </ScrollView>
            </KeyboardAvoidingView>
            
            <Modal visible={isSubmitting} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalBox}>
                        <ActivityIndicator size="large" color={Colors.primary || "#1877F2"} />
                        <Text style={styles.modalText}>Đang lưu...</Text>
                    </View>
                </View>
            </Modal>
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
    genderContainer: {
        position: 'relative',
        width: '100%',
        zIndex: 1000,
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
});
