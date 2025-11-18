import Colors from "@/src/constants/colors";
import { createCertificate, getKnowledgeCategories, updateCertificate } from "@/src/services/api";
import { MaterialIcons } from "@expo/vector-icons";
import * as DocumentPicker from 'expo-document-picker';
import { router, useLocalSearchParams } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { LucideCoins, LucideEye, LucideHand, LucideMoreHorizontal, LucideSparkles, LucideStar } from "lucide-react-native";
import { useEffect, useState } from "react";
import {
    Linking,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View
} from 'react-native';
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { Button, Text, TextInput } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

const CATEGORY_MAPPINGS: Record<string, { icon: string; color: string; bgColor: string }> = {
  "Cung Hoàng Đạo": { icon: "star", color: Colors.categoryColors.zodiac.icon, bgColor: Colors.categoryColors.zodiac.chip },
  "Nhân Tướng Học": { icon: "eye", color: Colors.categoryColors.physiognomy.icon, bgColor: Colors.categoryColors.physiognomy.chip },
  "Ngũ Hành": { icon: "coins", color: Colors.categoryColors.elements.icon, bgColor: Colors.categoryColors.elements.chip },
  "Chỉ Tay": { icon: "hand", color: Colors.categoryColors.palmistry.icon, bgColor: Colors.categoryColors.palmistry.chip },
  "Tarot": { icon: "sparkles", color: Colors.categoryColors.tarot.icon, bgColor: Colors.categoryColors.tarot.chip },
  "Khác": { icon: "moreHorizontal", color: Colors.categoryColors.other.icon, bgColor: Colors.categoryColors.other.chip }
};

const CategoryIcon = ({ icon, color, bgColor }: { icon: string; color: string; bgColor: string }) => {
  return (
    <View style={[styles.categoryIcon, { backgroundColor: bgColor }]}>
      {icon === "star" && <LucideStar size={24} color={color} />}
      {icon === "eye" && <LucideEye size={24} color={color} />}
      {icon === "coins" && <LucideCoins size={24} color={color} />}
      {icon === "hand" && <LucideHand size={24} color={color} />}
      {icon === "sparkles" && <LucideSparkles size={24} color={color} />}
      {icon === "moreHorizontal" && <LucideMoreHorizontal size={24} color={color} />}
    </View>
  );
};

