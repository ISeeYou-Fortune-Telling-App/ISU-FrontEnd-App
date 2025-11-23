import { getCometChatEnvStatus } from "@/src/services/cometchat";
import { resolveSocketUrl } from "@/src/utils/network";
import { CometChat } from "@cometchat/chat-sdk-react-native";
import * as SecureStore from "expo-secure-store";

// Lightweight, non-blocking health check for realtime stack.
export const runRealtimeSelfCheck = async () => {
  const envStatus = getCometChatEnvStatus();
  const socketVersion = require("socket.io-client/package.json").version;
  const socketBaseUrl = resolveSocketUrl();

  const [authToken, cometUid, userId] = await Promise.all([
    SecureStore.getItemAsync("authToken"),
    SecureStore.getItemAsync("cometChatUid"),
    SecureStore.getItemAsync("userId"),
  ]);

  let cometUserUid: string | null = null;
  try {
    const user = await CometChat.getLoggedinUser();
    cometUserUid = user?.getUid?.() ?? null;
  } catch {
    cometUserUid = null;
  }

  console.log("[HealthCheck] CometChat env OK:", envStatus.ok, "missing:", envStatus.missing);
  console.log("[HealthCheck] Socket.io client version:", socketVersion, "base:", socketBaseUrl);
  console.log(
    "[HealthCheck] Tokens -> auth:",
    Boolean(authToken),
    "cometUid:",
    cometUid ?? "none",
    "userId:",
    userId ?? "none",
  );
  console.log("[HealthCheck] Logged-in CometChat user:", cometUserUid ?? "none");
  if (cometUid && cometUserUid && cometUid !== cometUserUid) {
    findings.push(`CometChat đang đăng nhập uid ${cometUserUid} khác với stored uid ${cometUid} – cần logout/login lại.`);
  }

  const findings: string[] = [];
  if (!envStatus.ok) {
    findings.push(`Thiếu ENV CometChat: ${envStatus.missing.join(", ")}`);
  }
  if (!authToken) {
    findings.push("Chưa có authToken – cần đăng nhập thành công.");
  }
  if (!cometUid) {
    findings.push("Chưa lưu cometChatUid – sẽ không gọi/nhắn được.");
  }
  if (!socketBaseUrl) {
    findings.push("Không xác định được socketBaseUrl – kiểm tra EXPO_PUBLIC_SOCKET_URL/PORT.");
  }

  return { envStatus, socketVersion, socketBaseUrl, authToken: Boolean(authToken), cometUid, cometUserUid, findings };
};
