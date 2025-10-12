import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { Button, Checkbox, Text, TextInput } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import Colors from "../constants/colors";
import { deleteAccount } from "../services/api";

type RoleKey = "CUSTOMER" | "SEER";

type RoleCopy = {
  title: string;
  description: string;
  bullets: string[];
};

const ROLE_COPY: Record<RoleKey, RoleCopy> = {
  CUSTOMER: {
    title: "Xoá tài khoản khách hàng",
    description:
      "Việc xoá tài khoản là hành động vĩnh viễn. Sau khi hoàn tất, toàn bộ thông tin cá nhân và lịch sử gắn với hồ sơ của bạn sẽ bị xoá khỏi hệ thống.",
    bullets: [
      "Lịch sử đặt lịch và các phiên tư vấn đã lưu sẽ bị xoá.",
      "Tất cả tin nhắn với các Nhà tiên tri sẽ bị xoá vĩnh viễn.",
      "Mọi phiên đang diễn ra hoặc đã lên lịch sẽ tự động huỷ.",
    ],
  },
  SEER: {
    title: "Xoá tài khoản Nhà tiên tri",
    description:
      "Việc xoá tài khoản là hành động vĩnh viễn và sẽ gỡ bỏ toàn bộ thông tin đã công khai trên nền tảng.",
    bullets: [
      "Các buổi tư vấn sắp tới với khách hàng sẽ bị huỷ và hoàn tiền khi áp dụng.",
      "Chứng chỉ và hồ sơ công khai sẽ không còn hiển thị với khách hàng.",
      "Báo cáo doanh thu và lịch sử thanh toán sẽ được xoá khỏi hệ thống.",
    ],
  },
};

export default function DeleteAccountScreen() {
  const router = useRouter();
  const [role, setRole] = useState<RoleKey>("CUSTOMER");
  const [acknowledged, setAcknowledged] = useState<boolean>(false);
  const [reason, setReason] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const scrollViewRef = useRef<ScrollView | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadRole = async () => {
      try {
        const storedRole = await SecureStore.getItemAsync("userRole");
        if (storedRole && isMounted) {
          const normalizedRole = storedRole.toUpperCase() === "SEER" ? "SEER" : "CUSTOMER";
          setRole(normalizedRole);
        }
      } catch (err) {
        console.error(err);
      }
    };

    loadRole();

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
      await deleteAccount(trimmedReason);

      await Promise.all([
        SecureStore.deleteItemAsync("authToken"),
        SecureStore.deleteItemAsync("refreshToken"),
        SecureStore.deleteItemAsync("userRole"),
        SecureStore.deleteItemAsync("userId"),
      ]);

      setAcknowledged(false);
      setReason("");

      Alert.alert("Đã xoá tài khoản", "Tài khoản của bạn đã được xoá thành công.", [
        {
          text: "Đồng ý",
          onPress: () => {
            router.dismissAll();
            router.replace("/auth")
          },
        },
      ]);
    } catch (err: any) {
      console.error(err);
      const message = err?.response?.data?.message ?? "Không thể hoàn tất xoá tài khoản. Vui lòng thử lại.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePress = () => {
    Alert.alert(
      "Xoá tài khoản",
      "Hành động này không thể hoàn tác. Bạn có chắc chắn muốn tiếp tục?",
      [
        { text: "Huỷ", style: "cancel" },
        { text: "Xoá", style: "destructive", onPress: handleConfirmDeletion },
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
          <MaterialIcons
            name="arrow-back"
            size={24}
            color={Colors.black}
            onPress={() => router.back()}
          />
          <Text variant="titleMedium" style={styles.headerTitle}>
            Xoá tài khoản
          </Text>
          <View style={styles.headerPlaceholder} />
        </View>

        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.heroCard}>
            <View style={styles.heroIcon}>
              <MaterialIcons name="warning-amber" size={28} color="#f97316" />
            </View>
            <Text style={styles.heroTitle}>{copy.title}</Text>
            <Text style={styles.heroSubtitle}>{copy.description}</Text>
          </View>

          <View style={styles.bulletSection}>
            {copy.bullets.map((item) => (
              <View key={item} style={styles.bulletRow}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>{item}</Text>
              </View>
            ))}
          </View>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>Lý do xoá tài khoản</Text>
          <Text style={styles.sectionSubtitle}>
            Chia sẻ giúp chúng tôi cải thiện trải nghiệm của bạn (không bắt buộc).
          </Text>

          <TextInput
            label="Lý do xoá tài khoản"
            mode="outlined"
            multiline
            numberOfLines={5}
            value={reason}
            onChangeText={setReason}
            onFocus={handleReasonFocus}
            placeholder="Ví dụ: Tôi muốn thay đổi số điện thoại, ứng dụng thiếu tính năng..."
            style={styles.textInput}
          />

          <View style={styles.acknowledgeRow}>
            <Checkbox
              status={acknowledged ? "checked" : "unchecked"}
              onPress={() => setAcknowledged((prev) => !prev)}
            />
            <Text style={styles.acknowledgeText}>
              Tôi hiểu rằng hành động này là vĩnh viễn và không thể hoàn tác.
            </Text>
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Button
            mode="contained"
            onPress={handleDeletePress}
            disabled={!acknowledged || isSubmitting}
            loading={isSubmitting}
            style={styles.deleteButton}
            contentStyle={{ paddingVertical: 6 }}
          >
            Xoá tài khoản
          </Button>

          <Button
            mode="text"
            onPress={() => router.back()}
            disabled={isSubmitting}
            style={styles.cancelButton}
          >
            Quay lại
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
  headerTitle: {
    fontWeight: "600",
    color: Colors.black,
  },
  headerPlaceholder: {
    width: 24,
    height: 24,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  heroCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 18,
    marginTop: 20,
    marginBottom: 16,
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
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.black,
    marginBottom: 8,
  },
  heroSubtitle: {
    color: Colors.gray,
    lineHeight: 20,
  },
  bulletSection: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  bulletDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    marginTop: 7,
    marginRight: 12,
  },
  bulletText: {
    flex: 1,
    color: Colors.black,
    lineHeight: 20,
  },
  divider: {
    height: 1,
    backgroundColor: "#e5e7eb",
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.black,
  },
  sectionSubtitle: {
    color: Colors.gray,
    marginBottom: 12,
  },
  textInput: {
    marginBottom: 16,
  },
  acknowledgeRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  acknowledgeText: {
    flex: 1,
    color: Colors.black,
    marginTop: 6,
  },
  errorText: {
    color: Colors.error,
    marginBottom: 12,
  },
  deleteButton: {
    backgroundColor: "#ef4444",
    borderRadius: 10,
  },
  cancelButton: {
    marginTop: 8,
  },
});
