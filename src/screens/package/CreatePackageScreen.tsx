import Colors from "@/src/constants/colors";
import { createServicePackage, getKnowledgeCategories } from "@/src/services/api";
import { MaterialIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Menu, Text, TextInput } from "react-native-paper";
import { RichEditor, RichToolbar, actions } from "react-native-pell-rich-editor";
import { SafeAreaView } from "react-native-safe-area-context";

export default function CreatePackageScreen() {
  const [title, setTitle] = useState("");
  const [categoryLabel, setCategoryLabel] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [categories, setCategories] = useState<any[]>([]);

  const [priceRaw, setPriceRaw] = useState("");
  const [price, setPrice] = useState("");
  const [content, setContent] = useState("");
  const [durationMinutes, setDurationMinutes] = useState<string>("");
  const [image, setImage] = useState<any>(null);
  const [availableTime, setAvailableTime] = useState<string[]>([]);

  const [menuVisible, setMenuVisible] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const contentRef = useRef<RichEditor>(null);

  const openMenu = () => setMenuVisible(true);
  const closeMenu = () => setMenuVisible(false);

  useEffect(() => {
    (async () => {
      try {
        const resp = await getKnowledgeCategories({ page: 1, limit: 15 });
        setCategories(resp.data?.data || []);
      } catch (err) {
        console.error("Failed to fetch categories:", err);
        Alert.alert("Lỗi", "Không thể tải danh mục. Hãy thử lại sau.");
      }
    })();
  }, []);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
    });
    if (!result.canceled) setImage(result.assets[0]);
  };

  const toggleAvailableTime = (d: string) => {
    setAvailableTime((prev) =>
      prev.includes(d) ? prev.filter((item) => item !== d) : [...prev, d]
    );
  };

  const handleSubmit = async () => {
    if (!title || !content || !priceRaw || !durationMinutes || !selectedCategoryId || !image) {
      Alert.alert("Lỗi", "Vui lòng nhập đầy đủ thông tin");
      return;
    }

    try {
      setSubmitting(true);

      const formData = new FormData();
      formData.append("packageTitle", title);
      formData.append("packageContent", content);
      formData.append("durationMinutes", parseInt(durationMinutes).toString());
      formData.append("price", parseFloat(priceRaw).toString());
      formData.append("categoryIds[]", selectedCategoryId);

      // availableTime.forEach((time) => {
      //   formData.append("availableTime[]", time);
      // });

      if (image) {
        const fileName = image.fileName || image.uri.split("/").pop() || "upload.jpg";
        const match = /\.(\w+)$/.exec(fileName);
        const type = match ? `image/${match[1]}` : "image/jpeg";
        formData.append("image", {
          uri: image.uri,
          type,
          name: fileName,
        } as any);
      }

      const seerIdValue = await SecureStore.getItemAsync("userId");
      if (!seerIdValue) {
        Alert.alert("Lỗi", "Không xác định được tài khoản. Vui lòng đăng nhập lại.");
        return;
      }

      await createServicePackage(seerIdValue, formData);

      // ✅ Show success animation
      setSuccess(true);
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        useNativeDriver: true,
      }).start();

      // Wait a bit before redirecting
      setTimeout(() => {
        Animated.timing(scaleAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start(() => {
          setSubmitting(false);
          setSuccess(false);
          router.replace("/my-packages");
        });
      }, 1500);
    } catch (err: any) {
      console.error("createServicePackage error:", err);
      Alert.alert("Lỗi", "Không thể tạo gói dịch vụ. Hãy thử lại sau.");
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
          <MaterialIcons name="arrow-back" size={28} color="black" onPress={() => router.back()} />
          <View style={styles.titleContainer}>
            <Text variant="titleLarge" style={styles.title}>
              Tạo gói
            </Text>
          </View>
          <View style={{ width: 28 }} />
        </View>

        <ScrollView style={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
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

            <Menu
              visible={menuVisible}
              onDismiss={closeMenu}
              anchor={
                <TextInput
                  placeholder="Thể loại (ví dụ: Tarot, Chỉ tay...)"
                  mode="outlined"
                  style={styles.input}
                  value={categoryLabel}
                  left={<TextInput.Icon icon="bio" />}
                  right={<TextInput.Icon icon="chevron-down" onPress={openMenu} />}
                  onTouchStart={openMenu}
                  editable={false}
                />
              }
            >
              {categories.map((cat) => (
                <Menu.Item
                  key={cat.id}
                  onPress={() => {
                    setSelectedCategoryId(cat.id);
                    setCategoryLabel(cat.name);
                    closeMenu();
                  }}
                  title={cat.name}
                />
              ))}
            </Menu>

            <TextInput
              mode="outlined"
              style={styles.input}
              left={<TextInput.Icon icon="cash" />}
              placeholder="Giá gói (VND)"
              value={price}
              onChangeText={(text) => {
                const digits = text.replace(/\D/g, "");
                setPriceRaw(digits);
                if (!digits) setPrice("");
                else setPrice(Number(digits).toLocaleString("vi-VN"));
              }}
              keyboardType="numeric"
            />

            <Text style={{ fontSize: 14, marginBottom: 8 }}>Mô tả ngắn</Text>
            <View style={styles.richEditorContainer}>
              <RichToolbar
                editor={contentRef}
                actions={[
                  actions.setBold,
                  actions.setItalic,
                  actions.setUnderline,
                  actions.insertBulletsList,
                  actions.insertOrderedList,
                  actions.insertLink,
                ]}
                iconTint="#000"
                selectedIconTint="#2095F4"
                style={{ backgroundColor: "#f0f0f0" }}
              />
              <RichEditor
                ref={contentRef}
                onChange={setContent}
                placeholder="Mô tả ngắn"
                initialHeight={150}
                style={{ flex: 1 }}
              />
            </View>

            <TouchableOpacity style={styles.imageUpload} onPress={pickImage}>
              {image ? (
                <Image source={{ uri: image.uri }} style={styles.imagePreview} />
              ) : (
                <Text style={styles.uploadText}>+ Ảnh minh hoạ</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Thời gian rảnh</Text>
            <View style={styles.durationContainer}>
              {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((d) => (
                <TouchableOpacity
                  key={d}
                  style={[styles.timeBtn, availableTime.includes(d) && styles.durationSelected]}
                  onPress={() => toggleAvailableTime(d)}
                >
                  <Text style={styles.durationText}>{d}</Text>
                </TouchableOpacity>
              ))}
            </View>
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
              placeholder="Hoặc nhập thời lượng tùy chọn..."
              value={durationMinutes}
              onChangeText={setDurationMinutes}
              keyboardType="numeric"
            />
          </View>

          <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={submitting}>
            <Text style={styles.submitText}>Tạo gói dịch vụ</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ⏳ Blocking modal with spinner or success animation */}
      <Modal visible={submitting} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          {!success ? (
            <View style={styles.modalBox}>
              <ActivityIndicator size="large" color={Colors.primary || "#1877F2"} />
              <Text style={styles.modalText}>Đang tạo gói dịch vụ...</Text>
            </View>
          ) : (
            <Animated.View
              style={[
                styles.successBox,
                { transform: [{ scale: scaleAnim }] },
              ]}
            >
              <MaterialIcons name="check-circle" size={70} color="#16a34a" />
              <Text style={styles.successText}>Tạo thành công!</Text>
            </Animated.View>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.grayBackground },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    backgroundColor: Colors.background,
  },
  titleContainer: { flex: 1, alignItems: "center" },
  title: { fontWeight: "bold" },
  content: { flex: 1, padding: 10 },
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
  sectionTitle: { fontSize: 16, fontWeight: "600", marginBottom: 12 },
  input: { borderRadius: 12, marginBottom: 12, fontSize: 14 },
  richEditorContainer: {
    minHeight: 200,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    marginBottom: 12,
    overflow: "hidden",
  },
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
  durationContainer: { flexDirection: "row", marginVertical: 10 },
  durationBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    marginRight: 8,
  },
  durationSelected: { backgroundColor: Colors.primary, borderColor: Colors.grayBackground },
  durationText: { color: "#000" },
  timeBtn: {
    paddingVertical: 8,
    paddingHorizontal: 13,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    marginRight: 8,
  },
  submitButton: {
    backgroundColor: "#16a34a",
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 32,
    alignItems: "center",
  },
  submitText: { color: "#fff", fontWeight: "600", fontSize: 16 },

  // ✅ Modal styles
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
