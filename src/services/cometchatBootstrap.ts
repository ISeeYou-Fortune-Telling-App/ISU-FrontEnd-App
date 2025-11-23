import { CometChat } from "@cometchat/chat-sdk-react-native";
import * as SecureStore from "expo-secure-store";
import { initCometChat, loginCometChatUser, logoutCometChatUser } from "@/src/services/cometchat";

type BootstrapOptions = {
  forceRelogin?: boolean;
};

/**
 * Bootstrap CometChat giống web:
 * - Chỉ cần UID (cometChatUid hoặc userId) lưu sẵn.
 * - Không phụ thuộc JWT backend cho bước login CometChat.
 * - Nếu đã login đúng UID thì tái sử dụng, nếu khác UID thì logout rồi login lại.
 */
export const bootstrapCometChatUser = async (options: BootstrapOptions = {}) => {
  await initCometChat();

  const uid =
    (await SecureStore.getItemAsync("cometChatUid")) ??
    (await SecureStore.getItemAsync("userId"));

  if (!uid) {
    throw new Error("Thiếu CometChat UID (cometChatUid hoặc userId).");
  }

  const existing = await CometChat.getLoggedinUser().catch(() => null);

  if (!options.forceRelogin && existing?.getUid?.() === uid) {
    return existing;
  }

  if (existing && existing.getUid?.() !== uid) {
    await logoutCometChatUser().catch(() => {});
  }

  return loginCometChatUser(uid);
};
