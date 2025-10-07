import Colors from "@/src/constants/colors";
import { Image, StyleSheet, Text, View } from "react-native";

export default function TopBarNoSearch() {
  return (
    <View style={styles.topBar}>
      <View style={styles.topBarLeft}>
        <Image
          source={require("@/assets/images/app_icon.png")}
          style={styles.appIcon}
          resizeMode="contain"
        />
        <Text style={styles.textIcon}>ISU</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  appIcon: {
    width: 32,
    height: 32,
  },
  textIcon: {
    color: "black",
    fontFamily: "inter",
    fontSize: 24,
    marginLeft: 5,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.white,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  topBarLeft: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 8,
  },
});
