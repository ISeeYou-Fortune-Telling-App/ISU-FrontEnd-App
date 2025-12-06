import Colors from "@/src/constants/colors";
import { LinearGradient } from "expo-linear-gradient";
import { Search } from "lucide-react-native";
import { useState } from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { TextInput } from "react-native-paper";

type TopBarProps = {
  placeholder?: string;
  showSearchIcon?: boolean;
  onSearchPress?: () => void;
  isSearchButton?: boolean;
};

export default function TopBar({ placeholder = "Tìm kiếm...", showSearchIcon = false, onSearchPress, isSearchButton = false }: TopBarProps) {
  const [isFocused, setIsFocused] = useState(false);
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

        {showSearchIcon ? (
          <TouchableOpacity onPress={onSearchPress} style={styles.iconButton} accessibilityRole="button">
            <Search size={22} color={Colors.white} />
          </TouchableOpacity>
        ) : isSearchButton ? (
          <TouchableOpacity onPress={onSearchPress} style={[styles.searchBar, { justifyContent: 'flex-start' }]}>
            <Search size={18} color={"rgba(255,255,255,0.8)"} />
            <Text style={styles.searchBarText}>{placeholder}</Text>
          </TouchableOpacity>
        ) : (
          <View style={[styles.searchBar, isFocused ? styles.searchBarFocused : null]}>
            <Search size={18} color={isFocused ? Colors.white : "rgba(255,255,255,0.8)"} />
            <TextInput
            textColor={Colors.white}
              placeholder={placeholder}
              placeholderTextColor={"rgba(255,255,255,0.8)"}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              mode="flat"
              style={styles.textInput}
            />
          </View>
        )}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  appIcon: {
    width: 32,
    height: 32,
    borderRadius: 50
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
    justifyContent: "space-between",
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
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 22,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flex: 1,
    marginLeft: 16,
    height: 44,
  },
  searchBarFocused: {
    backgroundColor: "rgba(255,255,255,0.3)",
  },
  searchBarText: {
    color: "rgba(255,255,255,0.8)",
    marginLeft: 8,
    fontSize: 15,
  },
  textInput: {
    flex: 1,
    color: Colors.white,
    backgroundColor: "transparent",
    fontSize: 15,
    height: 28,
    padding: 0,
    margin: 0,
    marginLeft: 8,
    borderBottomWidth: 0,
    underlineColorAndroid: "transparent",
    activeUnderlineColor: "transparent",
    underlineColor: "transparent",
  },
  iconButton: {
    padding: 8,
  },
});