const CategoryCheckbox = ({ 
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
    <View style={styles.categoryOption}>
      <TouchableOpacity
        onPress={onPress}
        style={[
          styles.categoryButton,
          selected ? { backgroundColor: bgColor, borderColor: color } : { backgroundColor: 'white', borderColor: "#eee" }
        ]}
      >
        <MaterialIcons 
          name={selected ? "check-box" : "check-box-outline-blank"} 
          size={22} 
          color={selected ? Colors.primary : "#777"} 
          style={styles.checkboxIcon}
        />
        <View style={styles.categoryContent}>
          <CategoryIcon icon={icon} color={color} bgColor={bgColor} />
          <Text numberOfLines={2} style={styles.categoryLabel}>{label}</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
};

export default function CertificateDetailScreen() {
  const params = useLocalSearchParams();
  const mode = params.mode as string || 'registration';
  const certificateId = params.certificateId as string;
  const isViewMode = mode === 'view';
  const [isEditingEnabled, setIsEditingEnabled] = useState(false);
  
  const [certName, setCertName] = useState('');
  const [certIssuer, setCertIssuer] = useState('');
  const [certIssueDate, setCertIssueDate] = useState('');
  const [certExpiryDate, setCertExpiryDate] = useState('');
  const [certDescription, setCertDescription] = useState('');
  const [certFile, setCertFile] = useState<{uri: string, name: string, type?: string} | null>(null);
  const [charCount, setCharCount] = useState(0);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [showIssueDatePicker, setShowIssueDatePicker] = useState(false);
  const [showExpiryDatePicker, setShowExpiryDatePicker] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [loadingCertificate, setLoadingCertificate] = useState(false);

  useEffect(() => {
    if (isViewMode && certificateId) {
      setSelectedCategories([]);
      
      const loadCertificate = async () => {
        setLoadingCertificate(true);
        try {
          const { getCertificates } = await import('@/src/services/api');
          const userId = await SecureStore.getItemAsync('userId');
          
          if (userId) {
            const response = await getCertificates(userId, { page: 1, limit: 100 });
            const certificate = response.data.data.find((cert: any) => cert.id === certificateId);
            
            if (certificate) {
              setCertName(certificate.certificateName);
              setCertIssuer(certificate.issuedBy);
              
              const issueDate = new Date(certificate.issuedAt);
              setCertIssueDate(formatDate(issueDate));
              
              if (certificate.expirationDate) {
                const expiryDate = new Date(certificate.expirationDate);
                setCertExpiryDate(formatDate(expiryDate));
              }
              
              setCertDescription(certificate.certificateDescription || '');
              setCharCount((certificate.certificateDescription || '').length);
              
              if (certificate.certificateUrl) {
                setCertFile({
                  uri: certificate.certificateUrl,
                  name: certificate.certificateName + ' - Certificate',
                  type: 'application/pdf'
                });
              }
              
              if (certificate.categories && Array.isArray(certificate.categories) && categories.length > 0) {
                const matchedIds = categories
                  .filter((cat: any) => certificate.categories.includes(cat.name))
                  .map((cat: any) => cat.id);
                setSelectedCategories(matchedIds);
              } else if (certificate.categories && Array.isArray(certificate.categories)) {
                (window as any).__tempCertCategories = certificate.categories;
              }
            }
          }
        } catch (error) {
          console.error('Error loading certificate:', error);
        } finally {
          setLoadingCertificate(false);
        }
      };
      loadCertificate();
    };
  }, [isViewMode, certificateId, categories]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await getKnowledgeCategories();
        
        const categoriesData = response?.data?.data || [];
        const arr = Array.isArray(categoriesData) ? categoriesData : [];
        
        const transformedCategories = arr.map((category: any) => {
          const mapping = CATEGORY_MAPPINGS[category.name] || { icon: "star", color: Colors.categoryColors.zodiac.icon, bgColor: Colors.categoryColors.zodiac.chip };
          return {
            id: category.id,
            name: category.name,
            color: mapping.color,
            bgColor: mapping.bgColor,
            icon: mapping.icon as any
          };
        });
        
        setCategories(transformedCategories);
        
        if (isViewMode && (window as any).__tempCertCategories) {
          const certCategoryNames = (window as any).__tempCertCategories;
          const matchedIds = transformedCategories
            .filter((cat: any) => certCategoryNames.includes(cat.name))
            .map((cat: any) => cat.id);
          setSelectedCategories(matchedIds);
          delete (window as any).__tempCertCategories;
        }
      } catch (error) {
        console.error('CertificateDetailScreen - Error fetching categories:', error);
        const fallbackCategories = Object.entries(CATEGORY_MAPPINGS).map(([name, mapping], index) => ({
          id: `fallback-${index}`,
          name,
          color: mapping.color,
          bgColor: mapping.bgColor,
          icon: mapping.icon as any
        }));
        setCategories(fallbackCategories);
      } finally {
        setLoadingCategories(false);
      }
    };

    fetchCategories();
  }, []);

  const toggleCategory = (categoryId: string) => {
    if (selectedCategories.includes(categoryId)) {
      setSelectedCategories(selectedCategories.filter(id => id !== categoryId));
    } else {
      setSelectedCategories([...selectedCategories, categoryId]);
    }
  };

  const handleDescriptionChange = (text: string) => {
    if (text.length <= 1000) {
      setCertDescription(text);
      setCharCount(text.length);
    }
  };

  const handleFileView = async () => {
    if (certFile && certFile.uri) {
      try {
        const canOpen = await Linking.canOpenURL(certFile.uri);
        if (canOpen) {
          await Linking.openURL(certFile.uri);
        } else {
          console.error('Cannot open URL:', certFile.uri);
          alert('Không thể mở file. Vui lòng thử lại.');
        }
      } catch (error) {
        console.error('Error opening file:', error);
        alert('Có lỗi khi mở file.');
      }
    }
  };

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
          name: file.name,
          type: file.mimeType || 'application/octet-stream'
        });
      }
    } catch (error) {
      console.error('Error picking document:', error);
    }
  };

  const formatDate = (date: Date) => {
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const handleIssueDateConfirm = (date: Date) => {
    setCertIssueDate(formatDate(date));
    setShowIssueDatePicker(false);
  };

  const handleExpiryDateConfirm = (date: Date) => {
    setCertExpiryDate(formatDate(date));
    setShowExpiryDatePicker(false);
  };

  const handleAddCertificate = async () => {
    if (!certName.trim() || !certIssuer.trim() || !certIssueDate || !certExpiryDate) {
      alert("Vui lòng điền đầy đủ thông tin chứng chỉ");
      return;
    }

    if (mode === 'create' && !certFile) {
      alert("Vui lòng chọn file chứng chỉ");
      return;
    }

    setSubmitting(true);

    const issuedAt = `${certIssueDate.split('/')[2]}-${certIssueDate.split('/')[1].padStart(2, '0')}-${certIssueDate.split('/')[0].padStart(2, '0')}T00:00:00`;
    const expirationDate = `${certExpiryDate.split('/')[2]}-${certExpiryDate.split('/')[1].padStart(2, '0')}-${certExpiryDate.split('/')[0].padStart(2, '0')}T00:00:00`;

    try {
      if (mode === 'create' || (mode === 'view' && isEditingEnabled)) {
        const formData = new FormData();
        formData.append('certificateName', certName.trim());
        formData.append('certificateDescription', certDescription.trim());
        formData.append('issuedBy', certIssuer.trim());
        formData.append('issuedAt', issuedAt);
        formData.append('expirationDate', expirationDate);
        
        if (certFile && !certFile.uri.startsWith('http')) {
          formData.append('certificateFile', {
            uri: certFile.uri,
            name: certFile.name,
            type: certFile.type || 'image/jpeg',
          } as any);
        }
        
        selectedCategories.forEach(categoryId => {
          formData.append('categoryIds', categoryId);
        });

        if (mode === 'view' && certificateId) {
          await updateCertificate(certificateId, formData);
        } else {
          await createCertificate(formData);
        }
        router.replace("/manage-certificate?refresh=true");
      } else {
        const certificateData = {
          id: Date.now().toString(),
          certificateName: certName.trim(),
          certificateDescription: certDescription.trim(),
          issuedBy: certIssuer.trim(),
          issuedAt,
          expirationDate,
          certificateFile: certFile,
          categoryIds: selectedCategories
        };

        const existingCerts = await SecureStore.getItemAsync("tempCertificates");
        const certificates = existingCerts ? JSON.parse(existingCerts) : [];

        certificates.push(certificateData);

        await SecureStore.setItemAsync("tempCertificates", JSON.stringify(certificates));
      }

      router.back();
    } catch (error) {
      console.error('Error adding certificate:', error);
      alert("Có lỗi xảy ra. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <MaterialIcons name="arrow-back" size={28} color={Colors.black} onPress={() => router.back()} />
        <View style={styles.titleContainer}>
          <Text variant="titleLarge" style={styles.title}>{isViewMode ? 'Chi tiết chứng chỉ' : 'Thêm chứng chỉ'}</Text>
        </View>
        <View style={styles.headerPlaceholder} />
      </View>
      
      <View style={{ flex: 1 }}>
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.pageTitle}>{isViewMode ? 'Chi tiết chứng chỉ' : 'Thêm chứng chỉ'}</Text>
          <Text style={styles.description}>
            {isViewMode ? 'Xem thông tin chi tiết của chứng chỉ' : 'Tải lên chứng chỉ hoặc bằng cấp liên quan đến chuyên môn của bạn'}
          </Text>
          
          <Text style={styles.inputLabel}>Tên chứng chỉ</Text>
          {isViewMode && !isEditingEnabled ? (
            <ScrollView style={styles.viewModeFieldScroll} nestedScrollEnabled={true}>
              <View style={styles.viewModeFieldBox}>
                <Text style={styles.viewModeFieldText}>{certName || 'Không có tên'}</Text>
              </View>
            </ScrollView>
          ) : (
            <TextInput
              mode="outlined"
              placeholder="Nhập tên chứng chỉ"
              value={certName}
              onChangeText={setCertName}
              style={styles.input}
            />
          )}
          
          <Text style={styles.inputLabel}>Tổ chức cấp</Text>
          {isViewMode && !isEditingEnabled ? (
            <ScrollView style={styles.viewModeFieldScroll} nestedScrollEnabled={true}>
              <View style={styles.viewModeFieldBox}>
                <Text style={styles.viewModeFieldText}>{certIssuer || 'Không có thông tin'}</Text>
              </View>
            </ScrollView>
          ) : (
            <TextInput
              mode="outlined"
              placeholder="Nhập tên tổ chức cấp chứng chỉ"
              value={certIssuer}
              onChangeText={setCertIssuer}
              style={styles.input}
            />
          )}
          
          <Text style={styles.inputLabel}>Ngày nhận</Text>
          <TouchableOpacity onPress={() => (!isViewMode || isEditingEnabled) && setShowIssueDatePicker(true)} disabled={isViewMode && !isEditingEnabled}>
            <TextInput
              mode="outlined"
              placeholder="dd/mm/yyyy"
              value={certIssueDate}
              editable={false}
              pointerEvents="none"
              style={styles.input}
              textColor={isViewMode && !isEditingEnabled ? '#666666' : undefined}
              left={<TextInput.Icon icon="calendar" />}
            />
          </TouchableOpacity>
          <DateTimePickerModal
            isVisible={showIssueDatePicker}
            mode="date"
            onConfirm={handleIssueDateConfirm}
            onCancel={() => setShowIssueDatePicker(false)}
          />
          
          <Text style={styles.inputLabel}>Ngày hết hạn</Text>
          <TouchableOpacity onPress={() => (!isViewMode || isEditingEnabled) && setShowExpiryDatePicker(true)} disabled={isViewMode && !isEditingEnabled}>
            <TextInput
              mode="outlined"
              placeholder="dd/mm/yyyy"
              value={certExpiryDate}
              editable={false}
              pointerEvents="none"
              style={styles.input}
              textColor={isViewMode && !isEditingEnabled ? '#666666' : undefined}
              left={<TextInput.Icon icon="calendar" />}
            />
          </TouchableOpacity>
          <DateTimePickerModal
            isVisible={showExpiryDatePicker}
            mode="date"
            onConfirm={handleExpiryDateConfirm}
            onCancel={() => setShowExpiryDatePicker(false)}
          />
          
          <Text style={styles.inputLabel}>Danh mục</Text>
          <View style={styles.categoriesContainer}>
            {loadingCategories ? (
              <Text style={styles.loadingText}>Đang tải danh mục...</Text>
            ) : (
              categories.map(category => (
                <CategoryCheckbox 
                  key={category.id}
                  label={category.name}
                  icon={category.icon}
                  color={category.color}
                  bgColor={category.bgColor}
                  selected={selectedCategories.includes(category.id)}
                  onPress={() => (!isViewMode || isEditingEnabled) && toggleCategory(category.id)}
                />
              ))
            )}
          </View>
          <Text style={styles.categoryCountText}>
            {isViewMode ? `Danh mục: ${selectedCategories.length}` : `Đã chọn ${selectedCategories.length}/6 danh mục`}
          </Text>
          
          <Text style={styles.inputLabel}>Mô tả chứng chỉ</Text>
          {isViewMode && !isEditingEnabled ? (
            <ScrollView style={styles.viewModeDescriptionScroll} nestedScrollEnabled={true}>
              <View style={styles.viewModeDescriptionBox}>
                <Text style={styles.viewModeDescriptionText}>{certDescription || 'Không có mô tả'}</Text>
              </View>
            </ScrollView>
          ) : (
            <TextInput
              mode="outlined"
              placeholder="Mô tả ngắn gọn chứng chỉ của bạn..."
              value={certDescription}
              onChangeText={handleDescriptionChange}
              multiline
              numberOfLines={4}
              style={styles.textArea}
              editable={true}
            />
          )}
          <Text style={styles.charCountText}>{charCount}/1000 ký tự</Text>
          
          <Text style={styles.inputLabel}>File chứng chỉ</Text>
          <TouchableOpacity 
            style={[styles.filePickButton, isViewMode && !isEditingEnabled && certFile && styles.fileViewButton]} 
            onPress={isViewMode && !isEditingEnabled && certFile ? handleFileView : handleFilePick}
          >
            <MaterialIcons 
              name={isViewMode && !isEditingEnabled ? (certFile ? "open-in-new" : "description") : "file-upload"} 
              size={24} 
              color={isViewMode && !isEditingEnabled && certFile ? Colors.primary : isViewMode && !isEditingEnabled ? Colors.gray : Colors.primary} 
            />
            <Text style={[styles.filePickText, isViewMode && !isEditingEnabled && !certFile && { color: Colors.gray }]}>
              {certFile ? (isViewMode && !isEditingEnabled ? `Xem file: ${certFile.name}` : certFile.name) : "Chọn file để tải lên"}
            </Text>
          </TouchableOpacity>
          
          <View style={{ height: 80 }} />
        </ScrollView>
        
        <View style={styles.footer}>
          {isViewMode && !isEditingEnabled ? (
            <>
              <Button
                mode="outlined"
                style={styles.cancelButton}
                onPress={() => router.back()}
              >
                Quay lại
              </Button>
              <Button
                mode="contained"
                style={styles.addButton}
                labelStyle={{ color: 'white' }}
                onPress={() => setIsEditingEnabled(true)}
              >
                Chỉnh sửa
              </Button>
            </>
          ) : isViewMode && isEditingEnabled ? (
            <>
              <Button
                mode="outlined"
                style={styles.cancelButton}
                onPress={() => setIsEditingEnabled(false)}
              >
                Hủy
              </Button>
              <Button
                mode="contained"
                style={styles.addButton}
                labelStyle={{ color: 'white' }}
                onPress={handleAddCertificate}
                disabled={!certName.trim() || submitting}
                loading={submitting}
              >
                Lưu thay đổi
              </Button>
            </>
          ) : (
            <>
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
                disabled={!certName.trim() || submitting}
                loading={submitting}
              >
                Thêm chứng chỉ
              </Button>
            </>
          )}
        </View>
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
  viewModeFieldScroll: {
    maxHeight: 100,
    borderWidth: 1,
    borderColor: '#666666',
    borderRadius: 4,
    marginBottom: 10,
  },
  viewModeFieldBox: {
    padding: 12,
    backgroundColor: '#fff',
  },
  viewModeFieldText: {
    fontSize: 16,
    color: '#666666',
    lineHeight: 24,
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
  loadingText: {
    textAlign: "center",
    color: Colors.gray,
    fontSize: 14,
    marginVertical: 20,
  },
  textArea: {
    backgroundColor: "#fff",
    minHeight: 100,
  },
  viewModeTextArea: {
    height: 160,
  },
  descriptionContainer: {
    marginBottom: 10,
  },
  viewModeDescriptionScroll: {
    maxHeight: 160,
    borderWidth: 1,
    borderColor: '#666666',
    borderRadius: 4,
    marginBottom: 10,
  },
  viewModeDescriptionBox: {
    padding: 12,
    backgroundColor: '#fff',
  },
  viewModeDescriptionText: {
    fontSize: 16,
    color: '#666666',
    lineHeight: 24,
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
  fileViewButton: {
    borderStyle: "solid",
    borderWidth: 1.5,
    backgroundColor: '#f8f9fa',
  },
  filePickText: {
    marginLeft: 12,
    color: Colors.primary,
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
    borderColor: Colors.primary,
    borderRadius: 10,
  },
  addButton: {
    flex: 1,
    marginLeft: 8,
    backgroundColor: Colors.primary,
    borderRadius: 10,
  },
});