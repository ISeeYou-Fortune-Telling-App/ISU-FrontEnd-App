import Colors from "@/src/constants/colors";
import { deleteAccount } from "@/src/services/api";
import { logoutCometChatUser } from "@/src/services/cometchat";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { Button, Checkbox, Text, TextInput } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

type RoleKey = "CUSTOMER" | "SEER";

type RoleCopy = {
  title: string;
  description: string;
  bullets: string[];
};

const ROLE_COPY: Record<RoleKey, RoleCopy> = {
  CUSTOMER: {
    title: "Xóa tài khoản khách hàng",
    description:
      "Việc xóa tài khoản là hành động vĩnh viễn. Sau khi hoàn tất, toàn bộ thông tin cá nhân và lịch sử gắn với hồ sơ của bạn sẽ bị gỡ khỏi hệ thống.",
    bullets: [
      "Lịch sử đặt lịch và các phiên tư vấn đã lưu sẽ bị xóa.",
      "Tất cả tin nhắn trao đổi với Nhà tiên tri sẽ được gỡ bỏ.",
      "Mọi phiên đang diễn ra hoặc đã lên lịch sẽ tự động huỷ.",
    ],
  },
  SEER: {
    title: "Xóa tài khoản Nhà tiên tri",
    description:
      "Khi xóa tài khoản, toàn bộ thông tin và nội dung bạn đã công khai sẽ bị xóa khỏi nền tảng.",
    bullets: [
      "Các buổi tư vấn sắp tới với khách hàng sẽ bị huỷ và hoàn tiền nếu áp dụng.",
      "Hồ sơ, chứng chỉ và nội dung giới thiệu sẽ không còn hiển thị với khách hàng.",
      "Báo cáo doanh thu và lịch sử thanh toán sẽ bị xóa khỏi hệ thống.",
    ],
  },
};

