import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { Button, Menu, Text, TextInput } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import Colors from "../constants/colors";

export default function SeerRegistrationScreen() {
  const [fullName, setFullName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [dob, setDob] = useState<string>("");
  const [gender, setGender] = useState<string>("Nam");
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [securePassword, setSecurePassword] = useState<boolean>(true);
  const [secureConfirmPassword, setSecureConfirmPassword] = useState<boolean>(true);
  const [menuVisible, setMenuVisible] = useState<boolean>(false);
  
  const openMenu = () => setMenuVisible(true);
  const closeMenu = () => setMenuVisible(false);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <MaterialIcons name="arrow-back" size={24} color="black" onPress={() => router.back()} />
        <View style={styles.titleContainer}>
          <Text variant="titleMedium" style={styles.title}>Đăng ký Nhà tiên tri</Text>
          <Text variant="bodySmall" style={styles.subtitle}>Bước 1/3</Text>
        </View>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 20}
      >
        <ScrollView 
          style={styles.content} 
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 50 }}
          showsVerticalScrollIndicator={false}
        >
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <MaterialIcons name="person-outline" size={40} color={Colors.primary} />
          </View>
        </View>

        <Text variant="headlineSmall" style={styles.sectionTitle}>Thông tin cá nhân</Text>
        <Text variant="bodyMedium" style={styles.sectionSubtitle}>Hãy cho chúng tôi biết về bạn</Text>

        <TextInput
          label="Họ và tên"
          mode="outlined"
          style={styles.input}
          placeholder="Nhập họ và tên"
          value={fullName}
          onChangeText={setFullName}
          left={<TextInput.Icon icon="account" />}
        />

        <TextInput
          label="Email"
          mode="outlined"
          style={styles.input}
          placeholder="Nhập email của bạn"
          value={email}
          onChangeText={setEmail}
          left={<TextInput.Icon icon="email" />}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <TextInput
          label="Số điện thoại"
          mode="outlined"
          style={styles.input}
          placeholder="Nhập số điện thoại của bạn"
          value={phone}
          onChangeText={setPhone}
          left={<TextInput.Icon icon="phone" />}
          keyboardType="phone-pad"
        />

        <TextInput
          label="Ngày sinh"
          mode="outlined"
          style={styles.input}
          placeholder="Nhập ngày sinh của bạn"
          value={dob}
          onChangeText={setDob}
          left={<TextInput.Icon icon="calendar" />}
        />

        <Menu
          visible={menuVisible}
          onDismiss={closeMenu}
          anchor={
            <TextInput
              label="Giới tính"
              mode="outlined"
              style={styles.input}
              value={gender}
              left={<TextInput.Icon icon="gender-male-female" />}
              right={<TextInput.Icon icon="chevron-down" onPress={openMenu} />}
              onTouchStart={openMenu}
              editable={false}
            />
          }
        >
          <Menu.Item onPress={() => { setGender("Nam"); closeMenu(); }} title="Nam" />
          <Menu.Item onPress={() => { setGender("Nữ"); closeMenu(); }} title="Nữ" />
          <Menu.Item onPress={() => { setGender("Khác"); closeMenu(); }} title="Khác" />
        </Menu>

        <TextInput
          label="Mật khẩu"
          mode="outlined"
          style={styles.input}
          placeholder="Tạo mật khẩu"
          value={password}
          onChangeText={setPassword}
          left={<TextInput.Icon icon="lock" />}
          right={
            <TextInput.Icon 
              icon={securePassword ? "eye-off" : "eye"} 
              onPress={() => setSecurePassword(!securePassword)}
            />
          }
          secureTextEntry={securePassword}
        />

        <TextInput
          label="Xác nhận mật khẩu"
          mode="outlined"
          style={styles.input}
          placeholder="Nhập lại mật khẩu"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          left={<TextInput.Icon icon="lock" />}
          right={
            <TextInput.Icon 
              icon={secureConfirmPassword ? "eye-off" : "eye"} 
              onPress={() => setSecureConfirmPassword(!secureConfirmPassword)}
            />
          }
          secureTextEntry={secureConfirmPassword}
        />
      </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.footer}>
        <Button
          mode="outlined"
          style={styles.backButton}
          onPress={() => router.back()}
        >
          Quay lại
        </Button>
        <Button
          mode="contained"
          style={styles.nextButton}
          onPress={() => router.push("/seer-registration-step2" as any)}
        >
          Tiếp tục
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff"
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  titleContainer: {
    flex: 1,
    alignItems: "center",
  },
  title: {
    fontWeight: "bold",
  },
  subtitle: {
    color: Colors.gray,
  },
  content: {
    flex: 1,
    padding: 16,
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
  genderMenu: {
    width: '90%',
  },
  genderContainer: {
    position: 'relative',
    width: '100%',
  },
});