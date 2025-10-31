import Colors from "@/src/constants/colors";
import { MaterialIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, Image, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { Text, TextInput } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { updateServicePackage } from "../../services/api";

type UpdateProps = {
    packageId?: string;
    packageTitle?: string;
    packageContent?: string;
    packagePrice?: string;
    packageDuration?: string;
    packageImage?: ImagePicker.ImagePickerAsset;
};

export default function UpdatePackageScreen({ packageId, packageTitle, packageContent, packagePrice, packageDuration, packageImage }: UpdateProps) {
    const [title, setTitle] = useState(packageTitle);
    const [price, setPrice] = useState(packagePrice);
    const [content, setContent] = useState(packageContent);
    const [durationMinutes, setDurationMinutes] = useState(packageDuration);
    const [image, setImage] = useState(packageImage);

    const seerId = "da237dc0-584b-4a03-b343-efeaa0c3e867";

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.7,
        });
        if (!result.canceled) {
            setImage(result.assets[0]);
        }
    };

    const handleSubmit = async () => {
        if (!title || !content || !price || !durationMinutes) {
            Alert.alert("Lỗi", "Vui lòng nhập đầy đủ thông tin");
            return;
        }

        const formData = new FormData();
        formData.append("seerId", seerId);
        formData.append("packageTitle", title);
        formData.append("packageContent", content);
        formData.append("durationMinutes", durationMinutes.toString());
        formData.append("price", price);

        if (image) {
            formData.append("image", {
                uri: image.uri,
                type: "image/jpeg",
                name: "upload.jpg",
            } as any);
        }

        try {
            await updateServicePackage(packageId, seerId, formData);
            Alert.alert("Thành công", "Cập nhật gói dịch vụ thành công!");
        } catch (err) {
            console.error(err);
            Alert.alert("Lỗi", "Không thể cập nhật gói dịch vụ. Hãy thử lại sau.");
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <MaterialIcons name="arrow-back" size={28} color="black" onPress={() => router.back()} />
                <View style={styles.titleContainer}>
                    <Text variant="titleLarge" style={styles.title}>Cập nhật gói</Text>
                </View>
                <View style={{ width: 28 }} />
            </View>
            <ScrollView
                style={styles.content}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}>

                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Thông tin gói</Text>
                    <TextInput
                        placeholder="Tên gói"
                        mode="outlined"
                        style={styles.input}
                        left={<TextInput.Icon icon="certificate" />}
                        onChangeText={setTitle}
                        value={title}
                    />

                    <TextInput
                        mode="outlined"
                        style={styles.input}
                        left={<TextInput.Icon icon="cash" />}
                        placeholder="Giá gói (VND)"
                        value={price}
                        onChangeText={setPrice}
                        keyboardType="numeric"
                    />

                    <TextInput
                        mode="outlined"
                        left={<TextInput.Icon icon="file-document-edit" />}
                        onChangeText={setContent}
                        value={content}
                        style={[styles.input]}
                        label="Mô tả ngắn"
                        multiline
                        numberOfLines={5}
                    />

                    <TouchableOpacity style={styles.imageUpload} onPress={pickImage}>
                        {image ? (
                            <Image source={{ uri: image.uri }} style={styles.imagePreview} />
                        ) : (
                            <Text style={styles.uploadText}>+ Ảnh minh hoạ</Text>
                        )}
                    </TouchableOpacity>
                </View>

                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Thời lượng (phút)</Text>
                    <View style={styles.durationContainer}>
                        {[15, 30, 45, 60].map((d) => (
                            <TouchableOpacity
                                key={d}
                                style={[styles.durationBtn, durationMinutes === d.toString() && styles.durationSelected]}
                                onPress={() => setDurationMinutes(d.toString())}
                            >
                                <Text style={styles.durationText}>{d}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                    <TextInput
                        mode="outlined"
                        style={styles.input}
                        left={<TextInput.Icon icon="clock" />}
                        placeholder="Hay tự chọn thời lượng..."
                        value={durationMinutes}
                        onChangeText={setDurationMinutes}
                        keyboardType="numeric"
                    />
                </View>

                <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
                    <Text style={styles.submitText}>Cập nhật gói dịch vụ</Text>
                </TouchableOpacity>

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.grayBackground
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 14,
        borderBottomWidth: 1,
        borderBottomColor: "#eee",
        backgroundColor: Colors.background
    },
    titleContainer: {
        flex: 1,
        alignItems: "center",
    },
    title: {
        fontWeight: "bold",
    },
    content: {
        flex: 1,
        padding: 10,
    },
    avatarContainer: {
        alignItems: "center",
        marginVertical: 16,
    },


    card: {
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: "600",
        fontFamily: "inter",
        marginBottom: 12,
    },
    input: {
        borderRadius: 12,
        marginBottom: 12,
        fontSize: 14,
    },
    textArea: {
        height: 80,
        textAlignVertical: "top",
    },
    addOnButton: {
        backgroundColor: "#2563eb",
        paddingVertical: 10,
        borderRadius: 8,
        alignItems: "center",
    },
    addOnText: {
        color: "#fff",
        fontWeight: "500",
    },
    switchRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 8,
    },
    switchLabel: {
        fontSize: 14,
    },
    radioRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 8,
    },
    radioOuter: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: "#999",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 8,
    },
    radioOuterActive: {
        borderColor: "#2563eb",
    },
    radioInner: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: "#2563eb",
    },
    radioLabel: {
        fontSize: 14,
    },
    submitButton: {
        backgroundColor: "#16a34a",
        paddingVertical: 14,
        borderRadius: 12,
        marginBottom: 32,
        alignItems: "center",
    },
    submitText: {
        color: "#fff",
        fontWeight: "600",
        fontSize: 16,
    },


    durationContainer: { flexDirection: "row", marginVertical: 10 },
    durationBtn: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderWidth: 1,
        borderColor: "#ccc",
        borderRadius: 6,
        marginRight: 8,
    },
    durationSelected: { backgroundColor: "#1877F2", borderColor: "#1877F2" },
    durationText: { color: "#000" },
    imageUpload: {
        height: 150,
        borderWidth: 1,
        borderColor: "#ccc",
        borderRadius: 6,
        justifyContent: "center",
        alignItems: "center",
        marginVertical: 10,
    },
    uploadText: { color: "#666" },
    imagePreview: { width: "100%", height: "100%", borderRadius: 6 },
});