import Colors from "@/src/constants/colors";
import { getProfile, uploadAvatar, uploadCover } from "@/src/services/api";
import { MaterialIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
    Alert,
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from "react-native";
import { ActivityIndicator, Button, Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

export default function EditProfileImagesScreen() {
    const [loading, setLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [avatarUrl, setAvatarUrl] = useState<string>("");
    const [coverUrl, setCoverUrl] = useState<string>("");

    const [newAvatar, setNewAvatar] = useState<ImagePicker.ImagePickerAsset | null>(null);
    const [newCover, setNewCover] = useState<ImagePicker.ImagePickerAsset | null>(null);

    const [avatarError, setAvatarError] = useState(false);
    const [coverError, setCoverError] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await getProfile();
            const payload = res?.data?.data ?? res?.data ?? null;
            if (payload) {
                setAvatarUrl(payload.avatarUrl ?? "");
                setCoverUrl(payload.coverUrl ?? "");
            }
        } catch (err) {
            console.error("Failed to load profile:", err);
            Alert.alert("Lỗi", "Không thể tải thông tin người dùng");
        } finally {
            setLoading(false);
        }
    };

    const pickImage = async (type: "avatar" | "cover") => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: type === "avatar" ? [1, 1] : [16, 9], 
                quality: 0.8,
            });

            if (!result.canceled) {
                if (type === "avatar") {
                    setNewAvatar(result.assets[0]);
                    setAvatarError(false); 
                } else {
                    setNewCover(result.assets[0]);
                    setCoverError(false);
                }
            }
        } catch (error) {
            Alert.alert("Lỗi", "Không thể mở thư viện ảnh.");
        }
    };

    const handleSave = () => {
        if (!newAvatar && !newCover) {
            Alert.alert("Thông báo", "Bạn chưa thay đổi ảnh nào.");
            return;
        }

        Alert.alert("Cập nhật", "Bạn có chắc chắn muốn lưu thay đổi?", [
            { text: "Huỷ", style: "cancel" },
            {
                text: "Lưu",
                style: "default",
                onPress: async () => {
                    setIsSubmitting(true);
                    try {
                        const promises = [];
                        if (newAvatar) {
                            const fileName = newAvatar.fileName || newAvatar.uri.split("/").pop() || `avatar_${Date.now()}.jpg`;
                            const match = /\.(\w+)$/.exec(fileName);
                            const type = match ? `image/${match[1]}` : "image/jpeg";
                            
                            const formData = new FormData();
                            // @ts-ignore: React Native FormData specific handling
                            formData.append("avatar", {
                                uri: newAvatar.uri,
                                name: fileName,
                                type: type,
                            });
                            promises.push(uploadAvatar(formData));
                        }

                        if (newCover) {
                            const fileName = newCover.fileName || newCover.uri.split("/").pop() || `cover_${Date.now()}.jpg`;
                            const match = /\.(\w+)$/.exec(fileName);
                            const type = match ? `image/${match[1]}` : "image/jpeg";
                            
                            console.log("Cover upload data:", { uri: newCover.uri, name: fileName, type });
                            
                            const formData = new FormData();
                            // @ts-ignore
                            formData.append("cover", {
                                uri: newCover.uri,
                                name: fileName,
                                type: type,
                            });
                            promises.push(uploadCover(formData));
                        }

                        await Promise.all(promises);
                        
                        Alert.alert("Thành công", "Cập nhật ảnh thành công!", [
                            { text: "OK", onPress: () => router.back() }
                        ]);
                    } catch (err: any) {
                        console.error(err.response?.data);
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
                            Thay đổi ảnh
                        </Text>
                    </View>
                    <View style={styles.headerPlaceholder} />
                </View>

                <ScrollView
                    style={styles.content}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    {/* --- PHẦN ẢNH ĐẠI DIỆN --- */}
                    <View style={styles.sectionContainer}>
                        <Text style={styles.sectionTitle}>Ảnh đại diện</Text>
                        <View style={styles.avatarWrapper}>
                            <TouchableOpacity onPress={() => pickImage("avatar")}>
                                <Image
                                    source={
                                        newAvatar 
                                            ? { uri: newAvatar.uri }
                                            : (!avatarUrl || avatarError)
                                                ? require("@/assets/images/user-placeholder.png") 
                                                : { uri: avatarUrl }
                                    }
                                    style={styles.avatarImage}
                                    onError={() => setAvatarError(true)}
                                />
                                <View style={styles.editIconBadge}>
                                    <MaterialIcons name="camera-alt" size={20} color="white" />
                                </View>
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.helperText}>Chạm vào ảnh để thay đổi</Text>
                    </View>

                    {/* --- PHẦN ẢNH BÌA --- */}
                    <View style={styles.sectionContainer}>
                        <Text style={styles.sectionTitle}>Ảnh bìa</Text>
                        <TouchableOpacity 
                            style={styles.coverWrapper} 
                            onPress={() => pickImage("cover")}
                        >
                            <Image
                                source={
                                    newCover
                                        ? { uri: newCover.uri }
                                        : (!coverUrl || coverError)
                                            ? require("@/assets/images/placeholder.png") 
                                            : { uri: coverUrl }
                                }
                                style={styles.coverImage}
                                resizeMode="cover"
                                onError={() => setCoverError(true)}
                            />
                            <View style={styles.coverOverlay}>
                                <MaterialIcons name="edit" size={24} color="white" />
                                <Text style={{color: 'white', marginLeft: 8, fontWeight: 'bold'}}>Thay đổi ảnh bìa</Text>
                            </View>
                        </TouchableOpacity>
                    </View>

                    <Button 
                        mode="contained" 
                        style={styles.btnSave} 
                        onPress={handleSave}
                        disabled={!newAvatar && !newCover} 
                    >
                        Lưu thay đổi
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
    sectionContainer: {
        backgroundColor: Colors.white,
        padding: 20,
        marginBottom: 10,
        alignItems: 'center',
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: Colors.gray,
        alignSelf: 'flex-start',
        marginBottom: 15,
    },
    avatarWrapper: {
        position: 'relative',
        marginBottom: 10,
    },
    avatarImage: {
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 3,
        borderColor: Colors.borderGray,
        backgroundColor: '#f0f0f0',
    },
    editIconBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: Colors.primary,
        padding: 8,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: Colors.white,
    },
    coverWrapper: {
        width: '100%',
        height: 180,
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: '#f0f0f0',
        position: 'relative',
    },
    coverImage: {
        width: '100%',
        height: '100%',
    },
    coverOverlay: {
        position: 'absolute',
        bottom: 10,
        right: 10,
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        flexDirection: 'row',
        alignItems: 'center',
    },
    helperText: {
        color: Colors.gray,
        fontSize: 12,
        marginTop: 5,
    },
    btnSave: {
        margin: 20,
        backgroundColor: Colors.primary,
        borderRadius: 10,
        paddingVertical: 4,
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