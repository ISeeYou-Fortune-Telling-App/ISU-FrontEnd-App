import Colors from "@/src/constants/colors";
import { getKnowledgeCategories } from "@/src/services/api";
import { X } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Button, TextInput } from "react-native-paper";

const categoryPalette: Record<string, { background: string; text: string }> = {
  "Cung Hoàng Đạo": { background: Colors.categoryColors.zodiac.chip, text: Colors.categoryColors.zodiac.icon },
  "Ngũ Hành": { background: Colors.categoryColors.elements.chip, text: Colors.categoryColors.elements.icon },
  "Nhân Tướng Học": { background: Colors.categoryColors.physiognomy.chip, text: Colors.categoryColors.physiognomy.icon },
  "Chỉ Tay": { background: Colors.categoryColors.palmistry.chip, text: Colors.categoryColors.palmistry.icon },
  Tarot: { background: Colors.categoryColors.tarot.chip, text: Colors.categoryColors.tarot.icon },
  Khác: { background: Colors.categoryColors.other.chip, text: Colors.categoryColors.other.icon },
};

const getCategoryStyle = (category: string) =>
  categoryPalette[category] ?? { background: "#F2F2F2", text: "#4F4F4F" };

type SearchParams = {
  title: string;
  categoryIds?: string[];
  status?: string | null;
  sortType?: "asc" | "desc";
  sortBy?: "createdAt" | "viewCount" | "title";
};

