import Colors from "@/src/constants/colors";
import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Calendar, Clock, Laugh } from "lucide-react-native";
import { ScrollView, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

export default function NotificationScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <MaterialIcons name="arrow-back" size={28} color="black" onPress={() => router.back()} />
        <View style={styles.titleContainer}>
          <Text variant="titleLarge" style={styles.title}>Thông báo</Text>
        </View>
        <View style={{ width: 28 }} />
      </View>
      <ScrollView
        style={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>

        <SampleNotif />
        <SampleNotif />
        <SampleNotif />
        <SampleNotif />
        <SampleNotif />
        <SampleNotif />
        <SampleNotif />
        <SampleNotif />
        <SampleNotif />
        <SampleNotif />

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.grayBackground
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    backgroundColor: Colors.background
  },
  titleContainer: {
    flex: 1,
    alignItems: "center",
  },
  title: {
    fontWeight: "bold",
  },
  content: {
    flex: 1,
    padding: 10,
  },
  avatarContainer: {
    alignItems: "center",
    marginVertical: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#e6f2ff",
    justifyContent: "center",
    alignItems: "center",
  },
  sectionTitle: {
    fontWeight: "bold",
    textAlign: "center",
    marginTop: 8,
  },
  sectionSubtitle: {
    textAlign: "center",
    color: Colors.gray,
    marginBottom: 24,
  },
  input: {
    marginBottom: 16,
  },
  footer: {
    flexDirection: "row",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  backButton: {
    flex: 1,
    marginRight: 8,
    borderColor: Colors.primary,
    borderRadius: 10,
  },
  nextButton: {
    flex: 1,
    marginLeft: 8,
    backgroundColor: Colors.primary,
    borderRadius: 10,
  },
  timeText: {
    fontSize: 11,
    fontFamily: "inter",
    color: Colors.gray,
    marginLeft: 5
  }
});

function SampleNotif() {
  return (
    <View style={{ flex: 1, flexDirection: "row", alignItems: "center", backgroundColor: Colors.background, padding: 10, marginBottom: 10, borderRadius: 10 }}>
      <Laugh size={50} color={Colors.black} />
      <View style={{ width: "80%", marginLeft: 10 }}>
        <Text style={{ fontWeight: "bold" }}>Đăng ký gói thành công</Text>
        <Text style={{ fontFamily: "inter", fontSize: 13 }}>Bạn đã đăng ký gói “Xem bói tổng quát cuộc đời 2024” của thầy bói Thầy Ông Nội.</Text>
        <View style={{ flexDirection: "row", marginTop: 5 }}>
          <View style={{ flexDirection: "row" }}>
            <Calendar size={15} color={Colors.gray} />
            <Text style={styles.timeText}>15/04/2025</Text>
          </View>
          <View style={{ width: 28 }} />
          <View style={{ flexDirection: "row" }}>
            <Clock size={15} color={Colors.gray} />
            <Text style={styles.timeText}>15:30</Text>
          </View>
        </View>
      </View>
    </View>
  );
}