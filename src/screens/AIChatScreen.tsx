import Colors from "@/src/constants/colors";
import { analyzeFaceImage, analyzePalmImage, chatWithAI } from "@/src/services/aiChat";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as DocumentPicker from "expo-document-picker";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  Modal,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

type MessageRole = "user" | "assistant" | "system";
type AnalysisType = "face" | "palm" | "none";

type Attachment = {
  id: string;
  uri: string;
  name?: string;
  mimeType?: string;
  analysisType: AnalysisType;
};

type KnowledgeReference = {
  id: string;
  title: string;
  snippet?: string;
  category?: string;
  confidence?: number;
  sourceUrl?: string;
  knowledgeId?: string;
  type?: "knowledge" | "external";
  documentCode?: string;
};

type AIMessage = {
  id: string;
  role: MessageRole;
  content?: string;
  attachments?: Attachment[];
  createdAt: number;
  processingTime?: number | null;
  references?: KnowledgeReference[];
};

const KNOWLEDGE_FILE_MAP = new Map<string, string>([
  ["026eeee3-372e-43a2-9797-816459818d56", "Ngũ Hành Phản Sinh Phản Khắc"],
  ["1227a134-9048-4377-8856-062c5530d595", "Xem Chỉ Tay - Nghệ Thuật Chiêm Tinh Học Tay"],
  ["1e664360-9d6f-48ad-b680-f0d4cda9b7de", "12 Cung Hoàng Đạo - Tổng Quan"],
  ["224c7fd6-5098-4397-996e-9e2229a977a4", "Ý nghĩa Bộ Swords trong Tarot"],
  ["2ad61ee6-8f2c-4058-a5e3-be5a8f5dff42", "Ý nghĩa Bộ Cups trong Tarot"],
  ["2afeeb7c-5ae5-49e6-87db-6d850d026710", "Cung Khí - Song Tử, Thiên Bình, Bảo Bình"],
  ["554eb231-1085-471b-a681-612fa1819295", "Ý nghĩa Bộ Pentacles trong Tarot"],
  ["6e11568b-5fcb-4b82-b815-60018c46e28e", "Nhân Tướng Học - Nghệ Thuật Xem Tướng Mặt"],
  ["7524950d-2ecd-45a5-8994-b1e7ae744fe3", "Xem Tướng Bàn Tay - Chỉ Tay Học"],
  ["820f6465-c535-41d5-bc0c-02a745792513", "Ý nghĩa Bộ Wands trong Tarot"],
  ["9c06e0f2-2c54-477d-b0f0-848df4bc6821", "Cung Nước - Cự Giải, Thiên Yết, Song Ngư"],
  ["9f72a042-f7c6-474d-8e25-2e7cc5bc138d", "Ngũ Hành Tương Sinh Tương Khắc"],
  ["a0ba013b-7067-4ec8-aecb-46ab8e8dcc90", "Cung Đất - Kim Ngưu, Xử Nữ, Ma Kết"],
  ["ad02e0f0-9909-4e23-8f7b-d1529eec4923", "Cung Lửa - Bạch Dương, Sư Tử, Nhân Mã"],
  ["ae80ac40-69ba-480c-b541-ca096fa947f2", "Ba Đường Chỉ Tay Chính - Sinh Đạo, Trí Đạo, Tâm Đạo"],
  ["afd07a12-0f85-43bf-ad22-ae0023e08005", "Xem Tướng Dáng Người - Thể Tướng Học"],
  ["c2fe3a0c-0c2e-40a5-a38d-3e83820d90b2", "Ngũ Hành - Kim Mộc Thủy Hỏa Thổ"],
  ["d5c5ab58-2480-41da-825f-3c01efe7d640", "Ý nghĩa Bộ Ẩn Chính (Major Arcana) trong Tarot"],
  ["edb7f498-685b-478c-831d-dd48631da3fd", "Các Gò Trên Bàn Tay và Đường Chỉ Tay Phụ"],
]);

