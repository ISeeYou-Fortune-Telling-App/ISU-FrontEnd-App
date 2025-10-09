import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { Button, Text, TextInput } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import Colors from "../constants/colors";

export default function EditProfileScreen() {
    const handlePress = () => {
        Alert.alert(
            "Cập nhật",
            "Bạn có chắc chắn muốn thay đổi thông tin?",
            [
                { text: "Huỷ", style: "cancel" },
                {
                    text: "Lưu",
                    style: "default",
                    onPress: async () => {
                        Alert.alert("Đã lưu thông tin", "Thông tin của bạn đã được lưu thành công.", [
                            {
                            text: "Đồng ý",
                            onPress: () => router.back(),
                            },
                        ]);
                    },
                },
            ],
        );
    };

    const [email, setEmail] = useState<string>("");
    const [phone, setPhone] = useState<string>("");
    const [gender, setGender] = useState<string>("");
    const [fullName, setFullName] = useState<string>("");
    const [dob, setDob] = useState<string>("");
    const [description, setDescription] = useState<string>("");

    return (
        

        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <MaterialIcons name="arrow-back" size={28} color={Colors.black} onPress={() => router.back()} />
                <View style={styles.titleContainer}>
                    <Text variant="titleLarge" style={styles.title}>Thay đổi thông tin</Text>
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
                    <TextInput
                        autoCapitalize="none"
                        mode="outlined"
                        onChangeText={setFullName}
                        value={fullName}
                    />
                </View>

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Ngày sinh</Text>
                    <TextInput
                        autoCapitalize="none"
                        mode="outlined"
                        onChangeText={setDob}
                        value={dob}
                    />
                </View>

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Giới tính</Text>
                    <TextInput
                        autoCapitalize="none"
                        mode="outlined"
                        onChangeText={setGender}
                        value={gender}
                    />
                </View>

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Số điện thoại</Text>
                    <TextInput
                        autoCapitalize="none"
                        mode="outlined"
                        onChangeText={setPhone}
                        value={phone}
                    />
                </View>

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Email</Text>
                    <TextInput
                        autoCapitalize="none"
                        mode="outlined"
                        onChangeText={setEmail}
                        value={email}
                    />
                </View>

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Mô tả</Text>
                    <TextInput
                        autoCapitalize="none"
                        mode="outlined"
                        onChangeText={setDescription}
                        value={description}
                    />
                </View>

                <TouchableOpacity activeOpacity={0.7} style={styles.card} >
                    <Text style={styles.cardTitle}>Ảnh đại diện</Text>
                </TouchableOpacity>

                <TouchableOpacity activeOpacity={0.7} style={styles.card} >
                    <Text style={styles.cardTitle}>Hình nền</Text>
                </TouchableOpacity>

                <Button mode="contained" style={styles.btnLogin} onPress={() => handlePress()}>
                    Lưu
                </Button>

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
    btnLogin: {
        margin: 10,
        backgroundColor: Colors.primary,
        borderRadius: 10,
    },
});
