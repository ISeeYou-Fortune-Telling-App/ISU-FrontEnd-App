import Constants from "expo-constants";
import { Platform } from "react-native";

const safeTrim = (value) => (typeof value === "string" ? value.trim() : "");
const DEFAULT_SOCKET_PORT = "8082"; // matches backend Socket.IO default

export const ensureHttpProtocol = (raw) => {
  const trimmed = safeTrim(raw);
  if (!trimmed) {
    return null;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `http://${trimmed}`;
};

const getDebuggerHost = () =>
  Constants.expoConfig?.hostUri ||
  Constants.manifest?.debuggerHost ||
  Constants.manifest2?.extra?.expoClient?.hostUri ||
  Constants.manifest2?.extra?.expoGo?.debuggerHost ||
  null;

export const resolveHostFromExpo = (port = 8080) => {
  const hostUri = getDebuggerHost();
  if (!hostUri) {
    return null;
  }

  const host = hostUri.split(":")[0];
  if (!host) {
    return null;
  }

  const normalizedPort = typeof port === "number" ? port : parseInt(port, 10) || 8080;

  if (host.includes("localhost") || host.startsWith("127.")) {
    if (Platform.OS === "android") {
      return `http://10.0.2.2:${normalizedPort}`;
    }
    if (Platform.OS === "ios") {
      return `http://localhost:${normalizedPort}`;
    }
    return null;
  }

  return `http://${host}:${normalizedPort}`;
};

const stripTrailingSlash = (url) => (typeof url === "string" ? url.replace(/\/+$/, "") : url);

export const resolveSocketUrl = () => {
  const explicit = ensureHttpProtocol(process.env.EXPO_PUBLIC_SOCKET_URL);
  if (explicit) {
    return stripTrailingSlash(explicit);
  }

  const socketPort = safeTrim(process.env.EXPO_PUBLIC_SOCKET_PORT) || DEFAULT_SOCKET_PORT;
  const chatBase = ensureHttpProtocol(process.env.EXPO_PUBLIC_CHAT_BASE_URL);
  const apiBase = ensureHttpProtocol(process.env.EXPO_PUBLIC_API_BASE_URL);
  const preferredBase = chatBase || apiBase;

  if (preferredBase) {
    try {
      const url = new URL(preferredBase);
      url.port = socketPort;
      return stripTrailingSlash(url.toString());
    } catch (err) {
      console.warn("Không thể phân tích API base URL để suy ra socket URL", err);
    }
  }

  const fallbackPort = Number(socketPort) || Number(DEFAULT_SOCKET_PORT);
  return stripTrailingSlash(resolveHostFromExpo(fallbackPort));
};
