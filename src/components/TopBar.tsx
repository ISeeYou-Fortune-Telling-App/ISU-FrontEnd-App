import Colors from "@/src/constants/colors";
import { Search } from "lucide-react-native";
import { useState } from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { TextInput } from "react-native-paper";

type TopBarProps = {
  placeholder?: string;
  showSearchIcon?: boolean;
  onSearchPress?: () => void;
};

export default function TopBar({ placeholder = "Tìm kiếm...", showSearchIcon = false, onSearchPress }: TopBarProps) {
  const [isFocused, setIsFocused] = useState(false);
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

      {showSearchIcon ? (
        <TouchableOpacity onPress={onSearchPress} style={styles.iconButton} accessibilityRole="button">
          <Search size={22} color={Colors.primary} />
        </TouchableOpacity>
      ) : (
        <View style={styles.searchBar}>
          <Search size={22} color={isFocused ? Colors.primary : "#666"} />
          <TextInput
            placeholder={placeholder}
            placeholderTextColor="#666"
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            mode="flat"
            style={styles.textInput}
          />
        </View>
      )}
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
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.background,
    borderRadius: 20,
    paddingHorizontal: 10,
    width: 280,
    borderWidth: 2,
    borderColor: Colors.primary
  },
  iconButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  textInput: {
    backgroundColor: Colors.background,
    height: 30,
    fontSize: 15,
    color: Colors.black,
    flex: 1,
    marginLeft: 6,
  },
});
