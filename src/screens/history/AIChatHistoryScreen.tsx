import Colors from "@/src/constants/colors";
import { getAiChatHistory } from "@/src/services/aiChat";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    AppState,
    FlatList,
    Pressable,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type MessageRole = "user" | "assistant" | "system";

type HistoryEntry = {
    id: string;
    role: MessageRole;
    content?: string;
    createdAt: number;
    processingTime?: number | null;
    isPending?: boolean;
    status?: "pending" | "done";
};

const HISTORY_STALE_MS = 45000;

const formatTimestamp = (timestamp: number) =>
    new Date(timestamp).toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
    });

const formatDate = (timestamp: number) =>
    new Date(timestamp).toLocaleDateString("vi-VN", {
        year: "numeric",
        month: "long",
        day: "numeric",
    });

export default function AIChatHistoryScreen() {
    const router = useRouter();
    const [historyItems, setHistoryItems] = useState<HistoryEntry[]>([]);
    const [historyLoading, setHistoryLoading] = useState<boolean>(false);
    const [historyLoaded, setHistoryLoaded] = useState<boolean>(false);
    const [historyError, setHistoryError] = useState<string | null>(null);
    const [historyLastSynced, setHistoryLastSynced] = useState<Date | null>(null);
    const appState = useRef(AppState.currentState);
    const historyPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const fetchHistory = useCallback(async () => {
        setHistoryLoading(true);
        setHistoryError(null);
        try {
            const response = await getAiChatHistory();
            const payload = response?.data ?? {};

            const sessions = Array.isArray(payload?.sessions)
                ? payload.sessions
                : [];

            const normalized: HistoryEntry[] = sessions
                .map((session: any, index: number): HistoryEntry | null => {
                    if (!session) return null;
                    const createdAt = session.created_at 
                        ? new Date(session.created_at).getTime() 
                        : session.last_message_at 
                        ? new Date(session.last_message_at).getTime()
                        : Date.now();
                    const content = session.last_message ?? "";
                    const isPending = !content || String(content).trim().length === 0;
                    return {
                        id: String(session.id ?? `session-${index}-${createdAt}`),
                        role: "assistant",
                        content,
                        createdAt,
                        processingTime: undefined,
                        isPending,
                        status: isPending ? "pending" : "done",
                    };
                })
                .filter((item: HistoryEntry | null): item is HistoryEntry => Boolean(item));

            setHistoryItems(normalized);
            setHistoryLoaded(true);
            setHistoryLastSynced(new Date());
        } catch (error) {
            console.error("Không thể tải lịch sử AI chat", error);
            setHistoryError(
                (error as any)?.message ?? "Không thể tải lịch sử trò chuyện. Vui lòng thử lại.",
            );
        } finally {
            setHistoryLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

    const hasPendingHistory = useMemo(
        () => historyItems.some((item) => item.isPending),
        [historyItems],
    );

    const shouldPollHistory = hasPendingHistory;

    const isHistoryStale = useMemo(() => {
        if (!historyLastSynced) return true;
        return Date.now() - historyLastSynced.getTime() > HISTORY_STALE_MS;
    }, [historyLastSynced]);

    useEffect(() => {
        const subscription = AppState.addEventListener("change", (nextState) => {
            if (appState.current.match(/inactive|background/) && nextState === "active") {
                if (shouldPollHistory || isHistoryStale) {
                    fetchHistory();
                }
            }
            appState.current = nextState;
        });

        return () => {
            subscription.remove();
        };
    }, [fetchHistory, isHistoryStale, shouldPollHistory]);

    useEffect(() => {
        if (shouldPollHistory) {
            historyPollRef.current = setInterval(() => fetchHistory(), 5000);
        } else if (historyPollRef.current) {
            clearInterval(historyPollRef.current);
            historyPollRef.current = null;
        }

        return () => {
            if (historyPollRef.current) {
                clearInterval(historyPollRef.current);
                historyPollRef.current = null;
            }
        };
    }, [shouldPollHistory, fetchHistory]);

    const handleHistoryItemPress = useCallback(
        (item: HistoryEntry) => {
            if (item.isPending) {
                Alert.alert(
                    "Đang xử lý",
                    "AI vẫn đang phân tích nội dung bạn đã gửi. Lịch sử sẽ tự cập nhật, bạn có thể đợi thêm hoặc bấm Làm mới.",
                    [
                        { text: "Đóng", style: "cancel" },
                        { text: "Làm mới", onPress: fetchHistory },
                    ],
                );
                return;
            }

            router.back();
            // Use a small delay to ensure navigation completes before setting params
            setTimeout(() => {
                router.setParams({ sessionId: item.id } as never);
            }, 100);
        },
        [fetchHistory, router],
    );

    const renderHistoryItem = useCallback(
        ({ item }: { item: HistoryEntry }) => {
            const isUser = item.role === "user";
            return (
                <Pressable
                    style={({ pressed }) => [styles.historyItem, pressed && styles.historyItemPressed]}
                    onPress={() => handleHistoryItemPress(item)}
                >
                    <View style={styles.historyItemHeader}>
                        <View style={[styles.historyRolePill, isUser ? styles.historyRoleUser : styles.historyRoleAi]}>
                            <Text style={styles.historyRoleText}>{isUser ? "Bạn" : "AI"}</Text>
                        </View>
                        <View style={styles.historyHeaderRight}>
                            {item.isPending ? (
                                <View style={styles.historyPendingChip}>
                                    <ActivityIndicator size="small" color={Colors.primary} />
                                    <Text style={styles.historyPendingChipText}>Đang xử lý</Text>
                                </View>
                            ) : null}
                            <Text style={styles.historyTimestamp}>{formatTimestamp(item.createdAt)}</Text>
                        </View>
                    </View>

                    {item.isPending ? (
                        <View style={styles.historyPendingRow}>
                            <ActivityIndicator size="small" color={Colors.primary} />
                            <Text style={styles.historyPendingText}>
                                AI đang xử lý ảnh/đoạn chat này. Hãy chờ hoặc bấm Làm mới.
                            </Text>
                        </View>
                    ) : (
                        <Text style={styles.historyContent} numberOfLines={3}>
                            {item.content || "—"}
                        </Text>
                    )}
                </Pressable>
            );
        },
        [handleHistoryItemPress],
    );

    return (
        <>
            <Stack.Screen options={{ headerShown: false }} />
            <SafeAreaView style={styles.safeArea} edges={["top", "left", "right", "bottom"]}>
                <LinearGradient
                    colors={[Colors.primary, Colors.purple]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.headerGradient}
                >
                    <View style={styles.headerTopRow}>
                        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
                            <Ionicons name="arrow-back" size={22} color={Colors.white} />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Lịch sử trò chuyện</Text>
                        <View style={styles.headerSpacer} />
                    </View>
                </LinearGradient>

                <View style={styles.container}>
                    <LinearGradient
                        colors={["#eef2ff", "#e0f2fe", "#fef3c7"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.statusCard}
                    >
                        <View style={styles.statusRow}>
                            <View
                                style={[
                                    styles.liveChip,
                                    hasPendingHistory ? styles.liveChipProcessing : styles.liveChipReady,
                                ]}
                            >
                                <View
                                    style={[
                                        styles.liveDot,
                                        hasPendingHistory ? styles.liveDotWarning : styles.liveDotReady,
                                    ]}
                                />
                                <Text style={styles.liveChipText}>
                                    {hasPendingHistory ? "Đang xử lý" : "Đã đồng bộ"}
                                </Text>
                            </View>
                            <TouchableOpacity
                                style={styles.refreshButton}
                                activeOpacity={0.9}
                                onPress={fetchHistory}
                                disabled={historyLoading}
                            >
                                <Ionicons name="refresh-outline" size={16} color={Colors.primary} />
                                <Text style={styles.refreshButtonText}>Làm mới</Text>
                            </TouchableOpacity>
                        </View>
                        {historyLastSynced ? (
                            <Text style={styles.historySyncedAt}>
                                Cập nhật lúc {historyLastSynced.toLocaleTimeString("vi-VN")}
                            </Text>
                        ) : null}
                    </LinearGradient>

                    {historyLoading && !historyLoaded ? (
                        <View style={styles.centerView}>
                            <ActivityIndicator size="large" color={Colors.primary} />
                            <Text style={styles.loadingText}>Đang tải lịch sử...</Text>
                        </View>
                    ) : historyError ? (
                        <View style={styles.centerView}>
                            <Ionicons name="warning-outline" size={48} color="#b91c1c" />
                            <Text style={styles.errorText}>{historyError}</Text>
                            <TouchableOpacity onPress={fetchHistory} style={styles.retryButton}>
                                <Text style={styles.retryButtonText}>Thử lại</Text>
                            </TouchableOpacity>
                        </View>
                    ) : historyItems.length === 0 ? (
                        <View style={styles.centerView}>
                            <Ionicons name="chatbubbles-outline" size={64} color={Colors.gray} />
                            <Text style={styles.emptyText}>Chưa có cuộc trò chuyện nào</Text>
                            <Text style={styles.emptySubtext}>
                                Hãy bắt đầu trò chuyện với AI để xem lịch sử
                            </Text>
                        </View>
                    ) : (
                        <FlatList
                            data={historyItems}
                            keyExtractor={(item) => item.id}
                            renderItem={renderHistoryItem}
                            contentContainerStyle={styles.listContent}
                            showsVerticalScrollIndicator
                            ListFooterComponent={<View style={{ height: 12 }} />}
                        />
                    )}
                </View>
            </SafeAreaView>
        </>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    container: {
        flex: 1,
        paddingHorizontal: 16,
    },
    headerGradient: {
        marginBottom: 12,
        paddingVertical: 20,
        paddingHorizontal: 20,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        shadowColor: "#000000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 6,
    },
    headerTopRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 18,
    },
    headerButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "rgba(255,255,255,0.16)",
        alignItems: "center",
        justifyContent: "center",
    },
    headerSpacer: {
        width: 40,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: Colors.white,
        letterSpacing: 0.3,
    },
    statusCard: {
        borderRadius: 14,
        padding: 14,
        marginBottom: 16,
        marginTop: 8,
        gap: 6,
    },
    statusRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
    },
    liveChip: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        borderWidth: 1,
        flexShrink: 0,
    },
    liveChipProcessing: {
        backgroundColor: "#fff7ed",
        borderColor: "#fdba74",
    },
    liveChipReady: {
        backgroundColor: "#ecfeff",
        borderColor: "#22d3ee",
    },
    liveDot: {
        width: 8,
        height: 8,
        borderRadius: 999,
    },
    liveDotWarning: {
        backgroundColor: "#f59e0b",
    },
    liveDotReady: {
        backgroundColor: "#0ea5e9",
    },
    liveChipText: {
        fontSize: 12,
        fontWeight: "700",
        color: Colors.dark_gray,
    },
    refreshButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 12,
        backgroundColor: "rgba(37,99,235,0.12)",
    },
    refreshButtonText: {
        color: Colors.primary,
        fontWeight: "700",
        fontSize: 12,
    },
    historySyncedAt: {
        fontSize: 12,
        color: Colors.dark_gray,
        opacity: 0.7,
    },
    centerView: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        paddingHorizontal: 24,
    },
    loadingText: {
        fontSize: 14,
        color: Colors.gray,
    },
    errorText: {
        fontSize: 14,
        color: "#b91c1c",
        textAlign: "center",
    },
    retryButton: {
        marginTop: 8,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        backgroundColor: Colors.primary,
    },
    retryButtonText: {
        color: Colors.white,
        fontWeight: "600",
    },
    emptyText: {
        fontSize: 16,
        fontWeight: "600",
        color: Colors.dark_gray,
        marginTop: 12,
    },
    emptySubtext: {
        fontSize: 14,
        color: Colors.gray,
        textAlign: "center",
    },
    listContent: {
        gap: 10,
        paddingVertical: 8,
    },
    historyItem: {
        padding: 12,
        borderRadius: 12,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: Colors.borderGray,
        backgroundColor: "#f8fafc",
        gap: 8,
    },
    historyItemPressed: {
        opacity: 0.95,
        transform: [{ scale: 0.995 }],
    },
    historyItemHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    historyHeaderRight: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    historyRolePill: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
    },
    historyRoleUser: {
        backgroundColor: "rgba(24,119,242,0.12)",
    },
    historyRoleAi: {
        backgroundColor: "rgba(16,185,129,0.14)",
    },
    historyRoleText: {
        fontSize: 11,
        fontWeight: "700",
        color: Colors.dark_gray,
        textTransform: "uppercase",
        letterSpacing: 0.4,
    },
    historyTimestamp: {
        fontSize: 11,
        color: Colors.gray,
    },
    historyContent: {
        fontSize: 13,
        color: Colors.dark_gray,
        lineHeight: 18,
    },
    historyPendingChip: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
        backgroundColor: "#fff7ed",
    },
    historyPendingChipText: {
        fontSize: 11,
        color: "#b45309",
        fontWeight: "700",
    },
    historyPendingRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    historyPendingText: {
        flex: 1,
        fontSize: 13,
        color: Colors.dark_gray,
    },
});
