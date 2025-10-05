import { MaterialIcons } from "@expo/vector-icons";
import * as DocumentPicker from 'expo-document-picker';
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View
} from "react-native";
import { Button, Text, TextInput } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import Colors from "../constants/colors";

// Category Icon component
const CategoryIcon = ({ icon, color }: { icon: string; color: string }) => {
  return (
    <View style={[styles.categoryIcon, { backgroundColor: `${color}20` }]}>
      {icon === "star" && <MaterialIcons name="star" size={20} color={color} />}
      {icon === "visibility" && <MaterialIcons name="visibility" size={20} color={color} />}
      {icon === "link" && <MaterialIcons name="link" size={20} color={color} />}
      {icon === "spa" && <MaterialIcons name="spa" size={20} color={color} />}
      {icon === "casino" && <MaterialIcons name="casino" size={20} color={color} />}
      {icon === "more-horiz" && <MaterialIcons name="more-horiz" size={20} color={color} />}
    </View>
  );
};

// Category checkbox component
const CategoryCheckbox = ({ 
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
    <View style={styles.categoryOption}>
      <TouchableOpacity
        onPress={onPress}
        style={[
          styles.categoryButton,
          selected ? { backgroundColor: `${color}15`, borderColor: color } : { backgroundColor: 'white', borderColor: "#eee" }
        ]}
      >
        <MaterialIcons 
          name={selected ? "check-box" : "check-box-outline-blank"} 
          size={22} 
          color={selected ? Colors.primary : "#777"} 
          style={styles.checkboxIcon}
        />
        <View style={styles.categoryContent}>
          <CategoryIcon icon={icon} color={color} />
          <Text numberOfLines={2} style={styles.categoryLabel}>{label}</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
};

export default function AddCertificateScreen() {
  // Get params if any
  const params = useLocalSearchParams();
  
  // Certificate form state
  const [certName, setCertName] = useState('');
  const [certIssuer, setCertIssuer] = useState('');
  const [certIssueDate, setCertIssueDate] = useState('');
  const [certExpiryDate, setCertExpiryDate] = useState('');
  const [certDescription, setCertDescription] = useState('');
  const [certFile, setCertFile] = useState<{uri: string, name: string} | null>(null);
  const [charCount, setCharCount] = useState(0);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  
  // Categories
  const categories = [
    { id: "zodiac", name: "Cung Hoàng Đạo", color: "#5E51DC", icon: "star" as any },
    { id: "physiognomy", name: "Nhân Tướng Học", color: "#2D87FB", icon: "visibility" as any },
    { id: "elements", name: "Ngũ Hành", color: "#31C452", icon: "link" as any },
    { id: "palmistry", name: "Chỉ Tay", color: "#F04E99", icon: "spa" as any },
    { id: "tarot", name: "Tarot", color: "#F8B940", icon: "casino" as any },
    { id: "other", name: "Khác", color: "#777777", icon: "more-horiz" as any }
  ];

  // Toggle category selection
  const toggleCategory = (categoryId: string) => {
    if (selectedCategories.includes(categoryId)) {
      setSelectedCategories(selectedCategories.filter(id => id !== categoryId));
    } else {
      setSelectedCategories([...selectedCategories, categoryId]);
    }
  };

  // Handle description change
  const handleDescriptionChange = (text: string) => {
    if (text.length <= 1000) {
      setCertDescription(text);
      setCharCount(text.length);
    }
  };

  // Handle file picking
  const handleFilePick = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        setCertFile({
          uri: file.uri,
          name: file.name
        });
      }
    } catch (error) {
      console.error('Error picking document:', error);
    }
  };

  // Handle adding certificate and navigate back
  const handleAddCertificate = () => {
    if (certName.trim()) {
      // Here save the certificate data then navigate back to the previous screen
      router.back();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={{ flex: 1 }}>
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.pageTitle}>Thêm chứng chỉ</Text>
          <Text style={styles.description}>
            Tải lên chứng chỉ hoặc bằng cấp liên quan đến chuyên môn của bạn
          </Text>
          
          <Text style={styles.inputLabel}>Tên chứng chỉ</Text>
          <TextInput
            mode="outlined"
            placeholder="Nhập họ và tên"
            value={certName}
            onChangeText={setCertName}
            style={styles.input}
          />
          
          <Text style={styles.inputLabel}>Tổ chức cấp</Text>
          <TextInput
            mode="outlined"
            placeholder="Nhập tên tổ chức cấp chứng chỉ"
            value={certIssuer}
            onChangeText={setCertIssuer}
            style={styles.input}
          />
          
          <Text style={styles.inputLabel}>Ngày nhận</Text>
          <TextInput
            mode="outlined"
            placeholder="dd/mm/yyyy"
            value={certIssueDate}
            onChangeText={setCertIssueDate}
            style={styles.input}
            left={<TextInput.Icon icon="calendar" />}
          />
          
          <Text style={styles.inputLabel}>Ngày hết hạn</Text>
          <TextInput
            mode="outlined"
            placeholder="dd/mm/yyyy"
            value={certExpiryDate}
            onChangeText={setCertExpiryDate}
            style={styles.input}
            left={<TextInput.Icon icon="calendar" />}
          />
          
          <Text style={styles.inputLabel}>Danh mục</Text>
          <View style={styles.categoriesContainer}>
            {categories.map(category => (
              <CategoryCheckbox 
                key={category.id}
                label={category.name}
                icon={category.icon}
                color={category.color}
                selected={selectedCategories.includes(category.id)}
                onPress={() => toggleCategory(category.id)}
              />
            ))}
          </View>
          <Text style={styles.categoryCountText}>Đã chọn {selectedCategories.length}/6 danh mục</Text>
          
          <Text style={styles.inputLabel}>Mô tả chứng chỉ</Text>
          <TextInput
            mode="outlined"
            placeholder="Mô tả ngắn gọn chứng chỉ của bạn..."
            value={certDescription}
            onChangeText={handleDescriptionChange}
            multiline
            numberOfLines={4}
            style={styles.textArea}
          />
          <Text style={styles.charCountText}>{charCount}/1000 ký tự</Text>
          
          <Text style={styles.inputLabel}>File chứng chỉ</Text>
          <TouchableOpacity style={styles.filePickButton} onPress={handleFilePick}>
            <MaterialIcons name="file-upload" size={24} color={Colors.primary} />
            <Text style={styles.filePickText}>
              {certFile ? certFile.name : "Chọn file để tải lên"}
            </Text>
          </TouchableOpacity>
          
          {/* Extra space at bottom for scrolling past buttons */}
          <View style={{ height: 80 }} />
        </ScrollView>
        
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "position" : undefined}
          style={styles.footerContainer}
          keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
        >
          <View style={styles.footer}>
            <Button
              mode="outlined"
              style={styles.cancelButton}
              onPress={() => router.back()}
            >
              Hủy
            </Button>
            <Button
              mode="contained"
              style={styles.addButton}
              labelStyle={{ color: 'white' }}
              onPress={handleAddCertificate}
              disabled={!certName.trim()}
            >
              Thêm chứng chỉ
            </Button>
          </View>
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100, // Extra padding at bottom to ensure content isn't hidden behind buttons
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
    marginVertical: 16,
  },
  description: {
    textAlign: 'center',
    color: Colors.gray,
    marginBottom: 24,
  },
  inputLabel: {
    fontWeight: "500",
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    marginBottom: 10,
    backgroundColor: "#fff",
  },
  categoriesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  categoryOption: {
    width: "49%",
    marginBottom: 16,
  },
  categoryButton: {
    borderWidth: 1,
    borderRadius: 10,
    height: 55,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  categoryContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  categoryIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  categoryLabel: {
    fontSize: 11,
    flex: 1,
    flexWrap: 'wrap',
  },
  checkboxIcon: {
    marginRight: 4,
  },
  categoryCountText: {
    fontSize: 12,
    color: Colors.gray,
    marginBottom: 12,
  },
  textArea: {
    backgroundColor: "#fff",
    minHeight: 100,
  },
  charCountText: {
    textAlign: "right",
    color: Colors.gray,
    fontSize: 12,
    marginTop: 4,
  },
  filePickButton: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.primary,
    borderStyle: "dashed",
    borderRadius: 8,
    padding: 16,
    marginVertical: 12,
  },
  filePickText: {
    marginLeft: 12,
    color: Colors.primary,
  },
  footerContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
  },
  footer: {
    flexDirection: "row",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    backgroundColor: '#fff',
  },
  cancelButton: {
    flex: 1,
    marginRight: 8,
    borderColor: Colors.gray,
  },
  addButton: {
    flex: 2,
    marginLeft: 8,
    backgroundColor: Colors.primary,
  },
});