export default function DeleteAccountScreen() {
  const router = useRouter();
  const scrollViewRef = useRef<ScrollView | null>(null);

  const [role, setRole] = useState<RoleKey>("CUSTOMER");
  const [userId, setUserId] = useState<string | null>(null);
  const [acknowledged, setAcknowledged] = useState<boolean>(false);
  const [reason, setReason] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadUserInfo = async () => {
      try {
        const storedRole = await SecureStore.getItemAsync("userRole");
        const storedUserId = await SecureStore.getItemAsync("userId");

        if (isMounted) {
          if (storedRole) {
            const normalizedRole: RoleKey = storedRole.toUpperCase() === "SEER" ? "SEER" : "CUSTOMER";
            setRole(normalizedRole);
          }
          setUserId(storedUserId ?? null);
        }
      } catch (err) {
        console.error(err);
      }
    };

    loadUserInfo();

    return () => {
      isMounted = false;
    };
  }, []);

  const copy = useMemo(() => ROLE_COPY[role] ?? ROLE_COPY.CUSTOMER, [role]);

  const handleReasonFocus = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 150);
  };

  const handleConfirmDeletion = async () => {
    if (isSubmitting) {
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const trimmedReason = reason.trim();
      const currentUserId = userId ?? (await SecureStore.getItemAsync("userId"));

      if (!currentUserId) {
        setError("Không thể xác định tài khoản của bạn. Vui lòng đăng nhập lại.");
        return;
      }

      await deleteAccount(currentUserId, trimmedReason);
      await logoutCometChatUser();

      await Promise.all([
        SecureStore.deleteItemAsync("authToken"),
        SecureStore.deleteItemAsync("refreshToken"),
        SecureStore.deleteItemAsync("userRole"),
        SecureStore.deleteItemAsync("userId"),
        SecureStore.deleteItemAsync("cometChatUid"),
      ]);

      setAcknowledged(false);
      setReason("");
      setUserId(null);

      Alert.alert("Đã xóa tài khoản", "Tài khoản của bạn đã được xóa thành công.", [
        {
          text: "Đồng ý",
          onPress: () => {
            router.dismissAll();
            router.replace("/auth");
          },
        },
      ]);
    } catch (err: any) {
      console.error(err);
      const message =
        err?.response?.data?.message ?? "Không thể hoàn tất xóa tài khoản. Vui lòng thử lại.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePress = () => {
    Alert.alert(
      "Xóa tài khoản",
      "Hành động này không thể hoàn tác. Bạn có chắc chắn muốn tiếp tục?",
      [
        { text: "Huỷ", style: "cancel" },
        { text: "Xóa", style: "destructive", onPress: handleConfirmDeletion },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 24}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
            <MaterialIcons name="arrow-back" size={22} color={Colors.black} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Xóa tài khoản</Text>
          <View style={styles.headerPlaceholder} />
        </View>

        <ScrollView ref={scrollViewRef} contentContainerStyle={styles.content}>
          <View style={styles.heroCard}>
            <View style={styles.heroIcon}>
              <MaterialIcons name="warning-amber" size={22} color="#b45309" />
            </View>
            <Text style={styles.heroTitle}>{copy.title}</Text>
            <Text style={styles.heroSubtitle}>{copy.description}</Text>
          </View>

          <View style={styles.bulletSection}>
            {copy.bullets.map((item, index) => (
              <View key={index} style={styles.bulletRow}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>{item}</Text>
              </View>
            ))}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldTitle}>Lý do xóa tài khoản (không bắt buộc)</Text>
            <Text style={styles.fieldSubtitle}>
              Chúng tôi sẽ dùng thông tin này để cải thiện trải nghiệm người dùng trong tương lai.
            </Text>
            <TextInput
              mode="outlined"
              value={reason}
              onChangeText={setReason}
              multiline
              numberOfLines={4}
              style={styles.textInput}
              placeholder="Nhập lý do của bạn (nếu có)..."
              onFocus={handleReasonFocus}
            />
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <View style={styles.acknowledgeRow}>
            <Checkbox
              status={acknowledged ? "checked" : "unchecked"}
              onPress={() => setAcknowledged((prev) => !prev)}
            />
            <Text style={styles.acknowledgeText}>
              Tôi hiểu rằng việc xóa tài khoản là vĩnh viễn và không thể khôi phục. Mọi dữ liệu gắn
              với tài khoản cũng sẽ bị xóa.
            </Text>
          </View>

          <Button
            mode="contained"
            style={styles.deleteButton}
            onPress={handleDeletePress}
            loading={isSubmitting}
            disabled={!acknowledged || isSubmitting}
          >
            Xóa tài khoản
          </Button>
          <Button
            mode="outlined"
            style={styles.cancelButton}
            onPress={() => router.back()}
            disabled={isSubmitting}
          >
            Giữ lại tài khoản
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.grayBackground,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#d4d4d8",
  },
  headerButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.black,
  },
  headerPlaceholder: {
    width: 24,
    height: 24,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    gap: 20,
  },
  heroCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 18,
    gap: 12,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  heroIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#fef3c7",
    alignItems: "center",
    justifyContent: "center",
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.black,
  },
  heroSubtitle: {
    color: Colors.gray,
    lineHeight: 20,
  },
  bulletSection: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    gap: 12,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  bulletDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    marginTop: 6,
  },
  bulletText: {
    flex: 1,
    color: Colors.black,
    lineHeight: 20,
  },
  fieldGroup: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 18,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    gap: 10,
  },
  fieldTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.black,
  },
  fieldSubtitle: {
    color: Colors.gray,
    lineHeight: 20,
  },
  textInput: {
    backgroundColor: Colors.white,
  },
  acknowledgeRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  acknowledgeText: {
    flex: 1,
    color: Colors.black,
    lineHeight: 20,
  },
  errorText: {
    color: Colors.error,
    marginBottom: 12,
  },
  deleteButton: {
    marginTop: 12,
    backgroundColor: "#ef4444",
    borderRadius: 10,
  },
  cancelButton: {
    marginTop: 12,
    borderRadius: 10,
  },
});
