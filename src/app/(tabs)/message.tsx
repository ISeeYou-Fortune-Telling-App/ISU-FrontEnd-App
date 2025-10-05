import Colors from "@/src/constants/colors";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function MessageScreen() {
  return (
    <SafeAreaView style={styles.safeAreaView}>

      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          {/* <Image
            source={require("../../assets/images/app_icon.png")}
            className="w-10 h-10"
            resizeMode="contain"
          /> */}
          <Text style={{ color: "black", fontFamily: "inter", fontSize: 24, marginLeft: 5, }}>ISU</Text>
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