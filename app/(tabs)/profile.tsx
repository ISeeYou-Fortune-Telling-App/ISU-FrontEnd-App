import { useFonts } from "expo-font";
import { Bell, Settings } from "lucide-react-native";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ProfileScreen() {
  const [fontsLoaded] = useFonts({
    "inter": require("../../assets/fonts/Inter-VariableFont.ttf")
  });
  return (
    <SafeAreaView className="flex-1 bg-slate-200" edges={['top']}>

      <View className="flex-row items-center justify-between bg-white px-2 py-2">
        <View className="flex-row items-center ml-2">
          <Bell size={28} color="#666" />
        </View>

        <Settings size={28} color="#666" />
      </View>


    </SafeAreaView>
  );
}
