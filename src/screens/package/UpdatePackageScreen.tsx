import MarkdownEditor from "@/src/components/MarkdownEditor";
import Colors from "@/src/constants/colors";
import { getKnowledgeCategories, getServicePackageDetail, updateServicePackage } from "@/src/services/api";
import { MaterialIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
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
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { Text, TextInput } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

type timeSlot = {
  weekDate: number,
  availableFrom: string,
  availableTo: string
}

export default function UpdatePackageScreen() {
  const { packageId } = useLocalSearchParams();
  const id = (packageId as string) || "";
  const [title, setTitle] = useState<string>("");
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  const [priceRaw, setPriceRaw] = useState<string>("");
  const [price, setPrice] = useState<string>(() => (priceRaw ? Number(priceRaw).toLocaleString("vi-VN") : ""));
  const [content, setContent] = useState<string>("");
  const [durationMinutes, setDurationMinutes] = useState<string>("");
  const [image, setImage] = useState<any>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [availableTimeSlots, setAvailableTimeSlots] = useState<timeSlot[]>([]);

  // --- Chuẩn hóa giờ thành HH:mm:ss ---
  const normalizeTime = (timeStr: string) => {
    if (!timeStr) return "00:00:00";
    const parts = timeStr.split(':');
    if (parts.length >= 2) {
      const h = parts[0].padStart(2, '0');
      const m = parts[1].padStart(2, '0');
      const s = parts[2] ? parts[2].padStart(2, '0') : '00';
      return `${h}:${m}:${s}`;
    }
    return timeStr;
  };

  useEffect(() => {
    (async () => {
      try {
        const pkgResp = await getServicePackageDetail(id);
        const data = pkgResp.data?.data;

        const pricetemp = data?.price ?? 0;
        const durationtemp = data?.durationMinutes ?? 0;

        setTitle(data?.packageTitle ?? "");
        setPriceRaw(pricetemp.toString());
        setPrice(Number(pricetemp).toLocaleString("vi-VN"));
        setDurationMinutes(durationtemp.toString());
        setImagePreview(data?.imageUrl ?? "");

        const rawSlots = data?.availableTimeSlots ?? [];
        const cleanSlots = rawSlots.map((s: any) => ({
          ...s,
          availableFrom: normalizeTime(s.availableFrom),
          availableTo: normalizeTime(s.availableTo),
        }));
        setAvailableTimeSlots(cleanSlots);

        const pkgCats = Array.isArray(data?.categories) ? data.categories : [];
        const pkgCatIds = pkgCats.map((c: any) => c.id).filter(Boolean);
        setSelectedCategoryIds(pkgCatIds);

        const rawContent: string = data?.packageContent ?? "";
        const plainContent = rawContent.replace(/<br\s*\/?>/g, "\n").replace(/<[^>]+>/g, "");
        setContent(plainContent);

        const allCatsResp = await getKnowledgeCategories({ page: 1, limit: 50, sortType: "desc", sortBy: "createdAt" });
        const fetchedCategories = allCatsResp.data?.data ?? [];
        setCategories(fetchedCategories);
      } catch (err) {
        console.error("Failed to load package detail / categories:", err);
        Alert.alert('Lỗi', 'Không thể tải dữ liệu. Hãy thử lại sau.');
      }
    })();
  }, [id]);

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const scaleAnim = useRef(new Animated.Value(0)).current;

  const [isPickerVisible, setPickerVisible] = useState(false);
  const [pickerField, setPickerField] = useState<'from' | 'to'>('from');

  const [activeDay, setActiveDay] = useState<number | null>(null);
  const [tempFrom, setTempFrom] = useState('09:00:00');
  const [tempTo, setTempTo] = useState('18:00:00');

  const dayMap: Record<string, number> = {
    T2: 2, T3: 3, T4: 4, T5: 5, T6: 6, T7: 7, CN: 8,
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
    });
    if (!result.canceled) setImage(result.assets[0]);
  };

  const toggleCategory = (cat: any) => {
    const catId = cat.id;
    if (!catId) return;
    setSelectedCategoryIds((prev) => {
      const exists = prev.includes(catId);
      if (exists) return prev.filter((x) => x !== catId);
      return [...prev, catId];
    });
  };

  const isDaySelected = (label: string) => {
    const day = dayMap[label];
    return availableTimeSlots.some((s) => s.weekDate === day);
  };

  const isDayActive = (label: string) => {
    const day = dayMap[label];
    return activeDay === day;
  };

  const onPressDay = (label: string) => {
    const weekDate = dayMap[label];
    if (activeDay === weekDate) {
      setActiveDay(null);
    } else {
      const existing = availableTimeSlots.find((p) => p.weekDate === weekDate);
      if (existing) {
        setTempFrom(normalizeTime(existing.availableFrom));
        setTempTo(normalizeTime(existing.availableTo));
      } else {
        setTempFrom('09:00:00');
        setTempTo('18:00:00');
      }
      setActiveDay(weekDate);
    }
  };

  const showPicker = (field: 'from' | 'to') => {
    if (activeDay === null) {
      Alert.alert('Chọn ngày', 'Vui lòng chọn 1 ngày để chỉnh giờ.');
      return;
    }
    setPickerField(field);
    setPickerVisible(true);
  };

  const hidePicker = () => {
    setPickerVisible(false);
  };

  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);

  const handleConfirm = (date: Date) => {
    hidePicker();
    const hh = pad(date.getHours());
    const mm = pad(date.getMinutes());
    const val = `${hh}:${mm}:00`;
    if (pickerField === 'from') setTempFrom(val);
    else setTempTo(val);
  };

  const applyTimesToActiveDay = () => {
    if (activeDay === null) {
      Alert.alert('Không có ngày', 'Không có ngày đang chỉnh.');
      return;
    }
    if (!tempFrom || !tempTo) {
      Alert.alert('Thiếu giờ', 'Vui lòng chọn giờ bắt đầu và kết thúc.');
      return;
    }

    const from = parseInt(tempFrom.replace(/\:/g, ""));
    const to = parseInt(tempTo.replace(/\:/g, ""));

    if (from >= to) {
      Alert.alert("Giờ không hợp lệ", "Giờ khởi đầu không thể bằng hoặc hơn giờ kết thúc. Vui lòng chọn lại.");
      return;
    }

    const safeFrom = normalizeTime(tempFrom);
    const safeTo = normalizeTime(tempTo);

    setAvailableTimeSlots((prev) => {
      const exists = prev.some((p) => p.weekDate === activeDay);
      if (exists) {
        return prev.map((p) => (p.weekDate === activeDay ? { ...p, availableFrom: safeFrom, availableTo: safeTo } : p));
      } else {
        return [...prev, { weekDate: activeDay, availableFrom: safeFrom, availableTo: safeTo }];
      }
    });
    setActiveDay(null);
  };

  const cancelEditingActiveDay = () => setActiveDay(null);

  const removeCommittedDay = (weekDate: number) => {
    setAvailableTimeSlots((prev) => prev.filter((p) => p.weekDate !== weekDate));
    if (activeDay === weekDate) setActiveDay(null);
  };

  const displayTime = (t: string) => (t ? t.slice(0, 5) : '');

  const handleSubmit = async () => {
    if (!title || !content || !priceRaw || !durationMinutes || !availableTimeSlots || (!image && !imagePreview)) {
      Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ thông tin');
      return;
    }

    try {
      setSubmitting(true);

      const cleanDescription = content.trim();

      const formData = new FormData();
      formData.append('packageTitle', title);
      formData.append('packageContent', cleanDescription);
      formData.append('durationMinutes', parseInt(durationMinutes).toString());
      formData.append('price', parseFloat(priceRaw).toString());

      selectedCategoryIds.forEach((cid) => formData.append('categoryIds[]', cid));

      const finalSlots = availableTimeSlots.map(s => ({
        ...s,
        availableFrom: normalizeTime(s.availableFrom),
        availableTo: normalizeTime(s.availableTo)
      }));
      // availableTimeSlots.forEach((time) => {
      //   formData.append('availableTimeSlots[]', JSON.stringify(time));
      // });
      //formData.append("availableTimeSlots", JSON.stringify(finalSlots));
      availableTimeSlots.forEach((slot, index) => {
        formData.append(`availableTimeSlots[${index}].weekDate`, slot.weekDate.toString());
        formData.append(`availableTimeSlots[${index}].availableFrom`, slot.availableFrom);
        formData.append(`availableTimeSlots[${index}].availableTo`, slot.availableTo);
      });

      if (image) {
        const fileName = image.fileName || image.uri.split('/').pop() || 'upload.jpg';
        const match = /\.(\w+)$/.exec(fileName);
        const type = match ? `image/${match[1]}` : 'image/jpeg';
        formData.append('image', { uri: image.uri, type, name: fileName } as any);
      }

      await updateServicePackage(id, formData);

      setSuccess(true);
      Animated.spring(scaleAnim, { toValue: 1, friction: 6, useNativeDriver: true }).start();

      setTimeout(() => {
        Animated.timing(scaleAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
          setSubmitting(false);
          setSuccess(false);
          router.replace('/my-packages');
        });
      }, 1500);
    } catch (err: any) {
      console.error('updateServicePackage error:', err);
      console.log("ERROR DATA:", err.response?.data);
      console.log("ERROR STATUS:", err.response?.status);
      console.log("ERROR HEADERS:", err.response?.headers);
      Alert.alert('Lỗi', err.response?.data?.message || 'Không thể cập nhật gói dịch vụ.');
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.header}>
          <MaterialIcons name="arrow-back" size={28} color="black" onPress={() => router.back()} />
          <View style={styles.titleContainer}>
            <Text variant="titleLarge" style={styles.title}>
              Cập nhật gói
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

            <Text style={{ marginBottom: 8, fontWeight: '600' }}>Thể loại</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {categories.map((cat) => {
                const selected = selectedCategoryIds.includes(cat.id);
                return (
                  <TouchableOpacity
                    key={cat.id}
                    onPress={() => toggleCategory(cat)}
                    style={[styles.chip, selected ? styles.chipSelected : styles.chipUnselected]}
                  >
                    <Text style={selected ? styles.chipTextSelected : styles.chipTextUnselected}>{cat.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TextInput
              mode="outlined"
              style={styles.input}
              left={<TextInput.Icon icon="currency-usd" />}
              placeholder="Giá gói (VND)"
              value={price}
              onChangeText={(text) => {
                const digits = text.replace(/\D/g, '');
                setPriceRaw(digits);
                if (!digits) setPrice('');
                else setPrice(Number(digits).toLocaleString('vi-VN'));
              }}
              keyboardType="numeric"
              maxLength={11}
            />

            <Text style={{ fontSize: 14, marginBottom: 8 }}>Mô tả ngắn</Text>
            <MarkdownEditor
              value={content}
              onChangeText={setContent}
              placeholder="Nhập mô tả (hỗ trợ markdown)..."
              minHeight={180}
            />

            <TouchableOpacity style={styles.imageUpload} onPress={pickImage}>
              {image || imagePreview ? (
                <Image source={{ uri: image?.uri || imagePreview }} style={styles.imagePreview} />
              ) : (
                <Text style={styles.uploadText}>+ Ảnh minh hoạ</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Thời gian rảnh</Text>
            <Text style={{ marginBottom: 8 }}>Chọn ngày để chỉnh giờ. Chỉ khi nhấn "Áp dụng giờ cho ngày này" sẽ lưu ngày vào slots.</Text>
            <Text style={{ marginBottom: 8 }}>Lưu ý: Khung giờ chỉ ở trong ngày được chọn (VD: T2 21h30 - T3 2h là cấm).</Text>

            <View style={styles.durationContainer}>
              {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((d) => {
                const selected = isDaySelected(d);
                const active = isDayActive(d);
                return (
                  <TouchableOpacity
                    key={d}
                    style={[styles.timeBtn, selected && styles.timeBtnSelected, active && styles.timeBtnActive]}
                    onPress={() => onPressDay(d)}
                  >
                    <Text style={[styles.durationText, active ? { color: '#fff', fontWeight: '700' } : undefined]}>{d}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={{ marginTop: 12 }}>
              <Text style={{ marginBottom: 6 }}>Giờ (chỉ chỉnh khi 1 ngày đang active)</Text>

              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                <TouchableOpacity style={styles.timeInputTouchable} onPress={() => showPicker('from')}>
                  <Text style={styles.timeInputLabel}>Rảnh từ</Text>
                  <Text style={styles.timeInputValue}>{activeDay ? displayTime(tempFrom) : '--:--'}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.timeInputTouchable} onPress={() => showPicker('to')}>
                  <Text style={styles.timeInputLabel}>Cho đến</Text>
                  <Text style={styles.timeInputValue}>{activeDay ? displayTime(tempTo) : '--:--'}</Text>
                </TouchableOpacity>
              </View>

              {activeDay !== null && (
                <View style={{ flexDirection: 'row', marginTop: 12 }}>
                  <TouchableOpacity style={styles.applyBtn} onPress={applyTimesToActiveDay}>
                    <Text style={{ color: '#fff', fontWeight: '700' }}>Áp dụng giờ cho ngày này</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.cancelBtn} onPress={cancelEditingActiveDay}>
                    <Text style={{ color: '#333' }}>Hủy</Text>
                  </TouchableOpacity>
                </View>
              )}

              {availableTimeSlots.length > 0 && (
                <View style={{ marginTop: 14 }}>
                  <Text style={{ fontWeight: '600', marginBottom: 8 }}>Ngày đã chọn</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {availableTimeSlots
                      .slice()
                      .sort((a, b) => a.weekDate - b.weekDate)
                      .map((s) => (
                        <View key={s.weekDate} style={styles.selectedSummary}>
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Text style={{ fontWeight: '700', marginRight: 8 }}>{s.weekDate == 8 ? "Chủ Nhật" : "Thứ " + s.weekDate}</Text>
                            <TouchableOpacity onPress={() => removeCommittedDay(s.weekDate)}>
                              <MaterialIcons name="close" size={16} color="#999" />
                            </TouchableOpacity>
                          </View>
                          <Text>{displayTime(s.availableFrom)} - {displayTime(s.availableTo)}</Text>
                        </View>
                      ))}
                  </View>
                </View>
              )}
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Thời lượng (phút)</Text>
            <View style={styles.durationContainer}>
              {[15, 30, 45, 60, 90, 120].map((d) => (
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
              maxLength={3}
            />
          </View>

          <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={submitting}>
            <Text style={styles.submitText}>Cập nhật gói dịch vụ</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={submitting} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          {!success ? (
            <View style={styles.modalBox}>
              <ActivityIndicator size="large" color={Colors.primary || '#1877F2'} />
              <Text style={styles.modalText}>Đang cập nhật gói dịch vụ...</Text>
            </View>
          ) : (
            <Animated.View style={[styles.successBox, { transform: [{ scale: scaleAnim }] }]}>
              <MaterialIcons name="check-circle" size={70} color="#16a34a" />
              <Text style={styles.successText}>Cập nhật thành công!</Text>
            </Animated.View>
          )}
        </View>
      </Modal>

      <DateTimePickerModal isVisible={isPickerVisible} mode="time" onConfirm={handleConfirm} onCancel={hidePicker} is24Hour={true} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.grayBackground },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: Colors.background,
  },
  titleContainer: { flex: 1, alignItems: 'center' },
  title: { fontWeight: 'bold' },
  content: { flex: 1, padding: 10 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  input: { borderRadius: 12, marginBottom: 12, fontSize: 14 },
  markdownEditorContainer: {
    minHeight: 200,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    marginBottom: 12,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  markdownInput: {
    flex: 1,
    minHeight: 180,
    padding: 12,
    fontSize: 14,
    fontFamily: 'inter',
  },
  imageUpload: {
    height: 150,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 10,
  },
  uploadText: { color: '#666' },
  imagePreview: { width: '100%', height: '100%', borderRadius: 6 },

  chip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  chipSelected: {
    backgroundColor: Colors.primary || '#1877F2',
    borderColor: Colors.primary || '#1877F2',
  },
  chipUnselected: {
    backgroundColor: '#fff',
  },
  chipTextSelected: { color: '#fff', fontWeight: '700' },
  chipTextUnselected: { color: '#333' },

  durationContainer: { flexDirection: 'row', marginVertical: 10 },
  durationBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    marginRight: 8,
  },
  durationSelected: { backgroundColor: Colors.primary, borderColor: Colors.grayBackground },
  durationText: { color: '#000' },

  timeBtn: {
    paddingVertical: 8,
    paddingHorizontal: 13,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    marginRight: 8,
    backgroundColor: '#fff',
  },
  timeBtnSelected: {
    backgroundColor: '#f59e0b22',
    borderColor: '#f59e0b',
  },
  timeBtnActive: {
    backgroundColor: Colors.primary || '#1877F2',
    borderColor: Colors.primary || '#1877F2',
  },

  timeInputTouchable: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  timeInputLabel: { fontSize: 12, color: '#666' },
  timeInputValue: { fontSize: 16, marginTop: 6 },

  applyBtn: {
    backgroundColor: Colors.primary || '#1877F2',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 8,
    marginRight: 8,
  },
  cancelBtn: {
    borderWidth: 1,
    borderColor: '#ccc',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 8,
    justifyContent: 'center',
  },

  selectedSummary: {
    backgroundColor: '#f7fafc',
    padding: 8,
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 8,
    minWidth: 120,
    alignItems: 'flex-start',
  },

  submitButton: {
    backgroundColor: '#16a34a',
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 32,
    alignItems: 'center',
  },
  submitText: { color: '#fff', fontWeight: '600', fontSize: 16 },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBox: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    width: 220,
  },
  modalText: {
    marginTop: 12,
    color: '#000',
    fontWeight: '600',
    textAlign: 'center',
  },
  successBox: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successText: {
    marginTop: 8,
    color: '#16a34a',
    fontWeight: 'bold',
    fontSize: 18,
  },
});