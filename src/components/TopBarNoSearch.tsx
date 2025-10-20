import Colors from "@/src/constants/colors";
import { LinearGradient } from "expo-linear-gradient";
import { Image, StyleSheet, Text, View } from "react-native";

export default function TopBarNoSearch() {
  return (
    <View style={styles.topBarOuter}>
      <LinearGradient
        colors={[Colors.primary, "#7c3aed"]}
        start={[0, 0]}
        end={[1, 1]}
        style={styles.bar}
      >
        <View style={styles.topBarLeftInner}>
          <View style={styles.appIconWrapper}>
            <Image
              source={require("@/assets/images/app_icon.png")}
              style={styles.appIcon}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.textIcon}>ISU</Text>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  appIcon: {
    width: 32,
    height: 32,
  },
  textIcon: {
    color: Colors.white,
    fontFamily: "inter",
    fontSize: 22,
    marginLeft: 10,
    fontWeight: "700",
  },
  topBarOuter: {
    backgroundColor: 'transparent',
  },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    backgroundColor: '#3b82f6',
    paddingHorizontal: 14,
    paddingVertical: 10,
    // subtle shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  topBarLeftInner: {
    flexDirection: "row",
    alignItems: "center",
  },
  appIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
