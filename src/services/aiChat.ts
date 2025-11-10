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
  return API.post("/core/ai-chat/analyze-palm", data, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

export const analyzeFaceImage = (uri: string, name?: string | null, mimeType?: string | null) => {
  const data = createFormData(uri, name, mimeType);
  return API.post("/core/ai-chat/analyze-face", data, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

export const streamChatWithAI = async (
  payload: Record<string, unknown>,
  callbacks: StreamCallbacks,
) => {
  const sanitizeSsePayload = (raw: string): string => {
    if (!raw) {
      return "";
    }

    const lines = raw.split(/\r?\n/);
    const dataLines: string[] = [];

    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) {
        return;
      }

      if (/^data:/i.test(trimmed)) {
        dataLines.push(trimmed.replace(/^data:\s*/i, ""));
        return;
      }

      if (/^(event|id|retry):/i.test(trimmed)) {
        return;
      }

      dataLines.push(trimmed);
    });

    const joined = dataLines.join("\n").trim();
    return joined.replace(/^data:\s*/gim, "");
  };

  const controller = new AbortController();
  callbacks.onStart?.(controller);

  try {
    const token = await SecureStore.getItemAsync("authToken");
    const baseURL = API.defaults.baseURL ?? "";
    const url = `${baseURL.replace(/\/$/, "")}/core/ai-chat/query-stream`;

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

    const processEvent = (raw: string) => {
      if (!raw) {
        return false;
      }

      const lines = raw
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

      if (lines.length === 0) {
        return false;
      }

      const rawPayload = lines
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.replace(/^data:\s*/i, ""))
        .join("\n");

      const dataPayload = sanitizeSsePayload(rawPayload || raw);

      if (!dataPayload) {
        return false;
      }

      if (dataPayload === "[DONE]") {
        callbacks.onComplete?.();
        controller.abort();
        return true;
      }

      callbacks.onChunk?.(dataPayload);
      return false;
    };

    while (true) {
      const { value, done } = await reader.read();
      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });

      let separatorIndex = buffer.indexOf("\n\n");
      while (separatorIndex !== -1) {
        const event = buffer.slice(0, separatorIndex);
        buffer = buffer.slice(separatorIndex + 2);
        const shouldStop = processEvent(event);
        if (shouldStop) {
          return controller;
        }
        separatorIndex = buffer.indexOf("\n\n");
      }
    }

    if (buffer.trim().length > 0) {
      processEvent(buffer);
    }

    if (!controller.signal.aborted) {
      callbacks.onComplete?.();
    }
  } catch (error) {
    if (!controller.signal.aborted) {
      callbacks.onError?.(error);
    }
  }

  return controller;
};
