import Colors from "@/src/constants/colors";
import { MaterialIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Menu, Text, TextInput } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { createServicePackage, getKnowledgeCategories } from "../../services/api";

export default function CreatePackageScreen() {
  const [title, setTitle] = useState("");
  const [categoryLabel, setCategoryLabel] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [categories, setCategories] = useState<any[]>([]);

  const [priceRaw, setPriceRaw] = useState("");
  const [price, setPrice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [content, setContent] = useState("");
  const [durationMinutes, setDurationMinutes] = useState<string>("");
  const [image, setImage] = useState<any>(null);
  const [menuVisible, setMenuVisible] = useState<boolean>(false);

  const openMenu = () => setMenuVisible(true);
  const closeMenu = () => setMenuVisible(false);

  // ✅ Fetch knowledge categories
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
    if (!result.canceled) {
      setImage(result.assets[0]);
    }
  };

  const handleSubmit = async () => {
    if (!title || !content || !priceRaw || !durationMinutes || !selectedCategoryId || !image) {
      Alert.alert("Lỗi", "Vui lòng nhập đầy đủ thông tin");
      return;
    }

    const formData = new FormData();
    formData.append("packageTitle", title);
    formData.append("packageContent", content);
    formData.append("durationMinutes", parseInt(durationMinutes).toString());
    formData.append("price", parseFloat(priceRaw).toString());
    formData.append("categoryIds[]", selectedCategoryId); // ✅ Send as array<string>

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

    try {
      const seerIdValue = await SecureStore.getItemAsync("userId");
      if (!seerIdValue) {
        Alert.alert("Lỗi", "Không xác định được tài khoản. Vui lòng đăng nhập lại.");
        return;
      }

      setSubmitting(true);
      await createServicePackage(seerIdValue, formData);
      Alert.alert("Thành công", "Tạo gói dịch vụ thành công!");
      router.push("/my-packages");
    } catch (err: any) {
      console.error("createServicePackage error:", err, err?.response?.data);

      let message = "Không thể tạo gói dịch vụ. Hãy thử lại sau.";
      const resp = err?.response?.data;
      if (resp) {
        if (typeof resp === "string") {
          message = resp;
        } else if (resp.message) {
          message = resp.message;
        } else if (resp.errors) {
          try {
            const errs = resp.errors;
            if (typeof errs === "object") {
              const flat = Object.keys(errs).map((k) => {
                const v = errs[k];
                if (Array.isArray(v)) return v.join(", ");
                if (typeof v === "string") return v;
                return JSON.stringify(v);
              });
              message = flat.join("\n");
            }
          } catch (e) {}
        }
      }
      Alert.alert("Lỗi", message);
    } finally {
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

            {/* ✅ Dynamic categories */}
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
                if (!digits) {
                  setPrice("");
                } else {
                  const formatted = Number(digits).toLocaleString("vi-VN");
                  setPrice(formatted);
                }
              }}
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
              placeholder="Hoặc nhập thời lượng tùy chọn..."
              value={durationMinutes}
              onChangeText={setDurationMinutes}
              keyboardType="numeric"
            />
          </View>

          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitText}>Tạo gói dịch vụ</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
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
  durationSelected: { backgroundColor: "#1877F2", borderColor: "#1877F2" },
  durationText: { color: "#000" },
  submitButton: {
    backgroundColor: "#16a34a",
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 32,
    alignItems: "center",
  },
  submitText: { color: "#fff", fontWeight: "600", fontSize: 16 },
});
