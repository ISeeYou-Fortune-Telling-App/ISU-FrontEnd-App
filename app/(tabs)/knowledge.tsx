import { useFonts } from "expo-font";
import { Search } from "lucide-react-native";
import { Image, Text, View } from "react-native";
import { TextInput } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

export default function KnowledgeScreen() {
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

        {/* Search bar */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: "#f2f3f5",
            borderRadius: 20,
            paddingHorizontal: 10,
            width: 280,
          }}>
          <Search size={18} color="#666" />
          <TextInput
            placeholder="Tìm kiếm bài viết..."
            mode="flat"
            style={{
              backgroundColor: "#f2f3f5",
              height: 30,
              fontSize: 15,
              color: "#000",

            }} />
        </View>
      </View>


    </SafeAreaView>
  );
}
