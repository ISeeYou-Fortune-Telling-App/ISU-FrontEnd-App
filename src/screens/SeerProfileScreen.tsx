import Colors from "@/src/constants/colors";
import { getServicePackageDetail, getServicePackages, getUser, interactWithServicePackage } from "@/src/services/api";
import { MaterialIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { Clock, Flag, MessageCircle, Star, ThumbsDown, ThumbsUp, Wallet } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Dimensions, FlatList, Image, StyleSheet, TouchableOpacity, View } from "react-native";
import { Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SeerProfileScreen() {
    const params = useLocalSearchParams();
    const seerId = params.seerId as string | undefined;

    const [role, setRole] = useState<string>("CUSTOMER");
    const [seer, setSeer] = useState<any | null>(null);
    const [packages, setPackages] = useState<any[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [profileLoading, setProfileLoading] = useState<boolean>(false);
    const [expandedPackages, setExpandedPackages] = useState<Record<string, boolean>>({});
    const [likeInFlight, setLikeInFlight] = useState<Record<string, boolean>>({});
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 15;
    const [avatarError, setAvatarError] = useState(false);
    const [coverError, setCoverError] = useState(false);

    // Pagination states
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const getCategoryStyle = (category: string | null) => {
        const categoryMapping: Record<string, { display: string; background: string; text: string; }> = {
            "Cung Hoàng Đạo": { display: "Cung Hoàng Đạo", background: Colors.categoryColors.zodiac.chip, text: Colors.categoryColors.zodiac.icon },
            "Ngũ Hành": { display: "Ngũ Hành", background: Colors.categoryColors.elements.chip, text: Colors.categoryColors.elements.icon },
            "Nhân Tướng Học": { display: "Nhân Tướng Học", background: Colors.categoryColors.physiognomy.chip, text: Colors.categoryColors.physiognomy.icon },
            "Chỉ Tay": { display: "Chỉ Tay", background: Colors.categoryColors.palmistry.chip, text: Colors.categoryColors.palmistry.icon },
            "Tarot": { display: "Tarot", background: Colors.categoryColors.tarot.chip, text: Colors.categoryColors.tarot.icon },
            "TAROT": { display: "Tarot", background: Colors.categoryColors.tarot.chip, text: Colors.categoryColors.tarot.icon },
            "Khác": { display: "Khác", background: Colors.categoryColors.other.chip, text: Colors.categoryColors.other.icon },
        };
        return category ? categoryMapping[category] ?? { display: category, background: "#F2F2F2", text: "#4F4F4F" } : { display: "", background: "#F2F2F2", text: "#4F4F4F" };
    };

    // Fetch seer profile using getUser
    const fetchSeerProfile = useCallback(async (id?: string) => {
        if (!id) return;
        setProfileLoading(true);
        try {
            const res = await getUser(id);
            setSeer(res?.data?.data ?? null);
        } catch (err) {
            setSeer(null);
            console.error('Failed to load seer profile', err);
        } finally {
            setProfileLoading(false);
        }
    }, []);

    // Fetch packages for seer (supports pagination page param)
    const fetchPackages = useCallback(async (id?: string, page: number = 1) => {
        if (!id) return;

        // Manage loading states separately for first page vs subsequent pages vs refresh
        if (page === 1 && !refreshing) setLoading(true);
        else if (page === 1 && refreshing) {
            // already setting refreshing true in caller
        } else {
            setLoadingMore(true);
        }

        try {
            const params: any = {
                page,
                limit: pageSize,
                seerId: id,
                sortType: "desc",
                sortBy: "createdAt",
                status: "AVAILABLE",
            };
            const res = await getServicePackages(params);

            if (res.data && res.data.data) {
                const rawPackages = res.data.data;
                // Try to read paging info (depends on your API)
                const paging = res.data.paging;

                const packagesWithDetails = await Promise.all(
                    rawPackages.map(async (p: any) => {
                        try {
                            const detailResponse = await getServicePackageDetail(p.id);
                            const detail = detailResponse.data.data;
                            return {
                                id: detail.packageId,
                                seer: detail.seer.fullName,
                                rating: p.seer.avgRating,
                                time: new Date(detail.createdAt).toLocaleDateString(),
                                categories: p.categories || [],
                                categoryDisplays: (p.categories || []).map((cat: any) => ({
                                    name: cat.name,
                                    ...getCategoryStyle(cat.name)
                                })),
                                title: detail.packageTitle,
                                content: detail.packageContent,
                                price: `${detail.price.toLocaleString("vi-VN")} VNĐ`,
                                duration: `${detail.durationMinutes} phút`,
                                imageUrl: detail.imageUrl,
                                likes: p.likeCount,
                                dislikes: p.dislikeCount,
                                comments: `${p.totalReviews} bình luận`,
                                avatarUrl: detail.seer.avatarUrl,
                                isLike: p.isLike,
                                isDislike: p.isDislike,
                                seerId: detail.seer.seerId
                            };
                        } catch (detailErr) {
                            console.error(`Error fetching details for package ${p.id}:`, detailErr);
                            return {
                                id: p.id,
                                seer: 'Không có thông tin',
                                rating: 0,
                                time: new Date(p.createdAt).toLocaleDateString(),
                                categories: p.categories || [],
                                categoryDisplays: (p.categories || []).map((cat: any) => ({
                                    name: cat.name,
                                    ...getCategoryStyle(cat.name)
                                })),
                                title: p.packageTitle,
                                content: p.packageContent,
                                price: `${p.price?.toLocaleString ? p.price.toLocaleString("vi-VN") : p.price} VNĐ`,
                                duration: `${p.durationMinutes} phút`,
                                imageUrl: p.imageUrl,
                                likes: p.likeCount,
                                dislikes: p.dislikeCount,
                                comments: `${p.totalReviews} bình luận`,
                            };
                        }
                    })
                );

                if (page === 1) setPackages(packagesWithDetails);
                else setPackages(prev => [...prev, ...packagesWithDetails]);

                setCurrentPage(page);

                // Determine if there are more pages:
                if (paging && typeof paging.totalPages !== "undefined") {
                    setHasMore(page < paging.totalPages);
                } else {
                    // fallback: if returned items < pageSize then no more
                    setHasMore(rawPackages.length === pageSize);
                }
            } else {
                // no data returned: consider no more
                if (page === 1) setPackages([]);
                setHasMore(false);
            }
        } catch (err) {
            console.error('Failed to load seer packages', err);
            if (page === 1) setPackages([]);
            setHasMore(false);
        } finally {
            setLoading(false);
            setLoadingMore(false);
            setRefreshing(false);
        }
    }, [pageSize, refreshing]);

    const handleLike = async (packageId: string) => {
        if (likeInFlight[packageId]) return; // prevent double taps
        try {
            setLikeInFlight((s) => ({ ...s, [packageId]: true }));

            // find package current userInteraction
            const pkg = packages.find((p) => p.id === packageId);
            const currentlyLiked = pkg?.userInteraction === 'LIKE';

            // decide action: if currentlyLiked then UNLIKE (or REMOVE), else LIKE
            const action = currentlyLiked ? 'LIKE' : 'LIKE';

            const res = await interactWithServicePackage(packageId, { interactionType: action });
            const data = res?.data?.data ?? res?.data ?? null;
            if (data) {
                setPackages((prev) =>
                    prev.map((p) =>
                        p.id === packageId
                            ? { ...p, likes: data.likeCount?.toString() ?? p.likes, dislikes: data.dislikeCount?.toString() ?? p.dislikes, userInteraction: data.userInteraction }
                            : p
                    )
                );
            }
        } catch (err) {
            console.error('Failed to like package', err);
        } finally {
            setLikeInFlight((s) => ({ ...s, [packageId]: false }));
        }
    };

    const handleDislike = async (packageId: string) => {
        if (likeInFlight[packageId]) return; // prevent double taps
        try {
            setLikeInFlight((s) => ({ ...s, [packageId]: true }));

            // find package current userInteraction
            const pkg = packages.find((p) => p.id === packageId);
            const currentlyDisliked = pkg?.userInteraction === 'DISLIKE';

            const action = currentlyDisliked ? 'DISLIKE' : 'DISLIKE';

            const res = await interactWithServicePackage(packageId, { interactionType: action });
            const data = res?.data?.data ?? res?.data ?? null;
            if (data) {
                setPackages((prev) =>
                    prev.map((p) =>
                        p.id === packageId
                            ? { ...p, likes: data.likeCount?.toString() ?? p.likes, dislikes: data.dislikeCount?.toString() ?? p.dislikes, userInteraction: data.userInteraction }
                            : p
                    )
                );
            }
        } catch (err) {
            console.error('Failed to dislike package', err);
        } finally {
            setLikeInFlight((s) => ({ ...s, [packageId]: false }));
        }
    };

    // load more handler (infinite scroll)
    const loadMore = useCallback(() => {
        // prevent loading more if already fetching or no more pages
        if (!seerId) return;
        if (loadingMore || loading) return;
        if (!hasMore) return;
        fetchPackages(seerId, currentPage + 1);
    }, [seerId, loadingMore, loading, hasMore, currentPage, fetchPackages]);

    // pull-to-refresh handler
    const refreshPackages = useCallback(async () => {
        if (!seerId) return;
        setRefreshing(true);
        setHasMore(true);
        await fetchPackages(seerId, 1);
    }, [seerId, fetchPackages]);

    useEffect(() => {
        fetchSeerProfile(seerId);
        fetchPackages(seerId, 1);
        (async () => {
            try {
                const storedRole = await SecureStore.getItemAsync("userRole");
                if (storedRole) setRole(storedRole);
            } catch (e) {
                console.warn("Unable to read userRole from SecureStore", e);
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [seerId]);

    // Profile header for FlatList
    const renderProfileHeader = () => {
        if (profileLoading) {
            return (
                <View style={{ padding: 32, alignItems: 'center' }}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                </View>
            );
        }
        if (!seer) {
            return (
                <View style={{ padding: 32, alignItems: 'center' }}>
                    <Text style={{ color: 'red' }}>Không tìm thấy thông tin thầy/tỳ năng.</Text>
                </View>
            );
        }

        // Stats from profile
        const stats = seer.profile ?? {};
        const avgRating = stats.avgRating ?? 0;
        const totalRates = stats.totalRates ?? 0;
        const completedBookings = stats.completedBookings ?? 0;
        const totalBookings = stats.totalBookings ?? 0;
        const totalRevenue = stats.totalRevenue ?? 0;

        return (
            <View>
                {/* Cover image */}
                <Image
                    source={
                        coverError || !seer.coverUrl
                            ? require("@/assets/images/placeholder.png")
                            : { uri: seer.coverUrl }
                    }
                    style={styles.coverImage}
                    resizeMode="cover"
                    onError={(e) => {
                        setCoverError(true);
                    }}
                />
                <View style={styles.profileHeader}>
                    <Image
                        source={
                            avatarError || !seer.avatarUrl
                                ? require("@/assets/images/user-placeholder.png")
                                : { uri: seer.avatarUrl }
                        }
                        style={styles.avatar}
                        resizeMode="cover"
                        onError={(e) => {
                            setAvatarError(true);
                        }}
                    />
                    <Text style={styles.name}>{seer.fullName ?? 'Thầy/Tỳ Năng'}</Text>
                    <Text style={styles.rating}>{avgRating > 0 ? `⭐ ${avgRating} (${totalRates} đánh giá)` : 'Chưa có đánh giá'}</Text>
                    <Text style={styles.profileDescription}>{seer.profileDescription}</Text>
                    <View style={styles.statsRow}>
                        <View style={styles.statItem}><Text style={styles.statValue}>{totalBookings}</Text><Text style={styles.statLabel}>Tổng số lịch</Text></View>
                        <View style={styles.statItem}><Text style={styles.statValue}>{completedBookings}</Text><Text style={styles.statLabel}>Hoàn thành</Text></View>
                        {/* <View style={styles.statItem}><Text style={styles.statValue}>{totalRevenue.toLocaleString('vi-VN')}</Text><Text style={styles.statLabel}>Doanh thu (VNĐ)</Text></View> */}
                    </View>
                </View>

                <View style={{ marginHorizontal: 12, marginTop: 8 }}>
                    <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 8 }}>Gói dịch vụ</Text>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.safeAreaView} edges={["top"]}>
            <View style={styles.header}>
                <MaterialIcons name="arrow-back" size={28} color={Colors.black} onPress={() => router.back()} />
                <View style={styles.titleContainer}>
                    <Text variant="titleLarge" style={styles.title}>Thông tin thầy bói</Text>
                </View>
                <View style={styles.headerPlaceholder} />
            </View>
            <FlatList
                data={packages}
                keyExtractor={(p) => String(p.id)}
                renderItem={({ item }) => (
                    <ServicePackageCard
                        servicePackage={item}
                        expanded={Boolean(expandedPackages[item.id])}
                        onToggle={() =>
                            setExpandedPackages((prev) => ({
                                ...prev,
                                [item.id]: !prev[item.id],
                            }))
                        }
                        onLike={handleLike}
                        onDislike={handleDislike}
                        isLiking={Boolean(likeInFlight[item.id])}
                        onBooking={() => router.push({ pathname: "/book-package", params: { id: item.id, title: item.title, content: item.content, rating: item.rating, price: item.price, duration: item.duration, seer: item.seer, avatarUrl: item.avatarUrl } })}
                        userRole={role}
                        isLike={item.isLike}
                        isDislike={item.isDislike}
                    />
                )}
                ListHeaderComponent={renderProfileHeader}
                ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
                contentContainerStyle={{ paddingBottom: 40 }}
                ListEmptyComponent={loading ? <ActivityIndicator size="large" color={Colors.primary} /> : <Text style={styles.emptyText}>Không có gói dịch vụ nào.</Text>}
                // Pagination props
                onEndReached={loadMore}
                onEndReachedThreshold={0.3}
                ListFooterComponent={
                    loadingMore ? (
                        <ActivityIndicator size="large" color={Colors.primary} style={{ marginVertical: 20 }} />
                    ) : !hasMore ? (
                        <Text style={styles.emptyText}>Không có thêm gói dịch vụ.</Text>
                    ) : null
                }
                // Pull-to-refresh
                refreshing={refreshing}
                onRefresh={refreshPackages}
            />
        </SafeAreaView>
    );
}

type ServicePackageCardProps = {
    servicePackage: any;
    expanded: boolean;
    onToggle: () => void;
    onLike?: (id: string) => void;
    onDislike?: (id: string) => void;
    isLiking?: boolean;
    onBooking?: (id: string, title: string, content: string, rating: number, price: string, duration: string, seer: string, avatarUrl: string) => void;
    userRole?: string;
    isLike: boolean;
    isDislike: boolean;
};

const ServicePackageCard = ({ servicePackage, expanded, onToggle, onLike, onDislike, onBooking, userRole, isLike, isDislike }: ServicePackageCardProps) => {
    const [avatarError, setAvatarError] = useState(false);
    const [coverError, setCoverError] = useState(false);
    const [showPopup, setShowPopup] = useState(false);
    const [int, setInt] = useState(isLike ? "LIKE" : isDislike ? "DISLIKE" : "");

    function handleInteraction(interactionType: string) {
        if (interactionType === "LIKE") {
            onLike ? onLike(servicePackage.id) : null;
            if (["", "DISLIKE"].includes(int)) setInt("LIKE");
            else setInt("");
        }
        else if (interactionType === "DISLIKE") {
            onDislike ? onDislike(servicePackage.id) : null;
            if (["", "LIKE"].includes(int)) setInt("DISLIKE");
            else setInt("");
        }
        else {
            onLike ? onLike(servicePackage.id) : null;
            setInt("LIKE");
        }
    }

    return (
        <TouchableOpacity style={styles.packageCard} activeOpacity={0.85} onPress={onToggle}>
            {/* --- HEADER --- */}
            <View style={styles.packageHeader}>
                <Image
                    source={
                        avatarError || !servicePackage.avatarUrl
                            ? require("@/assets/images/user-placeholder.png")
                            : { uri: servicePackage.avatarUrl }
                    }
                    style={styles.avatarSmall}
                    resizeMode="cover"
                    onError={(e) => {
                        setAvatarError(true);
                    }}
                />

                <View style={styles.packageHeaderText}>
                    <Text style={styles.seerName}>
                        {servicePackage.seer} <Star size={16} color="#FFD700" /> {servicePackage.rating}
                    </Text>
                    <Text style={styles.packageTime}>{servicePackage.time}</Text>
                </View>

                <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <TouchableOpacity
                        onPress={() =>
                            router.push({
                                pathname: "/report",
                                params: {
                                    targetId: servicePackage.id,
                                    targetType: "SERVICE_PACKAGE",
                                    targetName: servicePackage.title,
                                },
                            })
                        }
                    >
                        <Flag size={20} color="gray" style={{ marginRight: 12 }} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* --- CATEGORY TAGS --- */}
            {servicePackage.categoryDisplays?.length > 0 && (
                <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 8, marginBottom: 4 }}>
                    {servicePackage.categoryDisplays.map((catDisplay: any, index: number) => (
                        <View
                            key={index}
                            style={[
                                styles.categoryTag,
                                { backgroundColor: catDisplay.background, marginRight: 4, marginBottom: 2 },
                            ]}
                        >
                            <Text style={[styles.categoryText, { color: catDisplay.text }]}>{catDisplay.display}</Text>
                        </View>
                    ))}
                </View>
            )}

            {/* --- CONTENT --- */}
            <Text style={styles.packageTitle}>{servicePackage.title}</Text>
            <Text style={styles.packageContent} numberOfLines={expanded ? undefined : 3}>
                {servicePackage.content?.replace(/\\n/g, "\n")}
            </Text>

            <Image
                source={
                    coverError || !servicePackage.imageUrl
                        ? require("@/assets/images/placeholder.png")
                        : { uri: servicePackage.imageUrl }
                }
                style={styles.packageImage}
                onError={(e) => {
                    setCoverError(true);
                }}
            />

            {/* --- PRICE + DURATION --- */}
            <View style={styles.packageFooterInfo}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Wallet size={16} color="#32CD32" />
                    <Text style={styles.packagePrice}>{servicePackage.price}</Text>
                    <Clock size={16} color="gray" style={{ marginLeft: 16 }} />
                    <Text style={styles.packageDuration}>{servicePackage.duration}</Text>
                </View>
            </View>

            {/* --- STATS --- */}
            <View style={styles.packageStats}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <View style={[styles.likeIconCircle, { backgroundColor: "#E7F3FF" }]}>
                        <ThumbsUp size={16} color="#1877F2" />
                    </View>
                    <Text style={styles.likes}>{servicePackage.likes}</Text>
                    <View style={[styles.dislikeIconCircle, { backgroundColor: "#FFF8DC" }]}>
                        <ThumbsDown size={16} color="#FBCB0A" />
                    </View>
                    <Text style={styles.dislikes}>{servicePackage.dislikes}</Text>
                </View>
                <Text style={styles.comments}>{servicePackage.comments}</Text>
            </View>

            {/* --- ACTIONS --- */}
            <View style={styles.packageActions}>
                <TouchableOpacity
                    style={[
                        styles.actionButton,
                        (int === "LIKE" || int === "DISLIKE") && {
                            backgroundColor: int === "LIKE" ? "#E7F3FF" : "#FFF7E0",
                            borderRadius: 10,
                            paddingVertical: 6,
                            paddingHorizontal: 10,
                        },
                    ]}
                    onPress={
                        () => {
                            if (int === "DISLIKE") {
                                handleInteraction("DISLIKE");
                            } else if (int === "LIKE") {
                                handleInteraction("LIKE");
                            }
                            else {
                                handleInteraction("");
                            }
                        }
                    }
                    onLongPress={() => setShowPopup(true)}
                >
                    {(int === "LIKE" || int === "") && <ThumbsUp
                        size={20}
                        color={int === "LIKE" ? "#1877F2" : "gray"}
                    />}
                    {int === "DISLIKE" && <ThumbsDown
                        size={20}
                        color={Colors.brightYellow}
                    />}
                    {int === "LIKE" ?
                        <Text
                            style={[styles.actionText, { color: "#1877F2" }]}>
                            Thích
                        </Text> : int === "DISLIKE" ?
                            <Text
                                style={[styles.actionText, { color: Colors.brightYellow }]}>
                                Không thích
                            </Text> :
                            <Text style={styles.actionText}>Thích</Text>
                    }
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() =>
                        router.push({ pathname: "/service-package-reviews", params: { id: servicePackage.id } })
                    }
                >
                    <MessageCircle size={20} color="gray" />
                    <Text style={styles.actionText}>Bình luận</Text>
                </TouchableOpacity>
            </View>

            {/* --- POPUP --- */}
            {showPopup && (
                <TouchableOpacity
                    activeOpacity={1}
                    style={{
                        position: "absolute",
                        bottom: 80,
                        left: "25%",
                        right: "25%",
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: "rgba(0,0,0,0.1)",
                        zIndex: 999,
                    }}
                    onPressOut={() => setShowPopup(false)}
                >
                    <View
                        style={{
                            flexDirection: "row",
                            backgroundColor: "white",
                            padding: 12,
                            borderRadius: 14,
                            elevation: 6,
                            shadowColor: "#000",
                            shadowOffset: { width: 0, height: 3 },
                            shadowOpacity: 0.25,
                            shadowRadius: 6,
                        }}
                    >
                        <TouchableOpacity
                            style={{
                                alignItems: "center",
                                marginHorizontal: 10,
                                backgroundColor: int === "LIKE" ? "#E7F3FF" : "transparent",
                                borderRadius: 8,
                                padding: 4,
                            }}
                            onPress={() => {
                                setShowPopup(false);
                                if (int === "LIKE") {
                                    handleInteraction("LIKE");
                                }
                                else {
                                    handleInteraction("");
                                }
                            }}
                        >
                            <ThumbsUp size={26} color="#1877F2" />
                            <Text style={{ fontSize: 12, color: "#333" }}>Thích</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={{
                                alignItems: "center",
                                marginHorizontal: 10,
                                backgroundColor: int === "DISLIKE" ? "#FFF7E0" : "transparent",
                                borderRadius: 8,
                                padding: 4,
                            }}
                            onPress={() => {
                                setShowPopup(false);
                                handleInteraction("DISLIKE");
                            }}
                        >
                            <ThumbsDown size={26} color="#FBCB0A" />
                            <Text style={{ fontSize: 12, color: "#333" }}>Không thích</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            )}

            {/* --- BOOK BUTTON --- */}
            {userRole !== "SEER" && <TouchableOpacity
                style={styles.bookButtonContainer}
                onPress={() =>
                    router.push({
                        pathname: "/book-package",
                        params: {
                            id: servicePackage.id,
                            title: servicePackage.title,
                            content: servicePackage.content,
                            rating: servicePackage.rating,
                            price: servicePackage.price,
                            duration: servicePackage.duration,
                            seer: servicePackage.seer,
                            avatarUrl: servicePackage.avatarUrl,
                        },
                    })
                }
            >
                <Text style={styles.bookButton}>Đặt lịch ngay</Text>
            </TouchableOpacity>}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    safeAreaView: { flex: 1, backgroundColor: Colors.grayBackground },
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
        color: Colors.black,
    },
    headerPlaceholder: {
        width: 28,
        height: 28,
    },
    headerWrapper: { height: 48, justifyContent: 'center' },
    coverImage: {
        width: Dimensions.get('window').width,
        height: 160,
        resizeMode: 'cover',
        marginBottom: -40,
    },
    profileHeader: {
        alignItems: 'center',
        padding: 16,
        backgroundColor: Colors.white,
        marginBottom: 10,
        borderRadius: 12,
        marginHorizontal: 12,
        marginTop: -40,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 4,
    },
    avatar: { width: 120, height: 120, borderRadius: 9999, backgroundColor: '#ddd', borderWidth: 2, borderColor: Colors.primary },
    avatarSmall: { width: 50, height: 50, borderRadius: 50, backgroundColor: '#ddd', borderWidth: 2, borderColor: Colors.grayBackground },
    name: { marginTop: 12, fontSize: 20, fontWeight: '700' },
    rating: { color: Colors.primary, fontSize: 16, marginTop: 4, fontFamily: "inter" },
    profileDescription: { color: 'gray', fontFamily: "inter", textAlign: 'center', marginTop: 8 },
    statsRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 16, marginBottom: 8 },
    statItem: { alignItems: 'center', flex: 1 },
    statValue: { fontWeight: '700', fontSize: 16, color: Colors.primary },
    statLabel: { color: 'gray', fontSize: 12, marginTop: 2, fontFamily: "inter" },
    emptyText: { textAlign: 'center', marginTop: 20, fontSize: 16, color: 'gray' },
    packageCard: {
        backgroundColor: Colors.white,
        marginTop: 8,
        marginHorizontal: 10,
        padding: 16,
        borderRadius: 12,
    },
    seerName: {
        fontWeight: 'bold',
        fontSize: 16,
        fontFamily: 'inter',
    },
    packageTime: {
        color: 'gray',
        fontSize: 12,
        fontFamily: 'inter',
    },
    packageHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    packageHeaderText: {
        marginLeft: 12,
        flex: 1,
    },

    packageTitle: {
        fontWeight: 'bold',
        fontSize: 16,
        marginTop: 12,
        fontFamily: 'inter',
    },
    packageContent: {
        marginTop: 8,
        fontSize: 16,
        color: '#333',
        fontFamily: 'inter',
    },
    packageImage: {
        width: '100%',
        height: 200,
        marginTop: 12,
        borderRadius: 8,
    },
    packageFooterInfo: {
        flexDirection: 'row',
        justifyContent: 'flex-start',
        alignItems: 'center',
        marginTop: 12,
        paddingHorizontal: 8,
    },
    packagePrice: {
        marginLeft: 4,
        color: '#32CD32',
        fontWeight: 'bold',
        fontSize: 16,
        fontFamily: 'inter',
    },
    packageDuration: {
        marginLeft: 4,
        color: 'gray',
        fontSize: 16,
        fontFamily: 'inter',
    },

    categoryTag: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        marginLeft: 4,
    },
    categoryText: {
        fontSize: 12,
        fontWeight: '500',
        fontFamily: 'inter',
    },
    packageStats: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#E0E0E0',
    },
    likes: {
        color: 'gray',
        marginLeft: 4,
        fontSize: 12,
        fontFamily: 'inter',
    },
    dislikes: {
        color: 'gray',
        marginLeft: 4,
        fontSize: 12,
        fontFamily: 'inter',
    },
    likeIconCircle: {
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    dislikeIconCircle: {
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
    },
    comments: {
        color: 'gray',
        fontSize: 12,
        fontFamily: 'inter',
    },
    packageActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 12,
        paddingTop: 12,
        paddingHorizontal: 16,
        borderTopWidth: 1,
        borderTopColor: '#E0E0E0',
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    actionText: {
        marginLeft: 8,
        color: 'gray',
        fontWeight: 'bold',
        fontSize: 16,
        fontFamily: 'inter',
    },
    bookButtonContainer: {
        marginTop: 12,
        backgroundColor: '#1877F2',
        borderRadius: 6,
        paddingVertical: 12,
    },
    bookButton: {
        color: Colors.white,
        textAlign: 'center',
        fontWeight: 'bold',
        fontSize: 16,
        fontFamily: 'inter',
    },

});