const normalizeReferenceName = (value?: string | null) =>
  (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const KNOWLEDGE_NAME_INDEX = (() => {
  const entries = new Map<string, { id: string; title: string }>();
  KNOWLEDGE_FILE_MAP.forEach((title, id) => {
    entries.set(normalizeReferenceName(title), { id, title });
  });
  return entries;
})();

const createDocumentCode = (id: string, title: string) => {
  const slug = title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("");
  return `${id}_${slug}`;
};

const buildKnowledgeReference = (name: string): KnowledgeReference | null => {
  const lookupKey = normalizeReferenceName(name);
  if (!lookupKey) {
    return null;
  }

  const matched = KNOWLEDGE_NAME_INDEX.get(lookupKey);
  if (!matched) {
    return null;
  }

  const documentCode = createDocumentCode(matched.id, matched.title);

  return {
    id: documentCode,
    knowledgeId: matched.id,
    title: documentCode,
    snippet: matched.title,
    category: "Kho tri thức",
    type: "knowledge",
    documentCode,
  };
};

const TOP_K_OPTIONS = [5, 20, 40] as const;
const TOP_K_DESCRIPTIONS: Record<(typeof TOP_K_OPTIONS)[number], string> = {
  5: "Chuẩn xác",
  20: "Cân bằng",
  40: "Sáng tạo",
};

const DEFAULT_TOP_K = 20;

const INITIAL_MESSAGES: AIMessage[] = [
  {
    id: "intro",
    role: "assistant",
    createdAt: Date.now(),
    content:
      "Xin chào! Mình là Trợ lý AI của I See You. Bạn có thể đặt câu hỏi về cảm xúc, sự nghiệp hoặc những trăn trở hằng ngày, mình sẽ phân tích và phản hồi nhanh nhất có thể.",
  },
];

const stripSseArtifacts = (input: string): string => {
  if (!input) {
    return "";
  }

  const withoutMeta = input
    .replace(/(^|\n)\s*data:\s*/gi, "$1")
    .replace(/(^|\n)\s*(event|id|retry):.*$/gim, "$1");

  if (withoutMeta.trim() === "[DONE]") {
    return "";
  }

  return withoutMeta;
};

const formatTimestamp = (timestamp: number) =>
  new Date(timestamp).toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });

const normalizeConfidence = (value: any): number | undefined => {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return undefined;
  }
  return value;
};

const mergeKnowledgeReferences = (
  primary: KnowledgeReference[],
  secondary: KnowledgeReference[],
): KnowledgeReference[] => {
  const merged = new Map<string, KnowledgeReference>();

  const addReference = (reference: KnowledgeReference) => {
    if (!reference) {
      return;
    }
    const key = reference.knowledgeId ?? reference.id ?? reference.title;
    if (!key) {
      return;
    }

    if (!merged.has(key)) {
      merged.set(key, reference);
      return;
    }

    const existing = merged.get(key)!;
    merged.set(key, {
      ...existing,
      ...reference,
      confidence: reference.confidence ?? existing.confidence,
      snippet: reference.snippet ?? existing.snippet,
      category: reference.category ?? existing.category,
      sourceUrl: reference.sourceUrl ?? existing.sourceUrl,
      knowledgeId: reference.knowledgeId ?? existing.knowledgeId,
      documentCode: reference.documentCode ?? existing.documentCode,
      type: reference.type ?? existing.type,
    });
  };

  primary.forEach(addReference);
  secondary.forEach(addReference);

  return Array.from(merged.values());
};

const parseDocumentReference = (raw: string): KnowledgeReference | null => {
  if (!raw) {
    return null;
  }

  const sanitized = raw.replace(/^[-–•\s]+/, "").trim();
  if (!sanitized) {
    return null;
  }

  const fileSegment = sanitized.split(/[/\\]/).pop() ?? sanitized;
  const withoutExtension = fileSegment.replace(/\.[^.]+$/i, "").trim();

  if (!withoutExtension) {
    return null;
  }

  const [rawId, ...nameParts] = withoutExtension.split("_");
  const knowledgeId = rawId?.trim()?.length ? rawId.trim() : undefined;
  const rawTitle = nameParts.length > 0 ? nameParts.join("_") : withoutExtension;
  const title = rawTitle.replace(/_/g, " ").trim() || "Tài liệu tham khảo";

  return {
    id: knowledgeId ?? withoutExtension,
    knowledgeId,
    title,
    category: "Kho tri thức",
    type: "knowledge",
    documentCode: withoutExtension,
  };
};

