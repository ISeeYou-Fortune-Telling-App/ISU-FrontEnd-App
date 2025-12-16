import Colors from "@/src/constants/colors";
import { getKnowledgeCategories } from "@/src/services/api";
import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { LucideCoins, LucideEye, LucideHand, LucideMoreHorizontal, LucideSparkles, LucideStar } from "lucide-react-native";
import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { Button, Text, TextInput } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

const getIconForCategory = (categoryName: string): string => {
  const iconMap: Record<string, string> = {
    "Cung Hoàng Đạo": "star",
    "Nhân Tướng Học": "eye",
    "Ngũ Hành": "coins",
    "Chỉ Tay": "hand",
    "Tarot": "sparkles",
    "Khác": "moreHorizontal"
  };
  return iconMap[categoryName] || "star";
};

const getColorForCategory = (categoryName: string) => {
  const colorMap: Record<string, { icon: string; chip: string }> = {
    "Cung Hoàng Đạo": Colors.categoryColors.zodiac,
    "Nhân Tướng Học": Colors.categoryColors.physiognomy,
    "Ngũ Hành": Colors.categoryColors.elements,
    "Chỉ Tay": Colors.categoryColors.palmistry,
    "Tarot": Colors.categoryColors.tarot,
    "Khác": Colors.categoryColors.other
  };
  return colorMap[categoryName] || Colors.categoryColors.zodiac;
};

const SpecialtyIcon = ({ icon, color, bgColor }: { icon: string; color: string; bgColor: string }) => {
  return (
    <View style={[styles.specialtyIcon, { backgroundColor: bgColor }]}>
      {icon === "star" && <LucideStar size={24} color={color} />}
      {icon === "eye" && <LucideEye size={24} color={color} />}
      {icon === "coins" && <LucideCoins size={24} color={color} />}
      {icon === "hand" && <LucideHand size={24} color={color} />}
      {icon === "sparkles" && <LucideSparkles size={24} color={color} />}
      {icon === "moreHorizontal" && <LucideMoreHorizontal size={24} color={color} />}
    </View>
  );
};

const SpecialtyCheckbox = ({
  label,
  icon,
  color,
  bgColor,
  selected,
  onPress
}: {
  label: string;
  icon: string;
  color: string;
  bgColor: string;
  selected: boolean;
  onPress: () => void;
}) => {
  return (
    <View style={styles.specialtyOption}>
      <TouchableOpacity
        onPress={onPress}
        style={[
          styles.specialtyButton,
          selected ? { backgroundColor: bgColor, borderColor: color } : { backgroundColor: 'white', borderColor: "#eee" }
        ]}
      >
        <MaterialIcons
          name={selected ? "check-box" : "check-box-outline-blank"}
          size={22}
          color={selected ? Colors.primary : "#777"}
          style={styles.checkboxIcon}
        />
        <View style={styles.specialtyContent}>
          <SpecialtyIcon icon={icon} color={color} bgColor={bgColor} />
          <Text numberOfLines={2} style={styles.specialtyLabel}>{label}</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
};

export default function SeerRegistrationStep2Screen() {
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
  const [knowledgeCategories, setKnowledgeCategories] = useState<any[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [bioText, setBioText] = useState<string>("");
  const [charCount, setCharCount] = useState<number>(0);
  const maxChars = 1000;

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await getKnowledgeCategories();
        const categoriesData = response?.data?.data || [];

        const transformedCategories = categoriesData.map((category: any) => ({
          id: category.id,
          name: category.name,
          icon: getIconForCategory(category.name),
          color: getColorForCategory(category.name).icon,
          bgColor: getColorForCategory(category.name).chip
        }));

        setKnowledgeCategories(transformedCategories);
      } catch (error) {
        console.error('Error fetching knowledge categories:', error);
        // Fallback to basic categories if API fails
        setKnowledgeCategories([
          { id: "fallback-1", name: "Cung Hoàng Đạo", color: Colors.categoryColors.zodiac.icon, bgColor: Colors.categoryColors.zodiac.chip, icon: "star" },
          { id: "fallback-2", name: "Nhân Tướng Học", color: Colors.categoryColors.physiognomy.icon, bgColor: Colors.categoryColors.physiognomy.chip, icon: "eye" },
          { id: "fallback-3", name: "Ngũ Hành", color: Colors.categoryColors.elements.icon, bgColor: Colors.categoryColors.elements.chip, icon: "coins" },
          { id: "fallback-4", name: "Chỉ Tay", color: Colors.categoryColors.palmistry.icon, bgColor: Colors.categoryColors.palmistry.chip, icon: "hand" },
          { id: "fallback-5", name: "Tarot", color: Colors.categoryColors.tarot.icon, bgColor: Colors.categoryColors.tarot.chip, icon: "sparkles" },
          { id: "fallback-6", name: "Khác", color: Colors.categoryColors.other.icon, bgColor: Colors.categoryColors.other.chip, icon: "moreHorizontal" }
        ]);
      } finally {
        setLoadingCategories(false);
      }
    };

    fetchCategories();
  }, []);

  const toggleSpecialty = (specialty: string) => {
    if (selectedSpecialties.includes(specialty)) {
      setSelectedSpecialties(selectedSpecialties.filter(item => item !== specialty));
    } else {
      setSelectedSpecialties([...selectedSpecialties, specialty]);
    }
  };

  const handleBioChange = (text: string) => {
    if (text.length <= maxChars) {
      setBioText(text);
      setCharCount(text.length);
    }
  };

  const handleNext = async () => {
    const step2Data = {
      specialityIds: selectedSpecialties,
      profileDescription: bioText.trim(),
    };

    try {
      await SecureStore.setItemAsync("seerRegistrationStep2", JSON.stringify(step2Data));
      router.push("/seer-registration-step3" as any);
    } catch (error) {
      alert("Có lỗi xảy ra. Vui lòng thử lại.");
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
        behavior="padding"
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
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
            {loadingCategories ? (
              <Text style={styles.loadingText}>Đang tải chuyên môn...</Text>
            ) : (
              knowledgeCategories.map((category) => (
                <SpecialtyCheckbox
                  key={category.id}
                  label={category.name}
                  icon={category.icon || "star"}
                  color={category.color || Colors.categoryColors.zodiac.icon}
                  bgColor={category.bgColor || Colors.categoryColors.zodiac.chip}
                  selected={selectedSpecialties.includes(category.id)}
                  onPress={() => toggleSpecialty(category.id)}
                />
              ))
            )}
          </View>

          <Text style={styles.selectionCount}>Đã chọn {selectedSpecialties.length}/{knowledgeCategories.length} chuyên môn</Text>

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
          onPress={handleNext}
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
  loadingText: {
    textAlign: "center",
    color: Colors.gray,
    fontSize: 16,
    marginVertical: 20,
  },
});