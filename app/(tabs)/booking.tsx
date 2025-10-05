import { useFonts } from "expo-font";
import { Image, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function BookingScreen() {
  const [fontsLoaded] = useFonts({
    "inter": require("../../assets/fonts/Inter-VariableFont.ttf")
  });
  return (
    <SafeAreaView className="flex-1 bg-slate-200" edges={['top']}>

      <View className="flex-row items-center justify-between bg-white px-2 py-2">
        <View className="flex-row items-center ml-2">
          <Image
            source={require("../../assets/images/app_icon.png")}
            className="w-10 h-10"
            resizeMode="contain"
          />
          <Text style={{ color: "black", fontFamily: "inter", fontSize: 24, marginLeft: 5, }}>ISU</Text>
        </View>
      </View>

    </SafeAreaView>
  );
}
