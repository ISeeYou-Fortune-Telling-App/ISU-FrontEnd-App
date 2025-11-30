import Colors from "@/src/constants/colors";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useCallback, useRef, useState } from "react";
import {
    NativeSyntheticEvent,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TextInputSelectionChangeEventData,
    TouchableOpacity,
    View,
} from "react-native";
import Markdown from "react-native-markdown-display";

interface MarkdownEditorProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  minHeight?: number;
}

type ToolbarAction = {
  icon: string;
  prefix: string;
  suffix: string;
  label: string;
};

const TOOLBAR_ACTIONS: ToolbarAction[] = [
  { icon: "format-bold", prefix: "**", suffix: "**", label: "Bold" },
  //{ icon: "format-italic", prefix: "*", suffix: "*", label: "Italic" },
  { icon: "format-strikethrough", prefix: "~~", suffix: "~~", label: "Strikethrough" },
  { icon: "format-header-1", prefix: "# ", suffix: "", label: "Heading" },
  { icon: "format-list-bulleted", prefix: "- ", suffix: "", label: "Bullet List" },
  { icon: "format-list-numbered", prefix: "1. ", suffix: "", label: "Numbered List" },
  { icon: "code-tags", prefix: "`", suffix: "`", label: "Code" },
  { icon: "format-quote-close", prefix: "> ", suffix: "", label: "Quote" },
];

const markdownStyles = {
  body: { fontSize: 14, color: "#333", fontFamily: "inter" },
  paragraph: { marginBottom: 8 },
  heading1: { fontSize: 20, fontWeight: "bold" as const, marginBottom: 8 },
  heading2: { fontSize: 18, fontWeight: "bold" as const, marginBottom: 6 },
  strong: { fontWeight: "bold" as const },
  em: { fontStyle: "italic" as const },
  bullet_list: { marginLeft: 10 },
  ordered_list: { marginLeft: 10 },
  code_inline: { backgroundColor: "#f0f0f0", paddingHorizontal: 4, borderRadius: 4 },
  blockquote: { borderLeftWidth: 3, borderLeftColor: Colors.primary, paddingLeft: 10, opacity: 0.8 },
};

export default function MarkdownEditor({
  value,
  onChangeText,
  placeholder = "Nhập nội dung (hỗ trợ markdown)...",
  minHeight = 150,
}: MarkdownEditorProps) {
  const inputRef = useRef<TextInput>(null);
  const [selection, setSelection] = useState({ start: 0, end: 0 });

  const handleSelectionChange = useCallback(
    (e: NativeSyntheticEvent<TextInputSelectionChangeEventData>) => {
      setSelection(e.nativeEvent.selection);
    },
    []
  );

  const insertMarkdown = useCallback(
    (prefix: string, suffix: string) => {
      const { start, end } = selection;
      const selectedText = value.substring(start, end);
      
      let newText: string;
      let newCursorPos: number;

      if (selectedText) {
        // Wrap selected text with markdown
        newText = value.substring(0, start) + prefix + selectedText + suffix + value.substring(end);
        newCursorPos = start + prefix.length + selectedText.length + suffix.length;
      } else {
        // Insert markdown at cursor position
        newText = value.substring(0, start) + prefix + suffix + value.substring(end);
        newCursorPos = start + prefix.length;
      }

      onChangeText(newText);
      
      // Focus and set cursor position
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.setNativeProps({
          selection: { start: newCursorPos, end: newCursorPos },
        });
      }, 50);
    },
    [value, selection, onChangeText]
  );

  // Calculate dynamic height for split view
  const splitHeight = Math.max(minHeight / 2, 100);

  return (
    <View style={styles.container}>
      {/* Toolbar */}
      <View style={styles.toolbar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.toolbarContent}>
          {TOOLBAR_ACTIONS.map((action) => (
            <TouchableOpacity
              key={action.icon}
              style={styles.toolbarButton}
              onPress={() => insertMarkdown(action.prefix, action.suffix)}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name={action.icon as any}
                size={22}
                color={Colors.black}
              />
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Split View: Editor on top, Preview below */}
      <View style={styles.splitContainer}>
        {/* Editor */}
        <View style={styles.editorSection}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="pencil" size={14} color="#666" />
            <Text style={styles.sectionLabel}>Soạn thảo</Text>
          </View>
          <TextInput
            ref={inputRef}
            multiline
            value={value}
            onChangeText={onChangeText}
            onSelectionChange={handleSelectionChange}
            placeholder={placeholder}
            style={[styles.input, { minHeight: splitHeight }]}
            textAlignVertical="top"
            autoCapitalize="none"
          />
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Live Preview */}
        <View style={styles.previewSection}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="eye" size={14} color={Colors.primary} />
            <Text style={[styles.sectionLabel, { color: Colors.primary }]}>Xem trước</Text>
          </View>
          <ScrollView style={[styles.previewContainer, { minHeight: splitHeight }]} nestedScrollEnabled>
            <Markdown style={markdownStyles}>
              {(value || '*Nội dung xem trước...*').replace(/\\n/g, '\n')}
            </Markdown>
          </ScrollView>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    backgroundColor: "#fff",
    overflow: "hidden",
  },
  toolbar: {
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    backgroundColor: "#f8f8f8",
  },
  toolbarContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 4,
    paddingVertical: 6,
  },
  toolbarButton: {
    padding: 8,
    marginHorizontal: 2,
    borderRadius: 6,
  },
  splitContainer: {
    flex: 1,
  },
  editorSection: {
    borderBottomWidth: 0,
  },
  previewSection: {
    backgroundColor: "#fafafa",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#f0f0f0",
    gap: 6,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
  },
  divider: {
    height: 1,
    backgroundColor: "#ddd",
  },
  input: {
    padding: 12,
    fontSize: 14,
    fontFamily: "inter",
  },
  previewContainer: {
    padding: 12,
  },
});
