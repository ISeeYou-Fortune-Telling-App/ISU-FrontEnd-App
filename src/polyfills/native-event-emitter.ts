// Ensure native modules used with NativeEventEmitter expose addListener/removeListeners
// Some third-party SDKs (e.g., CometChatCalls, react-native-background-timer) miss these on Android
// which triggers a runtime warning on RN 0.81+. We add no-op implementations if absent.

import { NativeModules } from "react-native";

const MODULE_NAMES = [
  "CometChatCalls",
  "CometChat",
  "RNBackgroundTimer",
];

MODULE_NAMES.forEach((name) => {
  const mod = (NativeModules as any)[name];
  if (!mod) {
    return;
  }

  if (!mod.addListener) {
    mod.addListener = () => () => {};
  }

  if (!mod.removeListeners) {
    mod.removeListeners = () => {};
  }
});