const extractReferencesSection = (
  input: string,
): { cleanedAnswer: string; references: KnowledgeReference[] } => {
  const normalized = input.replace(/\r\n/g, "\n");
  const lower = normalized.toLowerCase();
  const headingIndex = lower.indexOf("### references");

  if (headingIndex === -1) {
    return { cleanedAnswer: normalized.trim(), references: [] };
  }

  const before = normalized.slice(0, headingIndex).trimEnd();
  const afterHeading = normalized.slice(headingIndex);
  const firstNewline = afterHeading.indexOf("\n");
  const remainder = firstNewline >= 0 ? afterHeading.slice(firstNewline + 1) : "";

  const referenceLines: string[] = [];
  const lines = remainder.split("\n");
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      continue;
    }
    if (!/^[-–•*]/.test(line)) {
      break;
    }
    referenceLines.push(line);
  }

  const references = referenceLines
    .map((line) => {
      const match = line.match(/\]\s*(.+)$/) ?? line.match(/^[-–•*]\s*(.+)$/);
      const referenceName = match ? match[1].trim() : "";
      return referenceName.length > 0 ? buildKnowledgeReference(referenceName) : null;
    })
    .filter((item): item is KnowledgeReference => Boolean(item));

  return {
    cleanedAnswer: before.trim(),
    references,
  };
};

const extractLegacyKnowledgeReferences = (
  input: string,
): { cleanedAnswer: string; references: KnowledgeReference[] } => {
  let working = input;
  const references: KnowledgeReference[] = [];

  const dcMatches = Array.from(working.matchAll(/\[DC\]\s*([^\n]+)/gi));
  dcMatches.forEach((match) => {
    const parsed = parseDocumentReference(match[1]);
    if (parsed) {
      references.push(parsed);
    }
  });

  working = working.replace(/\[KG\][^\n]*(\n|$)/gi, (_, newline) => (newline ? "\n" : ""));
  working = working.replace(/\[DC\][^\n]*(\n|$)/gi, (_, newline) => (newline ? "\n" : ""));
  working = working.replace(/^\s{0,3}#{1,6}\s*references?\s*$/gim, "");
  working = working.replace(/^-{3,}\s*$/gm, "");

  const cleanedAnswer = working
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line, index, array) => {
      if (line.trim().length === 0) {
        return index === 0 ? false : array[index - 1].trim().length !== 0;
      }
      return true;
    })
    .join("\n")
    .trim();

  return { cleanedAnswer, references };
};

const extractKnowledgeReferencesFromAnswer = (
  answer: string,
): { cleanedAnswer: string; references: KnowledgeReference[] } => {
  if (!answer) {
    return { cleanedAnswer: "", references: [] };
  }

  const sanitized = stripSseArtifacts(answer).replace(/\r\n/g, "\n");
  const sectionResult = extractReferencesSection(sanitized);
  if (sectionResult.references.length > 0) {
    return sectionResult;
  }

  return extractLegacyKnowledgeReferences(sanitized);
};

