import { CallProvider } from "@/src/contexts/CallContext";
import "@/src/polyfills/native-event-emitter";
import { initCometChat, loginCometChatUser, validateCometChatEnv } from "@/src/services/cometchat";
import { runRealtimeSelfCheck } from "@/src/services/diagnostics";
import { CometChat } from "@cometchat/chat-sdk-react-native";
import messaging from "@react-native-firebase/messaging";
import * as Device from "expo-device";
import { useFonts } from "expo-font";
import * as Linking from "expo-linking";
import * as Notifications from "expo-notifications";
import { SplashScreen, Stack, useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useEffect } from "react";
import { Alert, Platform } from "react-native";
import { PaperProvider } from "react-native-paper";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { theme } from "../constants/theme";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowInForeground: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotificationsAsync() {
  let token;

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      alert('Failed to get push token for push notification!');
      return;
    }

    // token = (await Notifications.getExpoPushTokenAsync()).data;
    // await SecureStore.setItemAsync("expoPushToken", token);
    // console.log('Expo Push Token:', token);

    token = await messaging().getToken();
    await SecureStore.setItemAsync("fcmToken", token);
    console.log('FCM Token:', token);
  } else {
    alert('Must use physical device for Push Notifications');
  }

  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  return token;
}

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const router = useRouter();
  const [fontsLoaded] = useFonts({
    inter: require("@/assets/fonts/Inter-VariableFont.ttf"),
    segoeui: require("@/assets/fonts/SVN-SegoeUI.ttf")
  });

  useEffect(() => {
    const status = validateCometChatEnv();
    if (!status.ok) {
      Alert.alert(
        "Thiếu cấu hình CometChat",
        `Cần thêm: ${status.missing.join(", ")}. Vui lòng bổ sung ENV để dùng cuộc gọi.`,
      );
    }

    initCometChat().catch((error) => {
      console.warn("Unable to init CometChat", error);
    });

    runRealtimeSelfCheck()
      .then((result) => {
        if (result.findings.length) {
          console.warn("[HealthCheck]", result.findings.join(" | "));
        }
      })
      .catch((error) => console.warn("[HealthCheck] failed", error));
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const authToken = await SecureStore.getItemAsync("authToken");
        if (!authToken) {
          return;
        }

        const existing = await CometChat.getLoggedinUser();
        if (existing) {
          return;
        }

        const uid =
          (await SecureStore.getItemAsync("cometChatUid")) ||
          (await SecureStore.getItemAsync("userId"));

        if (uid) {
          await loginCometChatUser(uid);
        }
      } catch (error) {
        console.warn("Unable to login to CometChat", error);
      }
    })();
  }, []);

  useEffect(() => {
    const handleDeepLink = (url: string) => {
      const { hostname, path, queryParams } = Linking.parse(url);

      console.log('Deep link received:', { hostname, path, queryParams, url });

      // Handle custom deep links
      if (hostname === 'homescreen') {
        router.replace('/home');
      } else if (hostname === 'bookings') {
        router.replace('/booking');
      } else if (hostname === 'profile') {
        router.replace('/profile');
      } else if (hostname === 'payment-success') {
        // Handle payment success
        const bookingId = queryParams?.bookingId as string;
        if (bookingId) {
          router.replace('/booking');
          setTimeout(() => {
            router.push(`/booking-detail?bookingId=${bookingId}`);
          }, 0);
        } else {
          router.replace('/booking');
        }
      } else if (hostname === 'payment-cancel') {
        router.replace('/booking');
      } else {
        // Default to home screen for unknown links
        router.replace('/home');
      }
    };

    // Handle initial URL (when app is opened from deep link)
    Linking.getInitialURL().then((url) => {
      if (url) {
        console.log('Initial URL:', url);
        handleDeepLink(url);
      }
    });

    // Handle deep links when app is already running
    const subscription = Linking.addEventListener('url', ({ url }) => {
      console.log('URL event:', url);
      handleDeepLink(url);
    });

    return () => {
      subscription?.remove();
    };
  }, [router]);

  useEffect(() => {
    //PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
    registerForPushNotificationsAsync();

    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  useEffect(() => {
    const unsubscribe = messaging().onMessage(async (remoteMessage) => {
      console.log('📩 Foreground message received!', remoteMessage);

      try {
        const title = remoteMessage.notification?.title ?? remoteMessage.data?.title;
        const body = remoteMessage.notification?.body ?? remoteMessage.data?.body;
        const data = remoteMessage.data ?? {};

        const titleText = typeof title === 'string' ? title : (title ? JSON.stringify(title) : undefined);
        const bodyText = typeof body === 'string' ? body : (body ? JSON.stringify(body) : undefined);

        // Present a local notification using expo-notifications so the user
        // sees it while the app is in the foreground.
        await Notifications.scheduleNotificationAsync({
          content: {
            title: titleText,
            body: bodyText,
            data: data,
          },
          trigger: null,
        });
      } catch (error) {
        console.warn('Error presenting foreground notification', error);
      }
    });

    return unsubscribe;
  }, []);

  if (!fontsLoaded) {
    return null; // block UI until fonts are ready
  }

  return (
    <PaperProvider theme={theme}>
      <SafeAreaProvider>
        <CallProvider>
          <Stack initialRouteName="auth">
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="auth" options={{ headerShown: false }} />
            <Stack.Screen name="forgot-password" options={{ headerShown: false }} />
            <Stack.Screen name="password-recovery" options={{ headerShown: false }} />
            <Stack.Screen name="seer-registration" options={{ headerShown: false }} />
            <Stack.Screen name="seer-registration-step2" options={{ headerShown: false }} />
            <Stack.Screen name="seer-registration-step3" options={{ headerShown: false }} />
            <Stack.Screen name="add-certificate" options={{ headerShown: false }} />
            <Stack.Screen name="notification" options={{ headerShown: false }} />
            <Stack.Screen name="chat-detail" options={{ headerShown: false }} />
            <Stack.Screen name="delete-account" options={{ headerShown: false }} />
            <Stack.Screen name="ai-chat" options={{ headerShown: false }} />
            <Stack.Screen name="profile-setting" options={{ headerShown: false }} />
            <Stack.Screen name="edit-profile" options={{ headerShown: false }} />
            <Stack.Screen name="edit-profile-images" options={{ headerShown: false }} />
            <Stack.Screen name="create-package" options={{ headerShown: false }} />
            <Stack.Screen name="update-package" options={{ headerShown: false }} />
            <Stack.Screen name="report" options={{ headerShown: false }} />
            <Stack.Screen name="service-package-reviews" options={{ headerShown: false }} />
            <Stack.Screen name="book-package" options={{ headerShown: false }} />
            <Stack.Screen name="booking-detail" options={{ headerShown: false }} />
            <Stack.Screen name="knowledge-detail" options={{ headerShown: false }} />
            <Stack.Screen name="my-packages" options={{ headerShown: false }} />
            <Stack.Screen name="package-detail" options={{ headerShown: false }} />
            <Stack.Screen name="transaction-history" options={{ headerShown: false }} />
            <Stack.Screen name="search" options={{ headerShown: false }} />
            <Stack.Screen name="otp-verification" options={{ headerShown: false }} />
            <Stack.Screen name="customer-potential" options={{ headerShown: false }} />
            <Stack.Screen name="seer-performance" options={{ headerShown: false }} />
            <Stack.Screen name="manage-certificate" options={{ headerShown: false }} />
            <Stack.Screen name="seer-profile" options={{ headerShown: false }} />
        </Stack>
        </CallProvider>
      </SafeAreaProvider>
    </PaperProvider>
  );
}

