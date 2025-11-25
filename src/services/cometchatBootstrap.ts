import { CometChat } from "@cometchat/chat-sdk-react-native";
import * as SecureStore from "expo-secure-store";
import { initCometChat, loginCometChatUser, logoutCometChatUser, waitForOngoingLogin } from "@/src/services/cometchat";

type BootstrapOptions = {
  forceRelogin?: boolean;
};

// Prevent concurrent bootstrap calls from multiple sources
let bootstrapPromise: Promise<any> | null = null;

/**
 * Bootstrap CometChat giống web:
 * - Chỉ cần UID (cometChatUid hoặc userId) lưu sẵn.
 * - Không phụ thuộc JWT backend cho bước login CometChat.
 * - Nếu đã login đúng UID thì tái sử dụng, nếu khác UID thì logout rồi login lại.
 */
export const bootstrapCometChatUser = async (options: BootstrapOptions = {}) => {
  // If another bootstrap is in progress, wait for it
  if (bootstrapPromise) {
    console.log("[Bootstrap] Waiting for ongoing bootstrap...");
    try {
      return await bootstrapPromise;
    } catch (err) {
      console.warn("[Bootstrap] Previous bootstrap failed, retrying", err);
    }
  }

  bootstrapPromise = (async () => {
    try {
      console.log("[Bootstrap] Starting init...");
      await initCometChat();
      console.log("[Bootstrap] Init complete");

      // Avoid racing with another ongoing login kicked off elsewhere.
      console.log("[Bootstrap] Checking for ongoing login...");
      const inFlightUser = await waitForOngoingLogin();
      console.log("[Bootstrap] Ongoing login check complete:", inFlightUser?.getUid?.() ?? "none");

      const uid =
        (await SecureStore.getItemAsync("cometChatUid")) ??
        (await SecureStore.getItemAsync("userId"));

      if (!uid) {
        throw new Error("Thiếu CometChat UID (cometChatUid hoặc userId).");
      }
      console.log("[Bootstrap] Target UID:", uid);

      // Prefer the user returned from waitForOngoingLogin so we respect any in-flight login.
      const existing = inFlightUser ?? (await CometChat.getLoggedinUser().catch(() => null));
      console.log("[Bootstrap] Existing logged in user:", existing?.getUid?.() ?? "none");

      if (!options.forceRelogin && existing?.getUid?.() === uid) {
        console.log("[Bootstrap] Reusing existing session", uid);
        return existing;
      }

      // If forceRelogin or wrong user, log out first (ignore errors such as USER_NOT_LOGED_IN).
      if (options.forceRelogin || (existing && existing.getUid?.() !== uid)) {
        console.log("[Bootstrap] Logging out before re-login...");
        // Give any concurrent login a moment to settle to avoid SDK LOGIN_IN_PROGRESS.
        await waitForOngoingLogin();
        await logoutCometChatUser().catch(() => { });
        console.log("[Bootstrap] Logout complete");
      }

      console.log("[Bootstrap] Calling loginCometChatUser...");
      return await loginCometChatUser(uid);
    } finally {
      bootstrapPromise = null;
    }
  })();

  return bootstrapPromise;
};
