import Colors from "@/src/constants/colors";
import { deleteNotification, getMyNotifications, markNotificationAsRead } from "@/src/services/apiNoti";
import { router } from "expo-router";
import { ArrowLeft, Calendar, Clock, EllipsisVertical, Trash } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Image, StyleSheet, TouchableOpacity, View } from "react-native";
import { Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

export default function NotificationScreen() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const limit = 15;

  const fetchNotifs = useCallback(async (pageNum = 1, append = false) => {
    try {
      if (append) setLoadingMore(true);
      else setLoading(true);

      const params = {
        page: pageNum,
        limit,
        sortType: "desc",
        sortBy: "createdAt",
      };

      const res = await getMyNotifications(params);
      const newData = res?.data?.data || [];

      if (append) {
        setNotifications((prev) => [...prev, ...newData]);
      } else {
        setNotifications(newData);
      }

      setHasMore(newData.length === limit);
    } catch (err) {
      console.log(err);
      Alert.alert("Lỗi", "Không thể tải thông báo. Hãy thử lại sau.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifs();
  }, [fetchNotifs]);

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchNotifs(nextPage, true);
    }
  };

  const markNotifAsRead = async (id: string) => {
    try {
      await markNotificationAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    } catch (err) {
      Alert.alert("Lỗi", "Không thể đánh dấu đã đọc.");
    }
  };

  const deleteNotif = async (id: string) => {
    try {
      await deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      Alert.alert("Lỗi", "Không thể xóa thông báo.");
    }
  };

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={{ paddingVertical: 15 }}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  };

  if (loading && notifications.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
        <View style={styles.header}>
          <ArrowLeft size={28} color="black" onPress={() => router.back()} />
          <View style={styles.titleContainer}>
            <Text variant="titleLarge" style={styles.title}>Thông báo</Text>
          </View>
          <EllipsisVertical size={28} color="black" />
        </View>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <ArrowLeft size={28} color="black" onPress={() => router.back()} />
        <View style={styles.titleContainer}>
          <Text variant="titleLarge" style={styles.title}>Thông báo</Text>
        </View>
        <EllipsisVertical size={28} color="black" />
      </View>

      {notifications.length > 0 ? (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <NotificationItem
              notif={item}
              markNotifAsRead={markNotifAsRead}
              deleteNotif={deleteNotif}
              setNotifications={setNotifications}
            />
          )}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.2}
          ListFooterComponent={renderFooter}
          contentContainerStyle={{ padding: 10 }}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <Text>Chưa có thông báo nào</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

function NotificationItem({ notif, markNotifAsRead, deleteNotif, setNotifications }: { notif: any; markNotifAsRead: (id: string) => Promise<void>; deleteNotif: (id: string) => Promise<void>; setNotifications: React.Dispatch<React.SetStateAction<any[]>> }) {
  const [avatarError, setAvatarError] = useState(false);

  const handlePress = async () => {
    if (!notif.read) {
      await markNotifAsRead(notif.id);
      setNotifications((prev) => prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n)));
    }
  };

  const handleDeleteNotif = () => {
    Alert.alert("Xóa thông báo", "Bạn có chắc muốn xóa thông báo này?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteNotif(notif.id);
          } catch (err) {
            Alert.alert("Lỗi", "Không thể xóa thông báo.");
          }
        },
      },
    ]);
  };

  const createdDate = new Date(notif.createdAt);
  const dateStr = createdDate.toLocaleDateString("vi-VN");
  const timeStr = createdDate.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={{
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: Colors.background,
        padding: 10,
        marginBottom: 10,
        borderRadius: 10,
      }}
    >
      <Image
        source={
          avatarError || !notif.imageUrl || notif.imageUrl == "string"
            ? require("@/assets/images/user-placeholder.png")
            : { uri: notif.imageUrl }
        }
        style={{
          width: 55,
          height: 55,
          borderRadius: 50,
          borderWidth: 1,
          borderColor: Colors.grayBackground,
        }}
        resizeMode="cover"
        onError={() => setAvatarError(true)}
      />
      <View style={{ width: "75%", marginLeft: 10 }}>
        <Text style={{ fontWeight: notif.read ? "normal" : "bold" }}>{notif.notificationTitle}</Text>
        <Text style={{ fontFamily: "inter", fontSize: 13 }}>{notif.notificationBody}</Text>
        <View style={{ flexDirection: "row", marginTop: 5 }}>
          <View style={{ flexDirection: "row" }}>
            <Calendar size={15} color={Colors.gray} />
            <Text style={styles.timeText}>{dateStr}</Text>
          </View>
          <View style={{ width: 28 }} />
          <View style={{ flexDirection: "row" }}>
            <Clock size={15} color={Colors.gray} />
            <Text style={styles.timeText}>{timeStr}</Text>
          </View>
        </View>
      </View>
      {!notif.read && (
        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: "blue", position: "absolute", top: 10, right: 10 }} />
      )}
      <Trash size={28} color={Colors.error} onPress={handleDeleteNotif} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.grayBackground,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    backgroundColor: Colors.background,
  },
  titleContainer: {
    flex: 1,
    alignItems: "center",
  },
  title: {
    fontWeight: "bold",
  },
  timeText: {
    fontSize: 11,
    fontFamily: "inter",
    color: Colors.gray,
    marginLeft: 5,
  },
});
