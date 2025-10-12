import Colors from "@/src/constants/colors";
import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { LucideEye, LucideFileText, LucideX } from "lucide-react-native";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  TouchableOpacity,
  View,
} from "react-native";
import { Button, Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

interface ServicePackage {
  id: string;
  name: string;
  description: string;
  priceLabel: string;
  durationLabel: string;
  note: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  color: string;
  isActive: boolean;
}

interface Certificate {
  id: string;
  name: string;
  visible: boolean;
}

interface CertificateItemProps {
  name: string;
  onToggleVisibility: () => void;
  onRemove: () => void;
  visible: boolean;
}

const defaultServicePackages: ServicePackage[] = [
  {
    id: "tarot",
    name: "Gói Tarot",
    description:
      "Trải bài tarot chuyên sâu giúp khách hàng nhìn rõ bức tranh tổng thể về tình cảm, sự nghiệp và định hướng tương lai.",
    priceLabel: "350.000đ / phiên",
    durationLabel: "45 phút",
    note: "Bao gồm tối đa 3 câu hỏi lớn và phần tổng kết định hướng hành động.",
    icon: "stars",
    color: "#F59E0B",
    isActive: true,
  },
  {
    id: "palm-reading",
    name: "Gói Xem Chỉ Tay",
    description:
      "Phân tích đường sinh đạo, trí đạo và tâm đạo để đưa ra những lời khuyên phù hợp với từng giai đoạn cuộc đời.",
    priceLabel: "280.000đ / phiên",
    durationLabel: "30 phút",
    note: "Khách hàng có thể gửi hình ảnh bàn tay trước hoặc gặp trực tiếp.",
    icon: "pan-tool",
    color: "#EC4899",
    isActive: true,
  },
  {
    id: "consultation",
    name: "Gói Tư Vấn Tổng Hợp",
    description:
      "Buổi tư vấn 1:1 tập trung vào công việc, tài chính và các mối quan hệ, kết hợp nhiều phương pháp theo nhu cầu của khách.",
    priceLabel: "400.000đ / phiên",
    durationLabel: "60 phút",
    note: "Có thể kết hợp tarot, chiêm tinh và bài tập thực hành tại nhà.",
    icon: "record-voice-over",
    color: "#2563EB",
    isActive: false,
  },
  {
    id: "physiognomy",
    name: "Gói Nhân Tướng Học",
    description:
      "Đọc tướng khuôn mặt để nhận diện ưu điểm, điểm cần khắc phục và lộ trình phát triển phù hợp với bản thân.",
    priceLabel: "320.000đ / phiên",
    durationLabel: "40 phút",
    note: "Hỗ trợ cả xem ảnh và gặp trực tiếp tại phòng tư vấn.",
    icon: "visibility",
    color: "#10B981",
    isActive: true,
  },
];

const defaultCertificates: Certificate[] = [
  { id: "1", name: "Chứng chỉ Tarot nâng cao", visible: true },
  { id: "2", name: "Chứng nhận tư vấn tâm lý cơ bản", visible: false },
];

const ServicePackageCard = ({
  data,
  onToggle,
}: {
  data: ServicePackage;
  onToggle: () => void;
}) => {
  return (
    <View style={styles.packageCard}>
      <View style={styles.packageHeader}>
        <View
          style={[
            styles.packageIconWrapper,
            { backgroundColor: `${data.color}1A` },
          ]}
        >
          <MaterialIcons name={data.icon} size={28} color={data.color} />
        </View>
        <View style={styles.packageInfo}>
          <Text variant="titleMedium" style={styles.packageName}>
            {data.name}
          </Text>
          <Text variant="bodySmall" style={styles.packageNote}>
            {data.note}
          </Text>
        </View>
        <View style={styles.packageToggle}>
          <Text
            variant="bodySmall"
            style={[
              styles.toggleLabel,
              data.isActive
                ? styles.toggleLabelActive
                : styles.toggleLabelInactive,
            ]}
          >
            {data.isActive ? "Đang bật" : "Đang tắt"}
          </Text>
          <Switch
            value={data.isActive}
            onValueChange={onToggle}
            trackColor={{ false: "#d1d5db", true: `${data.color}55` }}
            thumbColor={data.isActive ? data.color : "#f4f4f5"}
          />
        </View>
      </View>

      <Text variant="bodyMedium" style={styles.packageDescription}>
        {data.description}
      </Text>

      <View style={styles.packageMetaRow}>
        <View style={styles.packageChip}>
          <MaterialIcons name="schedule" size={18} color={data.color} />
          <Text style={styles.chipText}>{data.durationLabel}</Text>
        </View>
        <View style={styles.packageChip}>
          <MaterialIcons name="attach-money" size={18} color={data.color} />
          <Text style={styles.chipText}>{data.priceLabel}</Text>
        </View>
      </View>

      <View style={styles.packageFooter}>
        <Button
          mode="outlined"
          style={styles.packageSecondaryButton}
          labelStyle={styles.packageSecondaryLabel}
          onPress={() => {}}
        >
          Tùy chỉnh
        </Button>
        <Button
          mode="contained"
          style={[styles.packagePrimaryButton, { backgroundColor: data.color }]}
          labelStyle={styles.packagePrimaryLabel}
          onPress={() => {}}
        >
          Xem chi tiết
        </Button>
      </View>
    </View>
  );
};

const CertificateItem = ({
  name,
  onToggleVisibility,
  onRemove,
  visible,
}: CertificateItemProps) => {
  return (
    <View style={styles.certificateItem}>
      <View style={styles.certificateIcon}>
        <LucideFileText size={24} color="#E53935" />
      </View>
      <Text style={styles.certificateName} numberOfLines={1}>
        {name}
      </Text>
      <View style={styles.certificateActions}>
        <TouchableOpacity
          style={styles.certificateActionButton}
        >
          <LucideEye
            size={22}
            color="#555"
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.certificateActionButton}
          onPress={onRemove}
          accessibilityLabel="Xóa chứng chỉ"
        >
          <LucideX size={22} color="#E53935" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default function SeerRegistrationStep3Screen() {
  const [servicePackages, setServicePackages] =
    useState<ServicePackage[]>(defaultServicePackages);
  const [certificates, setCertificates] =
    useState<Certificate[]>(defaultCertificates);

  const handleTogglePackage = (packageId: string) => {
    setServicePackages((prev) =>
      prev.map((pkg) =>
        pkg.id === packageId ? { ...pkg, isActive: !pkg.isActive } : pkg,
      ),
    );
  };

  const handleAddCertificate = () => {
    router.push("/add-certificate");
  };

  const handleRemoveCertificate = (id: string) => {
    setCertificates((prev) => prev.filter((cert) => cert.id !== id));
  };

  const handleToggleCertificateVisibility = (id: string) => {
    setCertificates((prev) =>
      prev.map((cert) =>
        cert.id === id ? { ...cert, visible: !cert.visible } : cert,
      ),
    );
  };

  const handleCompleteRegistration = () => {
    // TODO: Kết nối API lưu dữ liệu đăng ký
  };

  const activePackageCount = servicePackages.filter(
    (pkg) => pkg.isActive,
  ).length;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <MaterialIcons
          name="arrow-back"
          size={24}
          color="black"
          onPress={() => router.back()}
        />
        <View style={styles.titleContainer}>
          <Text variant="titleMedium" style={styles.title}>
            Đăng ký Nhà tiên tri
          </Text>
          <Text variant="bodySmall" style={styles.subtitle}>
            Bước 3/3
          </Text>
        </View>
        <View style={styles.headerPlaceholder} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 20}
      >
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 140 }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.iconContainer}>
            <View style={styles.iconCircle}>
              <MaterialIcons name="collections-bookmark" size={40} color={Colors.primary} />
            </View>
          </View>

          <View style={styles.packagesSection}>
            <Text variant="headlineSmall" style={styles.packagesTitle}>
              Danh mục gói dịch vụ
            </Text>
            <Text variant="bodyMedium" style={styles.packagesSubtitle}>
              Chọn những gói phù hợp để khách hàng dễ dàng đặt lịch theo nhu cầu.
            </Text>
            <Text variant="bodySmall" style={styles.packagesSummary}>
              Bạn đang bật {activePackageCount}/{servicePackages.length} gói dịch vụ.
            </Text>

            <View style={styles.packageList}>
              {servicePackages.map((pkg) => (
                <ServicePackageCard
                  key={pkg.id}
                  data={pkg}
                  onToggle={() => handleTogglePackage(pkg.id)}
                />
              ))}
            </View>
          </View>

          <View style={styles.sectionSpacing}>
            <Text variant="headlineSmall" style={styles.sectionTitle}>
              Chứng chỉ & Bằng cấp
            </Text>
            <Text variant="bodyMedium" style={styles.sectionSubtitle}>
              Tải lên các chứng chỉ để xác thực chuyên môn trước khi duyệt hồ sơ.
            </Text>

            <TouchableOpacity
              style={styles.addButton}
              onPress={handleAddCertificate}
              accessibilityRole="button"
            >
              <MaterialIcons name="file-upload" size={24} color={Colors.primary} />
              <Text style={styles.addButtonText}>Thêm chứng chỉ</Text>
            </TouchableOpacity>

            <View style={styles.certificatesSection}>
              <Text style={styles.certificatesTitle}>
                Chứng chỉ đã tải lên ({certificates.length})
              </Text>

              {certificates.length > 0 ? (
                certificates.map((certificate) => (
                  <CertificateItem
                    key={certificate.id}
                    name={certificate.name}
                    visible={certificate.visible}
                    onToggleVisibility={() =>
                      handleToggleCertificateVisibility(certificate.id)
                    }
                    onRemove={() => handleRemoveCertificate(certificate.id)}
                  />
                ))
              ) : (
                <Text style={styles.emptyText}>
                  Chưa có chứng chỉ nào, hãy thêm mới để hoàn thiện hồ sơ.
                </Text>
              )}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.footer}>
        <Button
          mode="outlined"
          style={styles.backButton}
          labelStyle={styles.footerOutlinedLabel}
          onPress={() => router.back()}
        >
          Quay lại
        </Button>
        <Button
          mode="contained"
          style={styles.completeButton}
          labelStyle={styles.completeButtonLabel}
          onPress={handleCompleteRegistration}
        >
          Hoàn tất đăng ký
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  titleContainer: {
    flex: 1,
    alignItems: "center",
  },
  title: {
    fontWeight: "bold",
  },
  subtitle: {
    color: Colors.gray,
  },
  headerPlaceholder: {
    width: 24,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  iconContainer: {
    alignItems: "center",
    marginVertical: 16,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#e6f2ff",
    justifyContent: "center",
    alignItems: "center",
  },
  packagesSection: {
    marginBottom: 24,
  },
  packagesTitle: {
    fontWeight: "bold",
    textAlign: "center",
  },
  packagesSubtitle: {
    textAlign: "center",
    color: Colors.gray,
    marginTop: 8,
  },
  packagesSummary: {
    textAlign: "center",
    color: Colors.gray,
    marginTop: 12,
  },
  packageList: {
    marginTop: 20,
    gap: 16,
  },
  packageCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    padding: 16,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  packageHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  packageIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  packageInfo: {
    flex: 1,
  },
  packageName: {
    fontWeight: "600",
  },
  packageNote: {
    color: Colors.gray,
    marginTop: 4,
  },
  packageToggle: {
    alignItems: "flex-end",
  },
  toggleLabel: {
    marginBottom: 4,
  },
  toggleLabelActive: {
    color: "#16a34a",
    fontWeight: "500",
  },
  toggleLabelInactive: {
    color: Colors.gray,
  },
  packageDescription: {
    marginTop: 12,
    color: "#1f2937",
  },
  packageMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
  },
  packageChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#f3f4f6",
  },
  chipText: {
    marginLeft: 6,
    color: "#111827",
    fontWeight: "500",
  },
  packageFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
  },
  packageSecondaryButton: {
    flex: 1,
    marginRight: 8,
    borderColor: Colors.borderGray,
  },
  packagePrimaryButton: {
    flex: 1,
    marginLeft: 8,
    borderRadius: 8,
  },
  packageSecondaryLabel: {
    color: Colors.gray,
    fontWeight: "600",
  },
  packagePrimaryLabel: {
    color: "#fff",
    fontWeight: "600",
  },
  sectionSpacing: {
    marginTop: 16,
  },
  sectionTitle: {
    fontWeight: "bold",
    textAlign: "center",
  },
  sectionSubtitle: {
    textAlign: "center",
    color: Colors.gray,
    marginTop: 8,
    marginBottom: 24,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 8,
    padding: 12,
    borderStyle: "dashed",
  },
  addButtonText: {
    marginLeft: 8,
    color: Colors.primary,
    fontWeight: "500",
  },
  certificatesSection: {
    marginTop: 24,
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
    borderRadius: 8,
    padding: 8,
    marginBottom: 12,
  },
  certificateIcon: {
    marginRight: 12,
  },
  certificateName: {
    flex: 1,
  },
  certificateActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  certificateActionButton: {
    padding: 8,
  },
  footer: {
    flexDirection: "row",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    backgroundColor: "#fff",
  },
  backButton: {
    flex: 1,
    marginRight: 8,
    borderColor: Colors.primary,
    borderRadius: 10,
  },
  completeButton: {
    flex: 1,
    marginLeft: 8,
    backgroundColor: "#2196F3",
    borderRadius: 10,
  },
  footerOutlinedLabel: {
    color: Colors.primary,
    fontWeight: "600",
  },
  completeButtonLabel: {
    color: "#fff",
    fontWeight: "600",
  },
  emptyText: {
    textAlign: "center",
    color: Colors.gray,
    padding: 20,
    fontStyle: "italic",
  },
});
