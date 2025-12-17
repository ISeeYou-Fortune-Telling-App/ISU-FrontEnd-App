import Colors from "@/src/constants/colors";
import {
  analyzeFaceImage,
  analyzePalmImage,
  chatWithAI,
  getAiChatSession
} from "@/src/services/aiChat";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from "react-native";
import Markdown from "react-native-markdown-display";
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
  status?: "pending" | "done";
};

type HistoryEntry = AIMessage & {
  isPending?: boolean;
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

const CHAT_OPTIONS = [
  { value: 1 as const, label: "Nhanh", description: "Ưu tiên tốc độ", etaSeconds: 30 },
  { value: 2 as const, label: "Cân bằng", description: "Trả lời đầy đủ", etaSeconds: 90 },
  { value: 3 as const, label: "Chuyên sâu", description: "Đào sâu phân tích", etaSeconds: 240 },
];
type ChatOptionValue = (typeof CHAT_OPTIONS)[number]["value"];

const CHAT_OPTION_MAP = CHAT_OPTIONS.reduce<Record<number, (typeof CHAT_OPTIONS)[number]>>(
  (acc, curr) => {
    acc[curr.value] = curr;
    return acc;
  },
  {},
);

const DEFAULT_SELECTED_OPTION: ChatOptionValue = 2;
const HISTORY_STALE_MS = 45000;

const createInitialMessages = (): AIMessage[] => [
  {
    id: `intro-${Date.now()}`,
    role: "assistant",
    createdAt: Date.now(),
    content:
      "Xin chào! Mình là Trợ lý AI của I See You. Bạn có thể đặt câu hỏi về cảm xúc, sự nghiệp hoặc những trăn trở hằng ngày, mình sẽ phân tích và phản hồi nhanh nhất có thể.",
  },
];

const SESSION_STORAGE_KEY = "aiChat:lastSession";

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

const formatEtaLabel = (seconds: number) => {
  if (seconds >= 60) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}p${secs > 0 ? `${secs}s` : ""}`;
  }
  return `${seconds}s`;
};

const formatCountdown = (ms: number) => {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes > 0) {
    return `${minutes}p${seconds.toString().padStart(2, "0")}s`;
  }
  return `${seconds}s`;
};

const markdownBase = {
  body: {
    fontSize: 14,
    lineHeight: 21,
    color: Colors.dark_gray,
  },
  paragraph: {
    marginTop: 0,
    marginBottom: 10,
  },
  heading1: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: Colors.dark_gray,
    marginBottom: 10,
  },
  heading2: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: Colors.dark_gray,
    marginBottom: 8,
  },
  heading3: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: Colors.dark_gray,
    marginBottom: 6,
  },
  bullet_list: {
    marginBottom: 4,
    paddingLeft: 8,
  },
  ordered_list: {
    marginBottom: 4,
    paddingLeft: 8,
  },
  list_item: {
    flexDirection: "row" as const,
    marginBottom: 4,
    flexShrink: 1,
  },
  strong: {
    fontWeight: "700" as const,
  },
  em: {
    fontStyle: "italic" as const,
  },
  code_inline: {
    backgroundColor: "rgba(15,23,42,0.08)",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
    fontFamily: Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" }),
    color: Colors.dark_gray,
  },
  link: {
    color: Colors.primary,
    textDecorationLine: "underline" as const,
    fontWeight: "600" as const,
  },
  text: {
    color: Colors.dark_gray,
  },
};

const MARKDOWN_STYLES = {
  assistant: StyleSheet.create(markdownBase),
  user: StyleSheet.create({
    ...markdownBase,
    body: { ...markdownBase.body, color: Colors.white },
    text: { ...markdownBase.text, color: Colors.white },
    heading1: { ...markdownBase.heading1, color: Colors.white },
    heading2: { ...markdownBase.heading2, color: Colors.white },
    heading3: { ...markdownBase.heading3, color: Colors.white },
    bullet_list: { ...markdownBase.bullet_list },
    ordered_list: { ...markdownBase.ordered_list },
    list_item: { ...markdownBase.list_item },
    code_inline: {
      ...markdownBase.code_inline,
      backgroundColor: "rgba(255,255,255,0.16)",
      color: Colors.white,
    },
    link: { ...markdownBase.link, color: "#cde2ff" },
  }),
};

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

type AIChatScreenProps = {
  sessionId?: string;
};

export default function AIChatScreen({ sessionId }: AIChatScreenProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<AIMessage>>(null);
  const [isLoadingSession, setIsLoadingSession] = useState<boolean>(false);

  const [messages, setMessages] = useState<AIMessage[]>(createInitialMessages());
  const [input, setInput] = useState<string>("");
  const [selectedImages, setSelectedImages] = useState<Attachment[]>([]);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [isAnalysisPending, setIsAnalysisPending] = useState<boolean>(false);
  const [selectedOption, setSelectedOption] = useState<ChatOptionValue>(DEFAULT_SELECTED_OPTION);
  const [optionPickerVisible, setOptionPickerVisible] = useState<boolean>(false);
  const [countdownDeadline, setCountdownDeadline] = useState<number | null>(null);
  const [remainingMs, setRemainingMs] = useState<number>(0);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  const [hasLoadedSession, setHasLoadedSession] = useState<boolean>(false);

  const currentOption = useMemo(() => CHAT_OPTION_MAP[selectedOption], [selectedOption]);

  const clearCountdown = useCallback(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    setCountdownDeadline(null);
    setRemainingMs(0);
  }, []);

  const startCountdownForOption = useCallback(
    (optionValue: ChatOptionValue) => {
      const option = CHAT_OPTION_MAP[optionValue];
      if (!option) return;
      const deadline = Date.now() + option.etaSeconds * 1000;
      setCountdownDeadline(deadline);
      setRemainingMs(option.etaSeconds * 1000);
    },
    [],
  );

  useEffect(() => {
    if (!countdownDeadline) {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
      return;
    }

    const tick = () => {
      const diff = countdownDeadline - Date.now();
      setRemainingMs(Math.max(diff, 0));
      if (diff <= 0) {
        clearCountdown();
      }
    };

    tick();
    countdownRef.current = setInterval(tick, 1000) as any;

    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
    };
  }, [countdownDeadline, clearCountdown]);

  useEffect(() => {
    return () => {
      clearCountdown();
    };
  }, [clearCountdown]);

  useEffect(() => {
    const restoreSession = async () => {
      if (sessionId) {
        setIsLoadingSession(true);
        try {
          const response = await getAiChatSession(sessionId);
          const payload = response?.data ?? {};
          const rawMessages = Array.isArray(payload?.messages) ? payload.messages : [];
          
          if (rawMessages.length > 0) {
            const normalizedMessages: AIMessage[] = rawMessages.map((msg: any, index: number) => {
              const createdAt = msg.created_at
                ? new Date(msg.created_at).getTime()
                : msg.updated_at
                ? new Date(msg.updated_at).getTime()
                : Date.now() - (rawMessages.length - index) * 1000;
              
              const role: MessageRole = msg.sent_by_user ? "user" : "assistant";
              const content = msg.text_content ?? msg.content ?? "";
              
              return {
                id: String(msg.id ?? `msg-${sessionId}-${index}`),
                role,
                content,
                createdAt,
                status: "done" as const,
              };
            });
            
            setMessages(normalizedMessages);
          } else {
            setMessages(createInitialMessages());
          }
        } catch (error) {
          console.error("Không thể tải phiên AI chat", error);
          Alert.alert(
            "Lỗi",
            "Không thể tải phiên trò chuyện. Vui lòng thử lại.",
            [{ text: "Đóng" }]
          );
          setMessages(createInitialMessages());
        } finally {
          setIsLoadingSession(false);
          setHasLoadedSession(true);
        }
        return;
      }
      
      try {
        const raw = await AsyncStorage.getItem(SESSION_STORAGE_KEY);
        if (!raw) {
          return;
        }
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
        }
      } catch (error) {
        console.error("Khôi phục phiên AI chat thất bại", error);
      } finally {
        setHasLoadedSession(true);
      }
    };

    restoreSession();
  }, [sessionId]);

  useEffect(() => {
    if (!hasLoadedSession) return;
    AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(messages)).catch((err) =>
      console.warn("Lưu phiên AI chat thất bại", err),
    );
  }, [messages, hasLoadedSession]);

  const handleMarkdownLinkPress = useCallback((url: string) => {
    if (!url) {
      return false;
    }

    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          Linking.openURL(url);
        } else {
          Alert.alert("Không thể mở liên kết", "Liên kết này không hợp lệ hoặc đã bị chặn.");
        }
      })
      .catch((error) => {
        console.error("Không thể mở liên kết", error);
        Alert.alert("Không thể mở liên kết", "Liên kết này không hợp lệ hoặc đã bị chặn.");
      });
    return false;
  }, []);

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
  }, []);

  const handleStartNewConversation = useCallback(async () => {
    setMessages(createInitialMessages());
    setInput("");
    setSelectedImages([]);
    clearCountdown();
    setIsSending(false);
    await AsyncStorage.removeItem(SESSION_STORAGE_KEY).catch(() => { });
  }, [clearCountdown]);

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

  const handleTakePhoto = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Cần quyền truy cập camera",
          "Vui lòng cấp quyền truy cập camera trong cài đặt để sử dụng tính năng này."
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.8,
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
          name: asset.fileName ?? `photo-${timestamp}.jpg`,
          mimeType: asset.mimeType ?? "image/jpeg",
          analysisType: "face" as AnalysisType,
        }))
        .filter((item) => item.uri.length > 0);

      setSelectedImages((prev) => [...prev, ...attachments]);
    } catch (error) {
      console.error(error);
      Alert.alert("Không thể chụp ảnh", "Vui lòng thử lại sau.");
    }
  }, []);

  const handlePickImages = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Cần quyền truy cập thư viện ảnh",
          "Vui lòng cấp quyền truy cập thư viện ảnh trong cài đặt để sử dụng tính năng này."
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: false,
        allowsEditing: true,
        quality: 0.8,
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
          name: asset.fileName ?? `image-${timestamp}-${index}.jpg`,
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
    const requiresAnalysis = attachmentsSnapshot.some((attachment) => attachment.analysisType !== "none");
    if (requiresAnalysis) {
      setIsAnalysisPending(true);
    }
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
    startCountdownForOption(selectedOption);
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
            ? await analyzePalmImage(
              attachment.uri,
              attachment.name,
              attachment.mimeType,
              selectedOption,
            )
            : await analyzeFaceImage(
              attachment.uri,
              attachment.name,
              attachment.mimeType,
              selectedOption,
            );

        const payload = response?.data?.data ?? response?.data;
        const analysisResult =
          payload?.analysisResult ??
          payload?.answer ??
          payload?.result ??
          payload?.analysis ??
          payload?.textContent ??
          "";

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

    if (requiresAnalysis) {
      setIsAnalysisPending(false);
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
      status: "pending",
    };

    setMessages((prev) => [...prev, placeholderMessage]);
    scrollToEnd();

    try {
      const response = await chatWithAI({
        question: combinedQuestion,
        selectedOption,
      });

      const payloadRoot = response?.data?.data ?? response?.data ?? response;
      const rawAnswer =
        typeof payloadRoot?.answer === "string" && payloadRoot.answer.trim().length > 0
          ? payloadRoot.answer
          : typeof payloadRoot?.response === "string" && payloadRoot.response.trim().length > 0
            ? payloadRoot.response
            : typeof payloadRoot?.result === "string" && payloadRoot.result.trim().length > 0
              ? payloadRoot.result
              : typeof payloadRoot?.textContent === "string" && payloadRoot.textContent.trim().length > 0
                ? payloadRoot.textContent
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
        status: "done",
      };

      setMessages((prev) => prev.map((item) => (item.id === assistantId ? aiResponseMessage : item)));
      clearCountdown();
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
              status: "done",
            }
            : item,
        ),
      );
      clearCountdown();
    } finally {
      setIsSending(false);
    }
  }, [input, isSending, scrollToEnd, selectedImages, selectedOption, startCountdownForOption, clearCountdown]);

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
      const isPending = item.status === "pending";

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
                <Markdown
                  style={isUser ? MARKDOWN_STYLES.user : MARKDOWN_STYLES.assistant}
                  onLinkPress={handleMarkdownLinkPress}
                >
                  {item.content}
                </Markdown>
              ) : null}

              {!item.content && isPending ? (
                <View style={styles.pendingRow}>
                  <ActivityIndicator size="small" color={Colors.primary} />
                  <Text style={styles.pendingText}>AI đang phân tích yêu cầu, vui lòng chờ...</Text>
                </View>
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
                          style={({ pressed }) => [
                            styles.referenceChip,
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
                {isPending ? " · Đang xử lý" : ""}
              </Text>
            </View>
          ) : null}
        </View>
      );
    },
    [handleMarkdownLinkPress, handleReferencePress],
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
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={handleStartNewConversation} style={styles.headerButton}>
              <Ionicons name="add-circle-outline" size={22} color={Colors.white} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push('/ai-chat-history' as never)}
              style={styles.headerButton}
            >
              <Ionicons name="time-outline" size={20} color={Colors.white} />
            </TouchableOpacity>
          </View>
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
        <View style={styles.optionControlRow}>
          <TouchableOpacity
            style={styles.optionButton}
            onPress={() => setOptionPickerVisible(true)}
            activeOpacity={0.85}
          >
            <Ionicons name="speedometer-outline" size={16} color={Colors.primary} />
            <View>
              <Text style={styles.optionButtonText}>
                {`Chế độ: ${currentOption?.label ?? selectedOption} · ${formatEtaLabel(
                  currentOption?.etaSeconds ?? 0,
                )}`}
              </Text>
              <Text style={styles.optionButtonSubtext}>
                {`AI sẽ trả lời sau ~ ${formatEtaLabel(currentOption?.etaSeconds ?? 0)}`}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? insets.top + 16 : 0}
      >
        {isLoadingSession ? (
          <View style={styles.sessionLoadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.sessionLoadingText}>Đang tải phiên trò chuyện...</Text>
          </View>
        ) : (
        <>
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
                <View>
                  <Text style={styles.loadingText}>
                    {`AI sẽ trả lời sau ~ ${formatEtaLabel(currentOption?.etaSeconds ?? 0)}`}
                  </Text>
                  <Text style={styles.loadingSubtext}>
                    {remainingMs > 0
                      ? `Còn ${formatCountdown(remainingMs)} · Chế độ ${currentOption?.label ?? selectedOption
                      }`
                      : "Đang nhận phản hồi..."}
                  </Text>
                  {isAnalysisPending ? (
                    <Text style={styles.loadingSubtext}>AI đang phân tích ảnh, vui lòng chờ thêm.</Text>
                  ) : null}
                </View>
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
          <TouchableOpacity style={styles.iconButton} onPress={handleTakePhoto}>
            <Ionicons name="camera-outline" size={22} color={Colors.gray} />
          </TouchableOpacity>
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
        </>
        )}
      </KeyboardAvoidingView>

      <Modal
        visible={optionPickerVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setOptionPickerVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setOptionPickerVisible(false)}>
          <View style={styles.modalBackdrop}>
            <TouchableWithoutFeedback onPress={() => { }}>
              <View style={styles.modalCard}>
                <View style={styles.modalHeader}>
                  <Ionicons name="speedometer-outline" size={20} color={Colors.primary} />
                  <Text style={styles.modalTitle}>Chọn chế độ trả lời</Text>
                </View>
                {CHAT_OPTIONS.map((option) => {
                  const isActive = option.value === selectedOption;
                  return (
                    <TouchableOpacity
                      key={option.value}
                      style={[styles.modalOption, isActive && styles.modalOptionActive]}
                      activeOpacity={0.9}
                      onPress={() => {
                        setSelectedOption(option.value);
                        setOptionPickerVisible(false);
                      }}
                    >
                      <View style={styles.modalOptionInfo}>
                        <Text style={[styles.modalOptionValue, isActive && styles.modalOptionValueActive]}>
                          {`${option.label} · ${formatEtaLabel(option.etaSeconds)}`}
                        </Text>
                        <Text
                          style={[
                            styles.modalOptionDescription,
                            isActive && styles.modalOptionDescriptionActive,
                          ]}
                        >
                          {option.description}
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
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
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
  optionControlRow: {
    marginTop: 16,
    alignItems: "flex-start",
  },
  optionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.22)",
  },
  optionButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.white,
  },
  optionButtonSubtext: {
    fontSize: 11,
    color: "rgba(255,255,255,0.85)",
    marginTop: 2,
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
    maxWidth: "88%",
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    flexShrink: 1,
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
  pendingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  pendingText: {
    fontSize: 13,
    color: Colors.gray,
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
  loadingSubtext: {
    fontSize: 12,
    color: Colors.gray,
    marginTop: 2,
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
  historyContainer: {
    paddingHorizontal: 16,
  },
  historyCard: {
    maxHeight: Dimensions.get("window").height * 0.75,
    width: "100%",
    alignSelf: "center",
    paddingBottom: 6,
    marginTop: 8,
  },
  historyLoadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    flexWrap: "wrap",
  },
  historyEmpty: {
    textAlign: "center",
    color: Colors.gray,
    paddingVertical: 12,
  },
  historyScrollWrapper: {
    flex: 1,
    maxHeight: Dimensions.get("window").height * 0.55,
    width: "100%",
    minHeight: 260,
    paddingHorizontal: 4,
  },
  historyHero: {
    width: "100%",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    gap: 6,
    overflow: "hidden",
  },
  historyHeroTopRow: {
    width: "100%",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 10,
  },
  historyHeroTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  historySubtitle: {
    fontSize: 12,
    color: Colors.gray,
  },
  historyHeroActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
    width: "100%",
    justifyContent: "flex-start",
  },
  liveChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    flexShrink: 0,
  },
  liveChipProcessing: {
    backgroundColor: "#fff7ed",
    borderColor: "#fdba74",
  },
  liveChipReady: {
    backgroundColor: "#ecfeff",
    borderColor: "#22d3ee",
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
  },
  liveDotWarning: {
    backgroundColor: "#f59e0b",
  },
  liveDotReady: {
    backgroundColor: "#0ea5e9",
  },
  liveChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.dark_gray,
  },
  refreshButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: "rgba(37,99,235,0.12)",
  },
  refreshButtonText: {
    color: Colors.primary,
    fontWeight: "700",
    fontSize: 12,
  },
  historySyncedAt: {
    fontSize: 12,
    color: Colors.dark_gray,
    opacity: 0.7,
  },
  historyFlatList: {
    flex: 1,
  },
  historyErrorText: {
    color: "#b91c1c",
    flexShrink: 1,
  },
  historyRetry: {
    color: Colors.primary,
    fontWeight: "700",
  },
  historyList: {
    gap: 10,
    paddingVertical: 8,
  },
  historyActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 8,
    flexWrap: "wrap",
  },
  closeHistoryButton: {
    marginTop: 8,
    alignSelf: "flex-end",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  loadHistoryButton: {
    alignSelf: "flex-start",
    backgroundColor: "#111827",
  },
  closeHistoryButtonDisabled: {
    opacity: 0.6,
  },
  closeHistoryText: {
    color: Colors.white,
    fontWeight: "600",
  },
  historyItem: {
    padding: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderGray,
    backgroundColor: "#f8fafc",
    gap: 8,
  },
  historyItemPressed: {
    opacity: 0.95,
    transform: [{ scale: 0.995 }],
  },
  historyItemHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  historyHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  historyRolePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  historyRoleUser: {
    backgroundColor: "rgba(24,119,242,0.12)",
  },
  historyRoleAi: {
    backgroundColor: "rgba(16,185,129,0.14)",
  },
  historyRoleText: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.dark_gray,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  historyTimestamp: {
    fontSize: 11,
    color: Colors.gray,
  },
  historyContent: {
    fontSize: 13,
    color: Colors.dark_gray,
    lineHeight: 18,
  },
  historyPendingChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#fff7ed",
  },
  historyPendingChipText: {
    fontSize: 11,
    color: "#b45309",
    fontWeight: "700",
  },
  historyPendingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  historyPendingText: {
    flex: 1,
    fontSize: 13,
    color: Colors.dark_gray,
  },
  sessionLoadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  sessionLoadingText: {
    fontSize: 14,
    color: Colors.gray,
  },
});