const normalizeReferences = (raw: any): KnowledgeReference[] => {
  const candidates = Array.isArray(raw)
    ? raw
    : Array.isArray(raw?.references)
      ? raw.references
      : Array.isArray(raw?.knowledgeBaseReferences)
        ? raw.knowledgeBaseReferences
        : Array.isArray(raw?.sources)
          ? raw.sources
          : Array.isArray(raw?.items)
            ? raw.items
            : Array.isArray(raw?.documents)
              ? raw.documents
              : Array.isArray(raw?.matches)
                ? raw.matches
                : Array.isArray(raw?.results)
                  ? raw.results
                  : Array.isArray(raw?.citations)
                    ? raw.citations
                    : Array.isArray(raw?.contexts)
                      ? raw.contexts
                      : Array.isArray(raw?.data)
                        ? raw.data
                        : [];

  return candidates
    .map((item: any, index: number): KnowledgeReference | null => {
      if (!item) {
        return null;
      }

      const typeHint =
        typeof item.type === "string"
          ? item.type.trim().toUpperCase()
          : typeof item.category === "string"
            ? item.category.trim().toUpperCase()
            : undefined;

      if (typeHint === "KG" || typeHint === "KNOWLEDGE_GRAPH") {
        return null;
      }

      const confidence =
        normalizeConfidence(item.confidence) ??
        normalizeConfidence(item.score) ??
        normalizeConfidence(item.similarity) ??
        normalizeConfidence(item.matchScore);

      const rawTitle =
        item.title ??
        item.name ??
        item.heading ??
        item.label ??
        item.subject ??
        "";

      const title =
        typeof rawTitle === "string" && rawTitle.trim().length > 0
          ? rawTitle.trim()
          : `Nguồn tham khảo ${index + 1}`;

      const snippetSource =
        item.snippet ??
        item.excerpt ??
        item.summary ??
        item.content ??
        item.description;

      const snippet =
        typeof snippetSource === "string"
          ? snippetSource.trim()
          : undefined;

      const categorySource = item.category ?? item.topic ?? item.tag ?? item.type;
      const category =
        typeof categorySource === "string" && categorySource.trim().length > 0
          ? categorySource.trim()
          : undefined;

      const sourceUrl =
        typeof item.url === "string"
          ? item.url
          : typeof item.link === "string"
            ? item.link
            : typeof item.sourceUrl === "string"
              ? item.sourceUrl
              : typeof item.path === "string"
                ? item.path
                : undefined;

      const documentCode =
        typeof item.documentCode === "string" && item.documentCode.trim().length > 0
          ? item.documentCode.trim()
          : undefined;

      let knowledgeId =
        typeof item.knowledgeId === "string" && item.knowledgeId.trim().length > 0
          ? item.knowledgeId.trim()
          : undefined;

      let normalizedTitle = title;
      let normalizedDocumentCode = documentCode;

      if (documentCode) {
        const parsedFromCode = parseDocumentReference(documentCode);
        if (parsedFromCode) {
          knowledgeId = knowledgeId ?? parsedFromCode.knowledgeId;
          normalizedTitle = parsedFromCode.title || normalizedTitle;
          normalizedDocumentCode = parsedFromCode.documentCode ?? normalizedDocumentCode;
        }
      }

      return {
        id: String(item.id ?? item.referenceId ?? knowledgeId ?? normalizedDocumentCode ?? index),
        title: normalizedTitle,
        snippet,
        category,
        confidence,
        sourceUrl,
        type: sourceUrl ? "external" : undefined,
        knowledgeId,
        documentCode: normalizedDocumentCode,
      };
    })
    .filter((item: KnowledgeReference | null): item is KnowledgeReference => Boolean(item));
};

const ANALYSIS_LABELS: Record<AnalysisType, string> = {
  face: "Khuôn mặt",
  palm: "Lòng bàn tay",
  none: "Không phân tích",
};

const nextAnalysisType = (type: AnalysisType): AnalysisType => {
  if (type === "face") {
    return "palm";
  }
  if (type === "palm") {
    return "none";
  }
  return "face";
};

