import API from "@/src/services/api";
import { ensureHttpProtocol, resolveHostFromExpo } from "@/src/utils/network";
import * as SecureStore from "expo-secure-store";

const stripTrailingSlash = (value?: string | null) =>
  typeof value === "string" ? value.replace(/\/+$/, "") : value ?? "";

const isRemoteUrl = (url: string) => {
  // Check if this is a remote/production URL (ngrok, .dev, .com, etc.)
  const trimmed = url.trim();
  return trimmed.includes("ngrok") || trimmed.includes(".dev") || trimmed.includes(".com") || trimmed.includes(".io");
};

const inferAiBaseFromApiBase = () => {
  const apiBase = ensureHttpProtocol(process.env.EXPO_PUBLIC_API_BASE_URL);
  if (!apiBase) {
    return null;
  }

  try {
    const url = new URL(apiBase);
    // For remote URLs (like ngrok), keep the URL as-is without changing port
    if (isRemoteUrl(apiBase)) {
      return stripTrailingSlash(apiBase);
    }
    // For local development, force AI calls to hit core backend port 8080
    url.port = "8080";
    return stripTrailingSlash(url.toString());
  } catch {
    return stripTrailingSlash(apiBase);
  }
};

const resolveAiChatBaseUrl = () => {
  const envBase = ensureHttpProtocol(process.env.EXPO_PUBLIC_AI_BASE_URL);
  if (envBase) {
    return stripTrailingSlash(envBase);
  }

  const inferred = inferAiBaseFromApiBase();
  if (inferred) {
    return inferred;
  }

  // Fall back to the Expo host using the core API port (default 8080).
  const expoResolved = resolveHostFromExpo(Number(process.env.EXPO_PUBLIC_API_BASE_PORT) || 8081);
  if (expoResolved) {
    return stripTrailingSlash(expoResolved);
  }

  return "http://localhost:8081";
};

const AI_CHAT_BASE_URL = resolveAiChatBaseUrl();
const buildAiChatUrl = (path: string) => {
  if (!path.startsWith("/")) {
    return `${AI_CHAT_BASE_URL}/${path}`;
  }
  return `${AI_CHAT_BASE_URL}${path}`;
};

const createFormData = (uri: string, name?: string | null, mimeType?: string | null) => {
  const formData = new FormData();
  const sanitizedName = name ?? uri.split("/").pop() ?? `attachment-${Date.now()}.jpg`;

  formData.append(
    "file",
    {
      uri,
      name: sanitizedName,
      type: mimeType ?? "image/jpeg",
    } as any,
  );

  return formData;
};

export const analyzePalmImage = (
  uri: string,
  name?: string | null,
  mimeType?: string | null,
  selectedOption: number = 1,
) => {
  const data = createFormData(uri, name, mimeType);
  data.append("selected_option", String(selectedOption));

  return API.post(buildAiChatUrl("/ai-support/analyze-palm"), data, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

export const analyzeFaceImage = (
  uri: string,
  name?: string | null,
  mimeType?: string | null,
  selectedOption: number = 1,
) => {
  const data = createFormData(uri, name, mimeType);
  data.append("selected_option", String(selectedOption));

  return API.post(buildAiChatUrl("/ai-support/analyze-face"), data, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

export const chatWithAI = async (payload: Record<string, unknown>) => {
  const [token, userId] = await Promise.all([
    SecureStore.getItemAsync("authToken"),
    SecureStore.getItemAsync("userId"),
  ]);
  
  const response = await fetch(buildAiChatUrl("/ai-support/query"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      ...payload,
      user_id: userId,
    }),
  });

  if (!response.ok) {
    const fallbackText = await response.text().catch(() => "");
    throw new Error(
      fallbackText?.length ? fallbackText : `AI request failed with status ${response.status}`,
    );
  }

  const data = await response.json().catch(() => ({}));
  return { data };
};

export const getAiChatHistory = async (page = 1, limit = 20) => {
  const token = await SecureStore.getItemAsync("authToken");
  const response = await fetch(
    buildAiChatUrl(`/ai-support/my-chat-history?page=${page}&limit=${limit}`),
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    },
  );

  if (!response.ok) {
    const fallbackText = await response.text().catch(() => "");
    throw new Error(
      fallbackText?.length ? fallbackText : `AI history failed with status ${response.status}`,
    );
  }

  const data = await response.json().catch(() => ({}));
  return { data };
};
