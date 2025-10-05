import { Stack, useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useEffect } from "react";
import { PaperProvider } from "react-native-paper";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { theme } from '../theme/theme';

function RouteGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      const token = await SecureStore.getItemAsync("authToken");
      if (token) {
        setTimeout(() => {
          router.replace("/(tabs)/home");
        }, 0);
      } 
      else {
        setTimeout(() => {
          router.replace("/auth");
        }, 0);
      }
    }

    checkAuth();
  }, []);
  return <>{children}</>
}

export default function RootLayout() {
  return (
    <PaperProvider theme={theme}>
      <SafeAreaProvider>
        <RouteGuard>
          <Stack>
            <Stack.Screen name="(tabs)" options={{headerShown: false}}/>
            <Stack.Screen name="auth" options={{headerShown: false}}/>
            <Stack.Screen name="password-recovery" options={{headerShown: false}}/>
          </Stack>
        </RouteGuard>
      </SafeAreaProvider>
    </PaperProvider>
  );
}
