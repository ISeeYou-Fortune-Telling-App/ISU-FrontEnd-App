import { Stack, useRouter } from "expo-router";
import { useEffect } from "react";
import { PaperProvider } from "react-native-paper";
import { theme } from '../theme/theme';

function RouteGuard({ children }: { children: React.ReactNode }) {
  const isAuth = false;
  const router = useRouter();

  useEffect(() => {
    if(!isAuth) {
      setTimeout(() => {
        router.replace("/auth");
      }, 0);
    }
  });
  return <>{children}</>
}

export default function RootLayout() {
  return (
    <PaperProvider theme={theme}>
      <RouteGuard>
        <Stack>
          <Stack.Screen name="(tabs)" options={{headerShown: false}}/>
          <Stack.Screen name="auth" options={{headerShown: false}}/>
          <Stack.Screen name="password-recovery" options={{headerShown: false}}/>
          <Stack.Screen name="seer-registration" options={{headerShown: false}}/>
          <Stack.Screen name="seer-registration-step2" options={{headerShown: false}}/>
          <Stack.Screen name="seer-registration-step3" options={{headerShown: false}}/>
          <Stack.Screen name="add-certificate" options={{headerShown: false}}/>
        </Stack>
      </RouteGuard>
    </PaperProvider>
  );
}
