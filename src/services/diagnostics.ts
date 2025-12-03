import { getCometChatEnvStatus, waitForOngoingLogin } from "@/src/services/cometchat";
import { resolveSocketConfig } from "@/src/utils/network";
import { CometChat } from "@cometchat/chat-sdk-react-native";
import * as SecureStore from "expo-secure-store";

type HealthCheckOptions = {
  /** If true, wait for any ongoing CometChat login before reporting user state. */
  waitForLogin?: boolean;
  /** Optional label to distinguish callers in logs. */
  label?: string;
};

// Lightweight, non-blocking health check for realtime stack.
export const runRealtimeSelfCheck = async (options: HealthCheckOptions = {}) => {
  const label = options.label ?? "HealthCheck";
  const envStatus = getCometChatEnvStatus();
  const socketVersion = require("socket.io-client/package.json").version;
  const socketConfig = resolveSocketConfig();
  const findings: string[] = [];

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

  if (!cometUserUid && options.waitForLogin) {
    // If a login is still in-flight, wait for it and re-check.
    const user = await waitForOngoingLogin();
    cometUserUid = user?.getUid?.() ?? null;
  }

  console.log(`[${label}] CometChat env OK:`, envStatus.ok, "missing:", envStatus.missing);
  console.log(`[${label}] Socket.io client version:`, socketVersion, "url:", socketConfig.url, "path:", socketConfig.path);
  console.log(
    `[${label}] Tokens -> auth:`,
    Boolean(authToken),
    "cometUid:",
    cometUid ?? "none",
    "userId:",
    userId ?? "none",
  );
  console.log(`[${label}] Logged-in CometChat user:`, cometUserUid ?? "none");
  if (cometUid && cometUserUid && cometUid !== cometUserUid) {
    findings.push(`CometChat đang đăng nhập uid ${cometUserUid} khác với stored uid ${cometUid} – cần logout/login lại.`);
  }

  if (!envStatus.ok) {
    findings.push(`Thiếu ENV CometChat: ${envStatus.missing.join(", ")}`);
  }
  if (!authToken) {
    findings.push("Chưa có authToken – cần đăng nhập thành công.");
  }
  if (!cometUid) {
    findings.push("Chưa lưu cometChatUid – sẽ không gọi/nhắn được.");
  }
  if (!socketConfig.url) {
    findings.push("Không xác định được socketBaseUrl – kiểm tra EXPO_PUBLIC_SOCKET_URL/PORT.");
  }

  return { envStatus, socketVersion, socketConfig, authToken: Boolean(authToken), cometUid, cometUserUid, findings };
};
