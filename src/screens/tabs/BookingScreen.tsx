import TopBarNoSearch from "@/src/components/TopBarNoSearch";
import Colors from "@/src/constants/colors";
import { StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function BookingScreen() {
  return (
    <SafeAreaView style={styles.safeAreaView}>

      <TopBarNoSearch/>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
