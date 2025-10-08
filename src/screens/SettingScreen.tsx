import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from "react-native-safe-area-context";
import Colors from '../constants/colors';


export default function SettingScreen() {
    return(
      <SafeAreaView style={styles.container}>
          <View style={styles.header}>
            <MaterialIcons name="arrow-back" size={28} color="black" onPress={() => router.back()} />
            <View style={styles.titleContainer}>
              <Text variant="titleLarge" style={styles.title}>Setting</Text>
            </View>
            <View style={{ width: 28 }} />
          </View>

          <ScrollView
            style={styles.content} 
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
              <View style={styles.card}>
                <Text style={{fontSize: 20, fontFamily: "inter"}}>Thay đổi thông tin cá nhân</Text>
                <Text style={{fontSize: 14, fontFamily:"segoeui"}}>Tên, ngày sinh, ảnh đại diện, v.v</Text>
              </View>
              <View style={styles.card}>
                <Text style={{fontSize: 18, fontFamily: "inter"}}>Thay mật khẩu</Text>
              </View>
              <View style={styles.card}>
                <Text style={{fontSize: 18, fontFamily: "inter"}}>Xoá tài khoản</Text>
              </View>
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
  },
  card: {
    flex: 1, 
    backgroundColor: Colors.white, 
    padding: 10, 
    borderBottomWidth: 1, 
    borderBottomColor: Colors.borderGray,
    height: 70
  }
})