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

/**
 * Resolves socket configuration for both local and remote (ngrok) environments.
 * Returns an object with:
 * - url: The base URL for socket.io connection
 * - path: The socket.io path (default /socket.io, or /socket/socket.io for ngrok)
 * - isRemote: Whether this is a remote/ngrok connection
 */
export const resolveSocketConfig = () => {
  const explicit = ensureHttpProtocol(process.env.EXPO_PUBLIC_SOCKET_URL);
  
  if (explicit) {
    const trimmed = stripTrailingSlash(explicit);
    // Check if this is a remote URL with a path (like ngrok)
    try {
      const parsed = new URL(trimmed);
      const pathname = parsed.pathname;
      
      // If there's a path component (e.g., /socket), use it as the socket.io path prefix
      if (pathname && pathname !== "/") {
        return {
          url: `${parsed.protocol}//${parsed.host}`,
          path: `${pathname}/socket.io`,
          isRemote: true,
        };
      }
    } catch (e) {
      // Fall through to default behavior
    }
    
    return {
      url: trimmed,
      path: "/socket.io",
      isRemote: false,
    };
  }

  const socketPort = safeTrim(process.env.EXPO_PUBLIC_SOCKET_PORT) || DEFAULT_SOCKET_PORT;
  const chatBase = ensureHttpProtocol(process.env.EXPO_PUBLIC_CHAT_BASE_URL);
  const apiBase = ensureHttpProtocol(process.env.EXPO_PUBLIC_API_BASE_URL);
  const preferredBase = chatBase || apiBase;

  if (preferredBase) {
    try {
      const url = new URL(preferredBase);
      url.port = socketPort;
      return {
        url: stripTrailingSlash(url.toString()),
        path: "/socket.io",
        isRemote: false,
      };
    } catch (err) {
      console.warn("Không thể phân tích API base URL để suy ra socket URL", err);
    }
  }

  const fallbackPort = Number(socketPort) || Number(DEFAULT_SOCKET_PORT);
  return {
    url: stripTrailingSlash(resolveHostFromExpo(fallbackPort)),
    path: "/socket.io",
    isRemote: false,
  };
};

// Legacy function for backward compatibility
export const resolveSocketUrl = () => {
  const config = resolveSocketConfig();
  return config.url;
};
