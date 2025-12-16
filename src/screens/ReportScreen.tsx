import Colors from "@/src/constants/colors";
import { createReport } from "@/src/services/api";
import { MaterialIcons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { router, useLocalSearchParams } from "expo-router";
import { ChevronDown, FileText, Target, TriangleAlert, Upload, X } from "lucide-react-native";
import { useMemo, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Button, TextInput, TouchableRipple } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

const reportTargetTypes = {
  SEER: "Nhà tiên tri",
  SERVICE_PACKAGE: "Gói dịch vụ",
  BOOKING: "Booking",
  CHAT: "Đoạn chat",
};

const reportReasons = [
  { key: "SPAM", label: "Spam" },
  { key: "INAPPROPRIATE_CONTENT", label: "Nội dung không phù hợp" },
  { key: "HARASSMENT", label: "Quấy rối" },
  { key: "HATE_SPEECH", label: "Ngôn từ gây thù ghét" },
  { key: "VIOLENCE", label: "Bạo lực" },
  { key: "NUDITY", label: "Ảnh khoả thân hoặc nội dung tình dục" },
  { key: "COPYRIGHT", label: "Vi phạm bản quyền" },
  { key: "IMPERSONATION", label: "Mạo danh" },
  { key: "FRAUD", label: "Lừa đảo" },
  { key: "OTHER", label: "Khác" },
];

export default function ReportScreen() {
  const { targetId, targetType, targetName } = useLocalSearchParams<{
    targetId: string;
    targetType: keyof typeof reportTargetTypes;
    targetName: string;
  }>();

  const [reason, setReason] = useState("OTHER");
  const [description, setDescription] = useState("");
  const [evidenceFiles, setEvidenceFiles] = useState<DocumentPicker.DocumentPickerAsset[]>([]);
  const [isReasonModalVisible, setReasonModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [menuLayout, setMenuLayout] = useState({ x: 0, y: 0, width: 0 });

  const reasonAnchorRef = useRef<View>(null);

  const targetTypeLabel = useMemo(
    () => (targetType ? reportTargetTypes[targetType] : ""),
    [targetType]
  );

  const openReasonMenu = () => {
    reasonAnchorRef.current?.measureInWindow((x: number, y: number, width: number, height: number) => {
      setMenuLayout({ x, y: y + height, width });
      setReasonModalVisible(true);
    });
  };

  const handleFilePick = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "image/*",
        copyToCacheDirectory: true,
        multiple: true,
      });
      if (!result.canceled) {
        setEvidenceFiles((prevFiles) => [...prevFiles, ...result.assets]);
      }
    } catch (error) {
      console.error("Error picking document:", error);
      Alert.alert("Lỗi", "Không thể chọn tệp.");
    }
  };

  const handleRemoveEvidence = (uri: string) => {
    setEvidenceFiles((prevFiles) => prevFiles.filter((file) => file.uri !== uri));
  };

  const handleSubmit = async () => {
    // if (!description.trim()) {
    //   Alert.alert("Thiếu thông tin", "Vui lòng cung cấp mô tả cho báo cáo của bạn.");
    //   return;
    // }
    if (!targetId || !targetType) {
        Alert.alert("Lỗi", "Không xác định được đối tượng báo cáo.");
        return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append("targetId", targetId);
    formData.append("targetReportType", targetType);
    formData.append("reportType", reason);
    formData.append("description", description);

    if (evidenceFiles.length > 0) {
      evidenceFiles.forEach((file) => {
        formData.append("imageFiles", {
          uri: file.uri,
          name: file.name,
          type: file.mimeType,
        } as any);
      });
    }

    try {
      await createReport(formData);
      Alert.alert("Báo cáo thành công", "Cảm ơn bạn đã giúp chúng tôi giữ cho cộng đồng an toàn.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error: any) {
      // console.error("Failed to submit report:", error);
      // console.log("ERROR DATA:", );
      // console.log("ERROR STATUS:", error.response?.status);
      // console.log("ERROR HEADERS:", error.response?.headers);
      Alert.alert("Lỗi", error.response?.data?.message);
    } finally {
      setLoading(false);
    }
  };

  const selectedReasonLabel = reportReasons.find((r) => r.key === reason)?.label;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Báo cáo</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior="padding"
        keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
      >
        <ScrollView
          style={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            <Text style={styles.label}>Đối tượng vi phạm</Text>
            <TextInput
              mode="outlined"
              value={targetTypeLabel}
              editable={false}
              left={<TextInput.Icon icon={() => <Target size={20} color={Colors.gray} />} />}
              style={styles.input}
              outlineStyle={styles.inputOutline}
            />

            <Text style={styles.label}>Lí do</Text>
            <TouchableOpacity ref={reasonAnchorRef as any} onPress={openReasonMenu}>
              <View pointerEvents="none">
                <TextInput
                  mode="outlined"
                  editable={false}
                  value={selectedReasonLabel}
                  left={<TextInput.Icon icon={() => <TriangleAlert size={20} color={Colors.gray} />} />}
                  right={<TextInput.Icon icon={() => <ChevronDown size={20} color={Colors.gray} />} />}
                  style={styles.input}
                  outlineStyle={styles.inputOutline}
                />
              </View>
            </TouchableOpacity>

            <Text style={styles.label}>Mô tả</Text>
            <TextInput
              mode="outlined"
              placeholder="Nhập mô tả của bạn..."
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              left={<TextInput.Icon icon={() => <FileText size={20} color={Colors.gray} />} />}
              style={[styles.input, styles.textArea]}
              contentStyle={styles.textAreaContent}
              outlineStyle={styles.inputOutline}
            />

            <Text style={styles.label}>Tải lên file bằng chứng</Text>
            <TouchableOpacity style={styles.filePickButton} onPress={handleFilePick}>
              <Upload size={24} color={Colors.primary} />
              <Text style={styles.filePickText}>
                Chọn file để tải lên
              </Text>
            </TouchableOpacity>

            {evidenceFiles.length > 0 && (
              <View style={styles.certificatesSection}>
                <Text style={styles.certificatesTitle}>
                  Bằng chứng đã tải lên ({evidenceFiles.length})
                </Text>
                {evidenceFiles.map((file) => (
                  <View key={file.uri} style={styles.certificateItem}>
                    <View style={styles.certificateIcon}>
                      <FileText size={24} color="#E53935" />
                    </View>
                    <Text style={styles.certificateName} numberOfLines={1}>
                      {file.name}
                    </Text>
                    <TouchableOpacity
                      style={styles.certificateActionButton}
                      onPress={() => handleRemoveEvidence(file.uri)}
                    >
                      <X size={22} color="#E53935" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.footer}>
        <Button
          mode="contained"
          onPress={handleSubmit}
          style={styles.submitButton}
          labelStyle={styles.submitButtonText}
          disabled={loading}
          loading={loading}
        >
          Báo cáo
        </Button>
      </View>

      <Modal
        transparent
        visible={isReasonModalVisible}
        onRequestClose={() => setReasonModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPressOut={() => setReasonModalVisible(false)}
        >
          <View
            style={[
              styles.modalContent,
              {
                top: menuLayout.y,
                left: menuLayout.x,
                width: menuLayout.width,
              },
            ]}
          >
            <ScrollView>
              {reportReasons.map((item) => (
                <TouchableRipple
                  key={item.key}
                  onPress={() => {
                    setReason(item.key);
                    setReasonModalVisible(false);
                  }}
                >
                  <Text style={styles.modalItem}>{item.label}</Text>
                </TouchableRipple>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "bold",
  },
  headerPlaceholder: {
    width: 28,
  },
  content: {
    flex: 1,
  },
  card: {
    padding: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 4,
    color: Colors.black,
  },
  input: {
    backgroundColor: "#F9FAFB",
    marginBottom: 16,
  },
  inputOutline: {
    borderColor: "#E5E7EB",
    borderRadius: 8,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: "top",
  },
  textAreaContent: {
    paddingTop: 12,
    paddingBottom: 12,
  },
  filePickButton: {
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.primary,
    borderStyle: "dashed",
    borderRadius: 8,
    padding: 16,
    // marginVertical: 12,
    marginBottom: 12,
    backgroundColor: "#EFF6FF",
  },
  filePickText: {
    marginTop: 8,
    color: Colors.primary,
    fontWeight: "500",
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  submitButton: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingVertical: 6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
  },
  modalContent: {
    position: "absolute",
    backgroundColor: "white",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    maxHeight: 250,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  certificatesSection: {
    // marginTop: 24,
  },
  certificatesTitle: {
    fontWeight: "500",
    marginBottom: 12,
  },
  certificateItem: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#eee",
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
  },
  certificateIcon: {
    marginRight: 12,
  },
  certificateName: {
    flex: 1,
  },
  certificateActionButton: {
    padding: 8,
  },
});
