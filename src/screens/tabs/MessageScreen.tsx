import TopBarNoSearch from "@/src/components/TopBarNoSearch";
import Colors from "@/src/constants/colors";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Conversation = {
  id: string;
  name: string;
  preview: string;
  timestamp: string;
  unreadCount?: number;
};

const CONVERSATIONS: Conversation[] = [
  {
    id: "1",
    name: "I See You Admin",
    preview: "Chào mừng bạn đến với I See You, nơi...",
    timestamp: "13:10",
    unreadCount: 1,
  },
  {
    id: "2",
    name: "I See You Chat Bot",
    preview: "Với thông tin của bạn, bạn thuộc cung...",
    timestamp: "10:40",
    unreadCount: 2,
  },
  {
    id: "3",
    name: "Thầy Minh Tuệ",
    preview: "Cảm ơn em đã chọn thầy, đánh giá tốt...",
    timestamp: "Hôm qua",
  },
  {
    id: "4",
    name: "Thầy Minh Tuệ",
    preview: "Cảm ơn em đã chọn thầy, đánh giá tốt...",
    timestamp: "Hôm qua",
  },
  {
    id: "5",
    name: "Thầy Minh Tuệ",
    preview: "Cảm ơn em đã chọn thầy, đánh giá tốt...",
    timestamp: "Hôm qua",
  },
  {
    id: "6",
    name: "Thầy Minh Tuệ",
    preview: "Cảm ơn em đã chọn thầy, đánh giá tốt...",
    timestamp: "Tuần trước",
  },
];

export default function MessageScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) {
      return CONVERSATIONS;
    }

    const lowerCaseQuery = searchQuery.toLowerCase();
    return CONVERSATIONS.filter(
      (conversation) =>
        conversation.name.toLowerCase().includes(lowerCaseQuery) ||
        conversation.preview.toLowerCase().includes(lowerCaseQuery),
    );
  }, [searchQuery]);

  const handleOpenConversation = (conversation: Conversation) => {
    router.push({
      pathname: "/chat-detail",
      params: { conversationId: conversation.id },
    });
  };

  return (
    <SafeAreaView style={styles.safeAreaView}>
      <TopBarNoSearch />

      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons name="chatbubble-ellipses-outline" size={28} color={Colors.primary} />
        </View>
        <Text style={styles.headerTitle}>Tin nhắn</Text>
        <Text style={styles.headerSubtitle}>Trò chuyện trực tiếp với các Seer</Text>
      </View>

      <View style={styles.searchWrapper}>
        <Ionicons name="search-outline" size={20} color={Colors.gray} />
        <TextInput
          placeholder="Tìm kiếm cuộc trò chuyện..."
          placeholderTextColor="#a0aec0"
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <FlatList
        data={filteredConversations}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.conversationCard}
            onPress={() => handleOpenConversation(item)}
          >
            <View style={styles.avatarPlaceholder} />
            <View style={styles.conversationInfo}>
              <Text style={styles.conversationName}>{item.name}</Text>
              <Text numberOfLines={1} style={styles.conversationPreview}>
                {item.preview}
              </Text>
            </View>
            <View style={styles.metaWrapper}>
              <Text style={styles.timestamp}>{item.timestamp}</Text>
              {typeof item.unreadCount === "number" && item.unreadCount > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadText}>{item.unreadCount}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeAreaView: {
    flex: 1,
    backgroundColor: Colors.grayBackground,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 12,
    alignItems: "center",
    backgroundColor: Colors.white,
  },
  headerIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: "inter",
    color: Colors.black,
  },
  headerSubtitle: {
    marginTop: 6,
    fontSize: 14,
    textAlign: "center",
    color: Colors.gray,
    fontFamily: "inter",
  },
  searchWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.white,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "inter",
    color: Colors.black,
  },
  listContent: {
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  conversationCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.white,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#d9dde3",
    marginRight: 16,
  },
  conversationInfo: {
    flex: 1,
  },
  conversationName: {
    fontSize: 16,
    fontFamily: "inter",
    color: Colors.black,
    marginBottom: 4,
  },
  conversationPreview: {
    fontSize: 13,
    color: Colors.gray,
    fontFamily: "inter",
  },
  metaWrapper: {
    alignItems: "flex-end",
    justifyContent: "space-between",
    height: 48,
    paddingVertical: 2,
  },
  timestamp: {
    fontSize: 12,
    color: Colors.gray,
    fontFamily: "inter",
  },
  unreadBadge: {
    marginTop: 6,
    minWidth: 24,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: "center",
  },
  unreadText: {
    fontSize: 12,
    fontFamily: "inter",
    color: Colors.white,
  },
  separator: {
    height: 12,
  },
});
