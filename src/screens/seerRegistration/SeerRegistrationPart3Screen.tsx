import Colors from "@/src/constants/colors";
import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { Button, Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

// Certificate item component
interface CertificateItemProps {
  name: string;
  index: number;
  onToggleVisibility: () => void;
  onRemove: () => void;
  visible: boolean;
}

const CertificateItem = ({ name, onToggleVisibility, onRemove, visible }: CertificateItemProps) => {
  return (
    <View style={styles.certificateItem}>
      <View style={styles.certificateIcon}>
        <MaterialIcons name="description" size={24} color="#E53935" />
      </View>
      <Text style={styles.certificateName} numberOfLines={1}>{name}</Text>
      <View style={styles.certificateActions}>
        <TouchableOpacity style={{ padding: 8 }} onPress={onToggleVisibility}>
          <MaterialIcons 
            name={visible ? "visibility" : "visibility-off"} 
            size={22} 
            color="#555" 
          />
        </TouchableOpacity>
        <TouchableOpacity onPress={onRemove} style={{ padding: 8 }}>
          <MaterialIcons 
            name="close" 
            size={22} 
            color="#E53935" 
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default function SeerRegistrationStep3Screen() {
  // Certificates
  const [certificates, setCertificates] = useState<Array<{
    id: string;
    name: string;
    visible: boolean;
  }>>([{ id: "0", name: "Chứng chỉ mẫu", visible: true }]);

  // Handle navigating to add certificate screen
  const handleAddCertificate = () => {
    router.push('/add-certificate');
  };

  // Handle removing certificate
  const handleRemoveCertificate = (id: string) => {
    setCertificates(certificates.filter(cert => cert.id !== id));
  };

  // Handle toggling certificate visibility
  const handleToggleVisibility = (id: string) => {
    setCertificates(
      certificates.map(cert => 
        cert.id === id ? { ...cert, visible: !cert.visible } : cert
      )
    );
  };

  // Handle completing registration
  const handleCompleteRegistration = () => {
    // Here send the data to the backend
    //router.push("/registration-success" as any);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <MaterialIcons name="arrow-back" size={24} color="black" onPress={() => router.back()} />
        <View style={styles.titleContainer}>
          <Text variant="titleMedium" style={styles.title}>Đăng ký Nhà tiên tri</Text>
          <Text variant="bodySmall" style={styles.subtitle}>Bước 3/3</Text>
        </View>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 20}
      >
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.iconContainer}>
            <View style={styles.iconCircle}>
              <MaterialIcons name="school" size={40} color={Colors.primary} />
            </View>
          </View>

          <Text variant="headlineSmall" style={styles.sectionTitle}>Chứng chỉ & Bằng cấp</Text>
          <Text variant="bodyMedium" style={styles.sectionSubtitle}>Tải lên các chứng chỉ để xác thực trình độ</Text>

          {/* Add Certificate Button */}
          <TouchableOpacity style={styles.addButton} onPress={handleAddCertificate}>
            <MaterialIcons name="file-upload" size={24} color={Colors.primary} />
            <Text style={styles.addButtonText}>Thêm chứng chỉ</Text>
          </TouchableOpacity>

          {/* Certificates List */}
          <View style={styles.certificatesSection}>
            <Text style={styles.certificatesTitle}>Chứng chỉ đã tải lên ({certificates.length})</Text>
            
            {certificates.length > 0 ? (
              certificates.map((certificate, index) => (
                <CertificateItem
                  key={certificate.id}
                  name={certificate.name}
                  index={index}
                  visible={certificate.visible}
                  onToggleVisibility={() => handleToggleVisibility(certificate.id)}
                  onRemove={() => handleRemoveCertificate(certificate.id)}
                />
              ))
            ) : (
              <Text style={styles.emptyText}>Chưa có chứng chỉ nào được tải lên</Text>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.footer}>
        <Button
          mode="outlined"
          style={styles.backButton}
          onPress={() => router.back()}
        >
          Quay lại
        </Button>
        <Button
          mode="contained"
          style={styles.completeButton}
          labelStyle={{ color: 'white' }}
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
    backgroundColor: "#fff"
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
  sectionTitle: {
    fontWeight: "bold",
    textAlign: "center",
    marginTop: 8,
  },
  sectionSubtitle: {
    textAlign: "center",
    color: Colors.gray,
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
  footer: {
    flexDirection: "row",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#eee",
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
  emptyText: {
    textAlign: 'center',
    color: Colors.gray,
    padding: 20,
    fontStyle: 'italic',
  },
});