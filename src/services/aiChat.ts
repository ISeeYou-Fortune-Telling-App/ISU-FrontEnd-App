import API from "@/src/services/api";
import { ensureHttpProtocol, resolveHostFromExpo } from "@/src/utils/network";
import * as SecureStore from "expo-secure-store";

const stripTrailingSlash = (value?: string | null) =>
  typeof value === "string" ? value.replace(/\/+$/, "") : value ?? "";

const inferAiBaseFromApiBase = () => {
  const apiBase = ensureHttpProtocol(process.env.EXPO_PUBLIC_API_BASE_URL);
  if (!apiBase) {
    return null;
  }

  try {
    const url = new URL(apiBase);
    const fallbackPort = process.env.EXPO_PUBLIC_AI_BASE_PORT ?? "8081";
    url.port = fallbackPort;
    return stripTrailingSlash(url.toString());
  } catch {
    return null;
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

  const expoResolved = resolveHostFromExpo(Number(process.env.EXPO_PUBLIC_AI_BASE_PORT) || 8081);
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

export const analyzePalmImage = (uri: string, name?: string | null, mimeType?: string | null) => {
  const data = createFormData(uri, name, mimeType);
  return API.post(buildAiChatUrl("/ai-chat/analyze-palm"), data, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

export const analyzeFaceImage = (uri: string, name?: string | null, mimeType?: string | null) => {
  const data = createFormData(uri, name, mimeType);
  return API.post(buildAiChatUrl("/ai-chat/analyze-face"), data, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

export const chatWithAI = async (payload: Record<string, unknown>) => {
  const token = await SecureStore.getItemAsync("authToken");
  const response = await fetch(buildAiChatUrl("/ai-chat/query"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
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
