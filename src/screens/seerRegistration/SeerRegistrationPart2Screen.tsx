import Colors from "@/src/constants/colors";
import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { LucideCoins, LucideEye, LucideHand, LucideMoreHorizontal, LucideSparkles, LucideStar } from "lucide-react-native";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { Button, Text, TextInput } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

// Specialty Icons component
const SpecialtyIcon = ({ icon, color }: { icon: string; color: string }) => {
  return (
    <View style={[styles.specialtyIcon, { backgroundColor: `${color}20` }]}>
      {icon === "star" && <LucideStar size={24} color={color} />}
      {icon === "eye" && <LucideEye size={24} color={color} />}
      {icon === "coins" && <LucideCoins size={24} color={color} />}
      {icon === "hand" && <LucideHand size={24} color={color} />}
      {icon === "sparkles" && <LucideSparkles size={24} color={color} />}
      {icon === "moreHorizontal" && <LucideMoreHorizontal size={24} color={color} />}
    </View>
  );
};

// Specialty checkbox component
const SpecialtyCheckbox = ({ 
  label, 
  icon, 
  color, 
  selected, 
  onPress 
}: { 
  label: string; 
  icon: string; 
  color: string;
  selected: boolean;
  onPress: () => void;
}) => {
  return (
    <View style={styles.specialtyOption}>
      <TouchableOpacity
        onPress={onPress}
        style={[
          styles.specialtyButton,
          selected ? { backgroundColor: `${color}15`, borderColor: color } : { backgroundColor: 'white', borderColor: "#eee" }
        ]}
      >
        <MaterialIcons 
          name={selected ? "check-box" : "check-box-outline-blank"} 
          size={22} 
          color={selected ? Colors.primary : "#777"} 
          style={styles.checkboxIcon}
        />
        <View style={styles.specialtyContent}>
          <SpecialtyIcon icon={icon} color={color} />
          <Text numberOfLines={2} style={styles.specialtyLabel}>{label}</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
};

export default function SeerRegistrationStep2Screen() {
  // Selected specialties
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
  // Biography text
  const [bioText, setBioText] = useState<string>("");
  // Character counter
  const [charCount, setCharCount] = useState<number>(0);
  const maxChars = 1000;

  // Toggle specialty selection
  const toggleSpecialty = (specialty: string) => {
    if (selectedSpecialties.includes(specialty)) {
      setSelectedSpecialties(selectedSpecialties.filter(item => item !== specialty));
    } else {
      setSelectedSpecialties([...selectedSpecialties, specialty]);
    }
  };

  // Handle bio text change
  const handleBioChange = (text: string) => {
    if (text.length <= maxChars) {
      setBioText(text);
      setCharCount(text.length);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <MaterialIcons name="arrow-back" size={24} color="black" onPress={() => router.back()} />
        <View style={styles.titleContainer}>
          <Text variant="titleMedium" style={styles.title}>Đăng ký Nhà tiên tri</Text>
          <Text variant="bodySmall" style={styles.subtitle}>Bước 2/3</Text>
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
            <MaterialIcons name="star" size={40} color={Colors.primary} />
          </View>
        </View>

        <Text variant="headlineSmall" style={styles.sectionTitle}>Chuyên môn & Mô tả</Text>
        <Text variant="bodyMedium" style={styles.sectionSubtitle}>Chia sẻ về kỹ năng và kinh nghiệm của bạn</Text>

        <Text variant="titleMedium" style={styles.specialtyTitle}>Chọn chuyên môn của bạn</Text>
        
        <View style={styles.specialtiesContainer}>
          <SpecialtyCheckbox 
            label="Cung Hoàng Đạo" 
            icon="star" 
            color="#5E51DC"
            selected={selectedSpecialties.includes("zodiac")}
            onPress={() => toggleSpecialty("zodiac")}
          />
          
          <SpecialtyCheckbox 
            label="Nhân Tướng Học" 
            icon="eye" 
            color="#2D87FB"
            selected={selectedSpecialties.includes("physiognomy")}
            onPress={() => toggleSpecialty("physiognomy")}
          />

          <SpecialtyCheckbox 
            label="Ngũ Hành" 
            icon="coins" 
            color="#31C452"
            selected={selectedSpecialties.includes("elements")}
            onPress={() => toggleSpecialty("elements")}
          />
          
          <SpecialtyCheckbox 
            label="Chỉ Tay" 
            icon="hand" 
            color="#F04E99"
            selected={selectedSpecialties.includes("palmistry")}
            onPress={() => toggleSpecialty("palmistry")}
          />

          <SpecialtyCheckbox 
            label="Tarot" 
            icon="sparkles" 
            color="#F8B940"
            selected={selectedSpecialties.includes("tarot")}
            onPress={() => toggleSpecialty("tarot")}
          />

          <SpecialtyCheckbox 
            label="Khác" 
            icon="moreHorizontal" 
            color="#777777"
            selected={selectedSpecialties.includes("other")}
            onPress={() => toggleSpecialty("other")}
          />
        </View>
        
        <Text style={styles.selectionCount}>Đã chọn {selectedSpecialties.length}/6 chuyên môn</Text>

        <View style={styles.bioSection}>
          <Text variant="titleMedium" style={styles.bioTitle}>Mô tả bản thân</Text>
          <TextInput
            mode="outlined"
            placeholder="Hãy chia sẻ những kinh nghiệm, phong cách tư vấn và những điều đặc biệt về bạn..."
            multiline
            numberOfLines={6}
            value={bioText}
            onChangeText={handleBioChange}
            style={styles.bioInput}
          />
          <Text style={styles.charCounter}>{charCount}/{maxChars} ký tự</Text>
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
          style={styles.nextButton}
          labelStyle={{ color: 'white' }}
          onPress={() => router.push("/seer-registration-step3" as any)}
          disabled={selectedSpecialties.length === 0} //|| bioText.trim().length === 0}
        >
          Tiếp tục
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
  specialtyTitle: {
    marginBottom: 16,
    fontWeight: "500",
  },
  specialtiesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  specialtyOption: {
    width: "49%",
    marginBottom: 16,
  },
  specialtyButton: {
    borderWidth: 1,
    borderRadius: 10,
    height: 55,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  specialtyContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  specialtyIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  specialtyLabel: {
    fontSize: 11,
    flex: 1,
    flexWrap: 'wrap',
  },
  checkboxIcon: {
    marginRight: 4,
  },
  selectionCount: {
    fontSize: 12,
    color: Colors.gray,
    marginBottom: 24,
  },
  bioSection: {
    marginTop: 8,
  },
  bioTitle: {
    marginBottom: 8,
    fontWeight: "500",
  },
  bioInput: {
    height: 150,
    textAlignVertical: "top",
  },
  charCounter: {
    alignSelf: "flex-end",
    fontSize: 12,
    color: Colors.gray,
    marginTop: 4,
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
  nextButton: {
    flex: 1,
    marginLeft: 8,
    backgroundColor: Colors.primary,
    borderRadius: 10,
  },
});