export default function AIChatScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<AIMessage>>(null);

  const [messages, setMessages] = useState<AIMessage[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState<string>("");
  const [selectedImages, setSelectedImages] = useState<Attachment[]>([]);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [topK, setTopK] = useState<(typeof TOP_K_OPTIONS)[number]>(DEFAULT_TOP_K);
  const [topKPickerVisible, setTopKPickerVisible] = useState<boolean>(false);

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
  }, []);

  const handleReferencePress = useCallback(
    async (reference: KnowledgeReference) => {
      let resolvedKnowledgeId = reference.knowledgeId;
      if (!resolvedKnowledgeId && reference.documentCode) {
        const derived = parseDocumentReference(reference.documentCode);
        resolvedKnowledgeId = derived?.knowledgeId ?? derived?.id;
      }

      if (resolvedKnowledgeId) {
        router.push({ pathname: "/knowledge-detail", params: { knowledgeId: resolvedKnowledgeId } } as never);
        return;
      }

      const targetUrl = reference.sourceUrl;
      if (!targetUrl) {
        Alert.alert("Không thể mở nguồn", "Nguồn tham khảo chưa sẵn sàng.");
        return;
      }

      try {
        const supported = await Linking.canOpenURL(targetUrl);
        if (!supported) {
          Alert.alert("Không thể mở nguồn", "Liên kết tham khảo không khả dụng.");
          return;
        }

        await Linking.openURL(targetUrl);
      } catch (error) {
        console.error(error);
        Alert.alert("Không thể mở nguồn", "Vui lòng thử lại sau.");
      }
    },
    [router],
  );

  const handlePickImages = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        multiple: true,
        type: "image/*",
      });

      if (result.canceled || !result.assets?.length) {
        return;
      }

      const timestamp = Date.now();
      const attachments = result.assets
        .filter((asset) => asset.uri)
        .map((asset, index) => ({
          id: `${timestamp}-${index}`,
          uri: asset.uri ?? "",
          name: asset.name,
          mimeType: asset.mimeType ?? "image/jpeg",
          analysisType: "face" as AnalysisType,
        }))
        .filter((item) => item.uri.length > 0);

      setSelectedImages((prev) => [...prev, ...attachments]);
    } catch (error) {
      console.error(error);
      Alert.alert("Không thể chọn ảnh", "Vui lòng thử lại sau.");
    }
  }, []);

  const handleToggleAttachmentType = useCallback((attachmentId: string) => {
    setSelectedImages((prev) =>
      prev.map((item) =>
        item.id === attachmentId ? { ...item, analysisType: nextAnalysisType(item.analysisType) } : item,
      ),
    );
  }, []);

  const handleRemoveAttachment = useCallback((attachmentId: string) => {
    setSelectedImages((prev) => prev.filter((item) => item.id !== attachmentId));
  }, []);

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if ((!trimmed && selectedImages.length === 0) || isSending) {
      return;
    }

    const attachmentsSnapshot = selectedImages;
    const now = Date.now();
    const outgoingMessage: AIMessage = {
      id: `user-${now}`,
      role: "user",
      createdAt: now,
      content: trimmed.length > 0 ? trimmed : undefined,
      attachments: attachmentsSnapshot.length > 0 ? attachmentsSnapshot : undefined,
    };

    setMessages((prev) => [...prev, outgoingMessage]);
    setInput("");
    setSelectedImages([]);
    setIsSending(true);
    scrollToEnd();

    const attachmentNotes = attachmentsSnapshot.map((attachment, index) => {
      const label = attachment.analysisType !== "none" ? ` (${ANALYSIS_LABELS[attachment.analysisType]})` : "";
      return `Ảnh đính kèm ${index + 1}${label}: ${attachment.name ?? attachment.uri}`;
    });

    const analysisSummaries: string[] = [];

    for (const attachment of attachmentsSnapshot) {
      if (attachment.analysisType === "none") {
        continue;
      }

      try {
        const response =
          attachment.analysisType === "palm"
            ? await analyzePalmImage(attachment.uri, attachment.name, attachment.mimeType)
            : await analyzeFaceImage(attachment.uri, attachment.name, attachment.mimeType);

        const payload = response?.data?.data ?? response?.data;
        const analysisResult =
          payload?.analysisResult ?? payload?.answer ?? payload?.result ?? payload?.analysis ?? "";

        if (analysisResult) {
          const label = attachment.analysisType === "palm" ? "lòng bàn tay" : "khuôn mặt";
          analysisSummaries.push(`Kết quả phân tích ${label}: ${analysisResult}`);
          const analysisMessage: AIMessage = {
            id: `analysis-${attachment.id}`,
            role: "assistant",
            createdAt: Date.now(),
            content: `Phân tích ${label}: ${analysisResult}`,
          };
          setMessages((prev) => [...prev, analysisMessage]);
          scrollToEnd();
        }
      } catch (error) {
        console.error(error);
        const analysisError: AIMessage = {
          id: `analysis-error-${attachment.id}`,
          role: "system",
          createdAt: Date.now(),
          content: "Không thể phân tích ảnh. Bạn vui lòng thử lại sau.",
        };
        setMessages((prev) => [...prev, analysisError]);
        scrollToEnd();
      }
    }

    const combinedQuestionParts = [trimmed, ...attachmentNotes, ...analysisSummaries].filter(
      (part) => part && part.trim().length > 0,
    );
    const combinedQuestion = combinedQuestionParts.join("\n\n");

    const assistantId = `assistant-${Date.now() + 1}`;
    const placeholderMessage: AIMessage = {
      id: assistantId,
      role: "assistant",
      createdAt: Date.now(),
      content: "",
    };

    setMessages((prev) => [...prev, placeholderMessage]);
    scrollToEnd();

    try {
      const response = await chatWithAI({
        question: combinedQuestion,
        topK,
      });

      const payloadRoot = response?.data?.data ?? response?.data ?? response;
      const rawAnswer =
        typeof payloadRoot?.answer === "string" && payloadRoot.answer.trim().length > 0
          ? payloadRoot.answer
          : "";

      const parsedFromAnswer = extractKnowledgeReferencesFromAnswer(rawAnswer);
      const normalizedReferences = normalizeReferences(
        payloadRoot?.references ??
          payloadRoot?.knowledgeBaseReferences ??
          payloadRoot?.sources ??
          payloadRoot?.documents ??
          payloadRoot?.matches ??
          payloadRoot?.results ??
          payloadRoot?.citations ??
          payloadRoot?.contexts ??
          payloadRoot,
      );

      const combinedReferences = mergeKnowledgeReferences(
        parsedFromAnswer.references,
        normalizedReferences,
      );

      const sanitizedAnswerRaw = parsedFromAnswer.cleanedAnswer || rawAnswer;
      const sanitizedAnswer = sanitizedAnswerRaw
        ? stripSseArtifacts(sanitizedAnswerRaw).trim()
        : "";

      const aiResponseMessage: AIMessage = {
        id: assistantId,
        role: "assistant",
        createdAt: Date.now(),
        content:
          sanitizedAnswer.length > 0
            ? sanitizedAnswer
            : "Xin lỗi, hiện tại mình chưa thể phản hồi yêu cầu này. Bạn hãy thử lại sau nhé!",
        references: combinedReferences.length > 0 ? combinedReferences : undefined,
        processingTime:
          typeof payloadRoot?.processingTime === "number"
            ? payloadRoot.processingTime
            : undefined,
      };

      setMessages((prev) => prev.map((item) => (item.id === assistantId ? aiResponseMessage : item)));
    } catch (error: any) {
      console.error(error);
      const fallback =
        error?.response?.data?.message ?? error?.message ?? "Hệ thống đang bận. Bạn vui lòng thử lại sau ít phút.";
      setMessages((prev) =>
        prev.map((item) =>
          item.id === assistantId
            ? {
                ...item,
                role: "system",
                content: fallback,
              }
            : item,
        ),
      );
    } finally {
      setIsSending(false);
    }
  }, [input, isSending, scrollToEnd, selectedImages, topK]);

  const renderMessage = useCallback(
    ({ item }: { item: AIMessage }) => {
      if (item.role === "system") {
        return (
          <View style={styles.systemMessage}>
            <Ionicons name="warning-outline" size={16} color="#b91c1c" />
            <Text style={styles.systemMessageText}>{item.content}</Text>
          </View>
        );
      }

      const isUser = item.role === "user";
      const hasReferences = !isUser && Boolean(item.references?.length);
      const references = item.references ?? [];

      return (
        <View style={[styles.messageRow, isUser ? styles.alignRight : styles.alignLeft]}>
          {item.attachments?.length ? (
            <View style={[styles.attachmentGroup, isUser && styles.attachmentGroupUser]}>
              {item.attachments.map((attachment) => (
                <Image key={attachment.id} source={{ uri: attachment.uri }} style={styles.messageImage} />
              ))}
            </View>
          ) : null}
          {item.content || hasReferences ? (
            <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.aiBubble]}>
              {item.content ? (
                <Text style={[styles.messageText, isUser && styles.userText]}>{item.content}</Text>
              ) : null}

              {hasReferences ? (
                <View style={styles.referenceStrip}>
                  <View style={styles.referenceStripHeader}>
                    <Ionicons name="link-outline" size={16} color={Colors.primary} />
                    <Text style={styles.referenceStripHeaderText}>Liên kết · Trích dẫn</Text>
                  </View>
                  <View style={styles.referenceChipGroup}>
                    {references.map((reference, index) => {
                      const chipLabel = reference.documentCode ?? reference.title;
                      return (
                        <Pressable
                          key={`${reference.id}-${index}`}
                          style={({ hovered, focused, pressed }) => [
                            styles.referenceChip,
                            (hovered || focused) && styles.referenceChipFocused,
                            pressed && styles.referenceChipPressed,
                          ]}
                          onPress={() => handleReferencePress(reference)}
                        >
                          <Text style={styles.referenceChipText}>{chipLabel}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ) : null}

              <Text style={[styles.timestampText, isUser && styles.timestampTextUser]}>
                {formatTimestamp(item.createdAt)}
                {item.processingTime ? ` (${item.processingTime.toFixed(1)}s)` : ""}
              </Text>
            </View>
          ) : null}
        </View>
      );
    },
    [handleReferencePress],
  );

  const canSend = useMemo(
    () => input.trim().length > 0 || selectedImages.length > 0,
    [input, selectedImages],
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right", "bottom"]}>
      <LinearGradient
        colors={[Colors.primary, Colors.purple]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.headerTopRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
            <Ionicons name="arrow-back" size={22} color={Colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Trợ lý AI</Text>
          <View style={styles.headerPlaceholder} />
        </View>
        <View style={styles.headerInfoRow}>
          <View style={styles.aiAvatar}>
            <Ionicons name="sparkles-outline" size={22} color={Colors.primary} />
          </View>
          <View style={styles.headerTextGroup}>
            <Text style={styles.headerHeadline}>Trò chuyện cùng ISU AI</Text>
            <Text style={styles.headerSubtitle}>
              Phân tích thông minh, tham chiếu kho tri thức của ISU.
            </Text>
          </View>
        </View>
        <View style={styles.topKControlRow}>
          <TouchableOpacity
            style={styles.topKButton}
            onPress={() => setTopKPickerVisible(true)}
            activeOpacity={0.85}
          >
            <Ionicons name="options-outline" size={16} color={Colors.primary} />
            <Text style={styles.topKButtonText}>
              {`Độ sáng tạo: ${topK} (${TOP_K_DESCRIPTIONS[topK] ?? "Tùy chỉnh"})`}
            </Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? insets.top + 16 : 0}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={[styles.listContent, { paddingBottom: Math.max(insets.bottom + 24, 24) }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          ListFooterComponent={
            isSending ? (
              <View style={styles.loadingIndicator}>
                <ActivityIndicator size="small" color={Colors.primary} />
                <Text style={styles.loadingText}>AI đang trả lời...</Text>
              </View>
            ) : null
          }
        />

        {selectedImages.length > 0 && (
          <View style={[styles.previewRow, { paddingBottom: Math.max(insets.bottom * 0.4, 8) }]}>
            {selectedImages.map((attachment) => (
              <View key={attachment.id} style={styles.previewItem}>
                <Image source={{ uri: attachment.uri }} style={styles.previewImage} />
                <TouchableOpacity
                  style={styles.removePreviewButton}
                  onPress={() => handleRemoveAttachment(attachment.id)}
                >
                  <Ionicons name="close" size={14} color={Colors.white} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.analysisBadge}
                  onPress={() => handleToggleAttachmentType(attachment.id)}
                >
                  <Text style={styles.analysisBadgeText}>{ANALYSIS_LABELS[attachment.analysisType]}</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        <View style={[styles.inputRow, { paddingBottom: 12 + insets.bottom }]}>
          <TouchableOpacity style={styles.iconButton} onPress={handlePickImages}>
            <Ionicons name="image-outline" size={22} color={Colors.gray} />
          </TouchableOpacity>
          <TextInput
            style={styles.messageInput}
            placeholder="Bạn muốn hỏi điều gì?"
            placeholderTextColor="#94a3b8"
            multiline
            value={input}
            onChangeText={setInput}
            onSubmitEditing={() => {
              if (Platform.OS === "ios") {
                handleSend();
              }
            }}
            returnKeyType="send"
          />
          <TouchableOpacity
            style={[styles.sendButton, (!canSend || isSending) && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!canSend || isSending}
          >
            {isSending ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <Ionicons name="paper-plane" size={18} color={Colors.white} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <Modal
        visible={topKPickerVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setTopKPickerVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setTopKPickerVisible(false)}>
          <View style={styles.modalBackdrop}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={styles.modalCard}>
                <View style={styles.modalHeader}>
                  <Ionicons name="options-outline" size={20} color={Colors.primary} />
                  <Text style={styles.modalTitle}>Chọn độ sáng tạo</Text>
                </View>
                {TOP_K_OPTIONS.map((option) => {
                  const isActive = option === topK;
                  return (
                    <TouchableOpacity
                      key={option}
                      style={[styles.modalOption, isActive && styles.modalOptionActive]}
                      activeOpacity={0.9}
                      onPress={() => {
                        setTopK(option);
                        setTopKPickerVisible(false);
                      }}
                    >
                      <View style={styles.modalOptionInfo}>
                        <Text style={[styles.modalOptionValue, isActive && styles.modalOptionValueActive]}>
                          {option}
                        </Text>
                        <Text
                          style={[
                            styles.modalOptionDescription,
                            isActive && styles.modalOptionDescriptionActive,
                          ]}
                        >
                          {TOP_K_DESCRIPTIONS[option]}
                        </Text>
                      </View>
                      {isActive ? (
                        <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
                      ) : (
                        <Ionicons name="ellipse-outline" size={20} color={Colors.gray} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  flex: {
    flex: 1,
  },
  headerGradient: {
    marginBottom: 12,
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.white,
    letterSpacing: 0.3,
  },
  headerPlaceholder: {
    width: 40,
    height: 40,
  },
  headerInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  aiAvatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: Colors.white,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.35)",
  },
  headerTextGroup: {
    flex: 1,
    gap: 6,
  },
  headerHeadline: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.white,
  },
  headerSubtitle: {
    fontSize: 13,
    color: "rgba(255,255,255,0.85)",
    lineHeight: 18,
  },
  topKControlRow: {
    marginTop: 16,
    alignItems: "flex-start",
  },
  topKButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.22)",
  },
  topKButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.white,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
    gap: 12,
  },
  messageRow: {
    gap: 8,
    marginBottom: 6,
  },
  alignLeft: {
    alignSelf: "flex-start",
    alignItems: "flex-start",
  },
  alignRight: {
    alignSelf: "flex-end",
    alignItems: "flex-end",
  },
  attachmentGroup: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 4,
  },
  attachmentGroupUser: {
    justifyContent: "flex-end",
  },
  messageImage: {
    width: 150,
    height: 150,
    borderRadius: 14,
  },
  messageBubble: {
    maxWidth: "80%",
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  userBubble: {
    backgroundColor: Colors.primary,
    shadowColor: "rgba(24, 119, 242, 0.35)",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.32,
    shadowRadius: 12,
    elevation: 3,
  },
  aiBubble: {
    backgroundColor: Colors.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderGray,
    shadowColor: "rgba(15, 23, 42, 0.15)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 2,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.dark_gray,
  },
  userText: {
    color: Colors.white,
  },
  timestampText: {
    marginTop: 6,
    fontSize: 11,
    color: Colors.gray,
  },
  timestampTextUser: {
    color: "rgba(255,255,255,0.8)",
  },
  referenceStrip: {
    marginTop: 8,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.borderGray,
    gap: 10,
  },
  referenceStripHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  referenceStripHeaderText: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.3,
    color: Colors.primary,
    textTransform: "uppercase",
  },
  referenceChipGroup: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -4,
  },
  referenceChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(15,23,42,0.12)",
    backgroundColor: "rgba(15,23,42,0.03)",
    marginHorizontal: 4,
    marginBottom: 8,
  },
  referenceChipFocused: {
    borderColor: Colors.primary,
    backgroundColor: "rgba(24,119,242,0.08)",
  },
  referenceChipPressed: {
    opacity: 0.75,
  },
  referenceChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.dark_gray,
  },
  systemMessage: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fee2e2",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  systemMessageText: {
    flex: 1,
    fontSize: 13,
    color: "#b91c1c",
  },
  loadingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    alignSelf: "center",
    paddingVertical: 16,
  },
  loadingText: {
    fontSize: 13,
    color: Colors.gray,
  },
  previewRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  previewItem: {
    position: "relative",
  },
  previewImage: {
    width: 72,
    height: 72,
    borderRadius: 12,
  },
  removePreviewButton: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(0,0,0,0.7)",
    alignItems: "center",
    justifyContent: "center",
  },
  analysisBadge: {
    position: "absolute",
    left: 4,
    bottom: 4,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 4,
    backgroundColor: "rgba(24,119,242,0.85)",
  },
  analysisBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: Colors.white,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.borderGray,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderGray,
  },
  messageInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: Colors.black,
    backgroundColor: Colors.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderGray,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary,
    shadowColor: "rgba(24, 119, 242, 0.45)",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  sendButtonDisabled: {
    backgroundColor: "#cbd5f5",
    shadowOpacity: 0,
    elevation: 0,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.35)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    borderRadius: 18,
    backgroundColor: Colors.white,
    padding: 20,
    gap: 12,
    shadowColor: "rgba(15,23,42,0.25)",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.primary,
  },
  modalOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: "#f8fafc",
  },
  modalOptionActive: {
    backgroundColor: "rgba(24,119,242,0.12)",
  },
  modalOptionInfo: {
    gap: 4,
  },
  modalOptionValue: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.dark_gray,
  },
  modalOptionValueActive: {
    color: Colors.primary,
  },
  modalOptionDescription: {
    fontSize: 12,
    color: Colors.gray,
  },
  modalOptionDescriptionActive: {
    color: Colors.primary,
  },
});