export default function KnowledgeSearchModal({
  visible,
  onClose,
  onApply,
  initial,
}: {
  visible: boolean;
  onClose: () => void;
  onApply?: (params: SearchParams) => void;
  initial?: Partial<SearchParams>;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [titleError, setTitleError] = useState(false);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>(initial?.categoryIds ?? []);
  const [sortType, setSortType] = useState<"desc" | "asc">((initial?.sortType as any) ?? "desc");
  const [sortBy, setSortBy] = useState<"createdAt" | "viewCount" | "title">((initial?.sortBy as any) ?? "createdAt");
  const [loadingCategories, setLoadingCategories] = useState(false);

  useEffect(() => {
    setTitle(initial?.title ?? "");
    setTitleError(false);
    setSelectedCategoryIds(initial?.categoryIds ?? []);
    setSortType((initial?.sortType as any) ?? "desc");
    setSortBy((initial?.sortBy as any) ?? "createdAt");
  }, [initial]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoadingCategories(true);
        const resp = await getKnowledgeCategories({ page: 1, limit: 200 });
        if (!mounted) return;
        const payload = resp?.data ?? resp?.data?.data ?? resp?.data?.items ?? [];
        const arr = Array.isArray(payload) ? payload : Array.isArray(resp?.data?.data) ? resp.data.data : [];
        const mapped = arr.map((c: any, idx: number) => ({ id: String(c?.id ?? c?.categoryId ?? idx), name: c?.name ?? c?.title ?? c?.label ?? "" }));
        setCategories(mapped.filter((c: any) => c.name));
      } catch (e) {
        // ignore
      } finally {
        setLoadingCategories(false);
      }
    };

    if (visible) load();
    return () => {
      mounted = false;
    };
  }, [visible]);

  const handleApply = () => {
    setTitleError(false);
    onApply?.({ title: title.trim(), categoryIds: selectedCategoryIds.length > 0 ? selectedCategoryIds : undefined, status: 'PUBLISHED', sortType, sortBy });
    onClose();
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose} activeOpacity={0.7}>
            <X size={24} color="#6B7280" />
          </TouchableOpacity>
          <ScrollView keyboardShouldPersistTaps="handled">
            <Text style={styles.modalTitle}>Tìm kiếm bài viết</Text>

            <TextInput label="Tiêu đề" value={title} onChangeText={(text) => { setTitle(text); if (titleError) setTitleError(false); }} mode="outlined" style={styles.input} />
            {titleError && <Text style={styles.errorText}>Tiêu đề là bắt buộc</Text>}

            <Text style={styles.label}>Danh mục</Text>
            {loadingCategories ? (
              <ActivityIndicator color={Colors.primary} />
            ) : (
              <View style={styles.chipContainer}>
                {categories.map((c) => {
                  const palette = getCategoryStyle(c.name);
                  const isSelected = selectedCategoryIds.includes(c.id);
                  return (
                    <TouchableOpacity
                      key={c.id}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: isSelected ? palette.background : 'transparent',
                          borderWidth: 1,
                          borderColor: isSelected ? palette.text : '#E5E7EB'
                        },
                        isSelected && styles.chipSelected
                      ]}
                      onPress={() => {
                        setSelectedCategoryIds(prev =>
                          prev.includes(c.id) ? prev.filter(id => id !== c.id) : [...prev, c.id]
                        );
                      }}
                    >
                      <Text style={[styles.chipText, { color: isSelected ? palette.text : 'black', fontWeight: isSelected ? '600' : '400' }]}>{c.name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            <Text style={[styles.label, { marginTop: 12 }]}>Thứ tự</Text>
            <View style={styles.row}>
              {[
                { value: "desc", label: "Giảm dần" },
                { value: "asc", label: "Tăng dần" },
              ].map((s) => (
                <TouchableOpacity key={s.value} style={[styles.pill, sortType === s.value ? styles.pillActive : null]} onPress={() => setSortType(s.value as any)}>
                  <Text style={[styles.pillText, sortType === s.value ? styles.pillTextActive : null]}>{s.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.label, { marginTop: 12 }]}>Sắp xếp theo</Text>
            <View style={[styles.row, { marginTop: 8 }]}> 
              {[
                { value: "createdAt", label: "Ngày" },
                { value: "viewCount", label: "Lượt xem" },
                { value: "title", label: "Tiêu đề" },
              ].map((s) => (
                <TouchableOpacity key={s.value} style={[styles.pill, sortBy === s.value ? styles.pillActive : null]} onPress={() => setSortBy(s.value as any)}>
                  <Text style={[styles.pillText, sortBy === s.value ? styles.pillTextActive : null]}>{s.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.buttonRow}>
              <Button mode="text" onPress={onClose}>Huỷ</Button>
              <Button mode="contained" onPress={handleApply}>Áp dụng</Button>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "center", alignItems: "center" },
  modalCard: { width: "90%", maxHeight: "80%", backgroundColor: Colors.white, borderRadius: 12, padding: 16 },
  modalTitle: { fontSize: 16, fontWeight: "700", marginBottom: 12, color: Colors.black },
  input: { marginBottom: 8 },
  label: { fontSize: 13, color: "#374151", marginBottom: 8 },
  listBox: { maxHeight: 300, borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 8, padding: 8 },
  option: { paddingVertical: 8, paddingHorizontal: 10, borderRadius: 8 },
  optionActive: { backgroundColor: "#EEF2FF" },
  optionText: { color: "#374151" },
  optionTextActive: { color: Colors.primary, fontWeight: "600" },
  categoryOption: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8 },
  categoryOptionActive: { backgroundColor: "#EEF2FF" },
  categoryChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  categoryChipText: {
    fontSize: 12,
    fontFamily: "Inter",
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center'
  },
  chipSelected: {
    paddingVertical: 7,
    paddingHorizontal: 15,
  },
  chipText: {
    fontSize: 14,
  },
  row: { flexDirection: "row", flexWrap: "wrap" },
  pill: { paddingVertical: 8, paddingHorizontal: 10, borderRadius: 16, borderWidth: 1, borderColor: "#E5E7EB", marginRight: 8, marginBottom: 8 },
  pillActive: { backgroundColor: "#EEF2FF", borderColor: Colors.primary },
  pillText: { color: "#374151" },
  pillTextActive: { color: Colors.primary, fontWeight: "600" },
  buttonRow: { flexDirection: "row", justifyContent: "flex-end", marginTop: 12 },
  closeButton: { position: "absolute", top: 12, right: 12, padding: 4, zIndex: 1 },
  errorText: { color: "red", fontSize: 12, marginTop: 4, marginBottom: 8 },
});
