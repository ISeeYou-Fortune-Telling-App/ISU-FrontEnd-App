import { useFonts } from "expo-font";
import { SplashScreen, Stack } from "expo-router";
import { useEffect } from "react";
import { PaperProvider } from "react-native-paper";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { theme } from '../constants/theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
     inter: require("@/assets/fonts/Inter-VariableFont.ttf"),
     segoeui:require("@/assets/fonts/SVN-SegoeUI.ttf")
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null; // block UI until fonts are ready
  }

  return (
    <PaperProvider theme={theme}>
      <SafeAreaProvider>
        <Stack initialRouteName="auth">
          <Stack.Screen name="(tabs)" options={{headerShown: false}}/>
          <Stack.Screen name="auth" options={{headerShown: false}}/>
          <Stack.Screen name="forgot-password" options={{headerShown: false}}/>
          <Stack.Screen name="password-recovery" options={{headerShown: false}}/>
          <Stack.Screen name="seer-registration" options={{headerShown: false}}/>
          <Stack.Screen name="seer-registration-step2" options={{headerShown: false}}/>
          <Stack.Screen name="seer-registration-step3" options={{headerShown: false}}/>
          <Stack.Screen name="add-certificate" options={{headerShown: false}}/>
          <Stack.Screen name="notification" options={{headerShown: false}}/>
          <Stack.Screen name="chat-detail" options={{headerShown: false}}/>
          <Stack.Screen name="delete-account" options={{headerShown: false}}/>
          <Stack.Screen name="ai-chat" options={{headerShown: false}}/>
          <Stack.Screen name="profile-setting" options={{headerShown: false}}/>
          <Stack.Screen name="edit-profile" options={{headerShown: false}}/>
          <Stack.Screen name="create-package" options={{headerShown: false}}/>
          <Stack.Screen name="update-package" options={{headerShown: false}}/>
          <Stack.Screen name="report" options={{headerShown: false}}/>
        </Stack>
      </SafeAreaProvider>
    </PaperProvider>
  );
}

