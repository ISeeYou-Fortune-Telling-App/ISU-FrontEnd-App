import API from "@/src/services/api";
import * as SecureStore from "expo-secure-store";

type StreamCallbacks = {
  onChunk?: (chunk: string) => void;
  onError?: (error: unknown) => void;
  onComplete?: () => void;
  onStart?: (controller: AbortController) => void;
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
  return API.post("/ai-chat/analyze-palm", data, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

export const analyzeFaceImage = (uri: string, name?: string | null, mimeType?: string | null) => {
  const data = createFormData(uri, name, mimeType);
  return API.post("/ai-chat/analyze-face", data, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

export const streamChatWithAI = async (
  payload: Record<string, unknown>,
  callbacks: StreamCallbacks,
) => {
  const controller = new AbortController();
  callbacks.onStart?.(controller);

  try {
    const token = await SecureStore.getItemAsync("authToken");
    const baseURL = API.defaults.baseURL ?? "";
    const url = `${baseURL.replace(/\/$/, "")}/ai-chat/query-stream`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Streaming request failed with status ${response.status}`);
    }

    const reader: ReadableStreamDefaultReader<Uint8Array> | undefined =
      typeof response.body?.getReader === "function" ? response.body.getReader() : undefined;

    if (!reader) {
      const text = await response.text();
      callbacks.onChunk?.(text);
      callbacks.onComplete?.();
      return controller;
    }

    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split("\n\n");
      buffer = parts.pop() ?? "";

      parts.forEach((raw) => {
        const line = raw.trim();
        if (!line.startsWith("data:")) {
          return;
        }

        const data = line.replace(/^data:\s*/, "");
        if (data === "[DONE]") {
          callbacks.onComplete?.();
          controller.abort();
          return;
        }

        callbacks.onChunk?.(data);
      });
    }

    if (buffer.length > 0) {
      const data = buffer.replace(/^data:\s*/, "");
      if (data && data !== "[DONE]") {
        callbacks.onChunk?.(data);
      }
    }

    callbacks.onComplete?.();
  } catch (error) {
    if (!controller.signal.aborted) {
      callbacks.onError?.(error);
    }
  }

  return controller;
};
