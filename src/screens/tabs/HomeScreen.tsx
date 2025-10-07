import TopBar from "@/src/components/TopBar";
import Colors from "@/src/constants/colors";
import { StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.safeAreaView}>

      <TopBar placeholder="Tìm kiếm dịch vụ, nhà tiên tri"/>


    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  appIcon: {
    width: 32,
    height: 32
  },
  textIcon: { 
    color: "black", 
    fontFamily: "inter", 
    fontSize: 24, 
    marginLeft: 5, 
  },
    safeAreaView: {
        flex: 1,
        backgroundColor: Colors.grayBackground
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