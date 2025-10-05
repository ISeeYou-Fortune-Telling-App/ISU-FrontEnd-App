import Colors from "@/src/constants/colors";
import { Search } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";
import { TextInput } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

export default function KnowledgeScreen() {
  return (
    <SafeAreaView style={styles.safeAreaView}>

      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          {/* <Image
            source={require("../../../assets/images/app_icon.png")}
            className="w-10 h-10"
            resizeMode="contain"
          /> */}
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

const styles = StyleSheet.create({
    safeAreaView: {
        flex: 1,
        backgroundColor: "#e2e8f0"
    },
    topBar: {
        flexDirection: "row", 
        alignItems: "center", 
        justifyContent: "space-between", 
        backgroundColor: Colors.white, 
        paddingHorizontal: 8, 
        paddingVertical: 8 
    },
    topBarLeft: {
        flexDirection: "row", 
        alignItems: "center", 
        marginLeft: 8 
    }
})
