import Colors from "@/src/constants/colors";
import { getKnowledgeCategories } from "@/src/services/api";
import { ChevronDown, ChevronUp, X } from "lucide-react-native";
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
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [selectorLayout, setSelectorLayout] = useState({ y: 0, height: 0 });
  const [status, setStatus] = useState<string | null>(initial?.status ?? null);
  const [sortType, setSortType] = useState<"desc" | "asc">((initial?.sortType as any) ?? "desc");
  const [sortBy, setSortBy] = useState<"createdAt" | "viewCount" | "title">((initial?.sortBy as any) ?? "createdAt");
  const [loadingCategories, setLoadingCategories] = useState(false);

  useEffect(() => {
    setTitle(initial?.title ?? "");
    setTitleError(false);
    setSelectedCategoryIds(initial?.categoryIds ?? []);
    setStatus(initial?.status ?? null);
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
    if (!title.trim()) {
      setTitleError(true);
      return;
    }
    setTitleError(false);
    onApply?.({ title: title.trim(), categoryIds: selectedCategoryIds.length > 0 ? selectedCategoryIds : undefined, status, sortType, sortBy });
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
              <View>
                <TouchableOpacity
                  style={styles.selector}
                  onPress={() => setCategoryOpen((v) => !v)}
                  activeOpacity={0.85}
                  onLayout={(e) => {
                    const { y, height } = e.nativeEvent.layout;
                    setSelectorLayout({ y, height });
                  }}
                >
                  <Text style={styles.selectorText}>
                    {selectedCategoryIds.length === 0
                      ? "Tất cả"
                      : (() => {
                          const selectedNames = categories
                            .filter((c) => selectedCategoryIds.includes(c.id))
                            .map((c) => c.name);
                          if (selectedNames.length <= 2) {
                            return selectedNames.join(", ");
                          } else {
                            return `${selectedNames.slice(0, 2).join(", ")}...`;
                          }
                        })()
                    }
                  </Text>
                  {categoryOpen ? <ChevronUp size={16} color="#6B7280" /> : <ChevronDown size={16} color="#6B7280" />}
                </TouchableOpacity>

                {categoryOpen ? (
                  <View style={[
                    styles.listBox,
                    {
                      position: 'absolute',
                      top: selectorLayout.y + selectorLayout.height + 8,
                      left: 16,
                      right: 16,
                      zIndex: 9999,
                      elevation: 10,
                      backgroundColor: Colors.white,
                    }
                  ]}>
                    <ScrollView nestedScrollEnabled style={{ maxHeight: 300 }}>
                      <TouchableOpacity style={[styles.option, selectedCategoryIds.length === 0 ? styles.optionActive : null]} onPress={() => { setSelectedCategoryIds([]); setCategoryOpen(false); }}>
                        <Text style={[styles.optionText, selectedCategoryIds.length === 0 ? styles.optionTextActive : null]}>Tất cả</Text>
                      </TouchableOpacity>
                      {categories.map((c) => {
                        const palette = getCategoryStyle(c.name);
                        return (
                          <TouchableOpacity key={c.id} style={[styles.categoryOption, selectedCategoryIds.includes(c.id) ? styles.categoryOptionActive : null]} onPress={() => { setSelectedCategoryIds(prev => prev.includes(c.id) ? prev.filter(id => id !== c.id) : [...prev, c.id]); }}>
                            <View style={[styles.categoryChip, { backgroundColor: palette.background }]}>
                              <Text style={[styles.categoryChipText, { color: palette.text }]}>{c.name}</Text>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                ) : null}
              </View>
            )}

            <Text style={[styles.label, { marginTop: 12 }]}>Trạng thái</Text>
            <View style={styles.row}>
              {[
                { value: null, label: "Tất cả" },
                { value: "DRAFT", label: "Bản nháp" },
                { value: "PUBLISHED", label: "Đã xuất bản" },
                { value: "HIDDEN", label: "Đã ẩn" },
              ].map((s) => (
                <TouchableOpacity key={String(s.value)} style={[styles.pill, status === s.value ? styles.pillActive : null]} onPress={() => setStatus(s.value)}>
                  <Text style={[styles.pillText, status === s.value ? styles.pillTextActive : null]}>{s.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

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
  row: { flexDirection: "row", flexWrap: "wrap" },
  selector: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 8 },
  selectorText: { color: "#374151" },
  selectorCaret: { color: "#6B7280" },
  pill: { paddingVertical: 8, paddingHorizontal: 10, borderRadius: 16, borderWidth: 1, borderColor: "#E5E7EB", marginRight: 8, marginBottom: 8 },
  pillActive: { backgroundColor: "#EEF2FF", borderColor: Colors.primary },
  pillText: { color: "#374151" },
  pillTextActive: { color: Colors.primary, fontWeight: "600" },
  buttonRow: { flexDirection: "row", justifyContent: "flex-end", marginTop: 12 },
  closeButton: { position: "absolute", top: 12, right: 12, padding: 4, zIndex: 1 },
  errorText: { color: "red", fontSize: 12, marginTop: 4, marginBottom: 8 },
});
