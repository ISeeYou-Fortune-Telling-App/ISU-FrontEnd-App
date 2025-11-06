import Colors from "@/src/constants/colors";
import { getMyPackages } from "@/src/services/api";
import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { Clock } from "lucide-react-native";
import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function MyPackagesScreen() {
    const [loading, setLoading] = useState(true);
    const [packages, setPackages] = useState<ServicePackage[]>([]);
    const [tab, setTab] = useState("ALL");

    useFocusEffect(
        useCallback(() => {
            fetchPackages();
            return () => { };
        }, [])
    );
    
    const fetchPackages = async () => {
        setLoading(true);
        try {
            const res = await getMyPackages({ page: 1, limit: 15, sortType: "desc", sortBy: "createdAt" });
            setPackages(res?.data?.data ?? []);
        } catch (err) {
            setPackages([]);
        } finally {
            setLoading(false);
        }
    };

    // Filter packages by tab
    let filteredPackages: ServicePackage[] = [];
    if (tab === "ALL") {
        filteredPackages = packages.filter(pkg => pkg.status !== "HAVE_REPORT");
    } else {
        filteredPackages = packages.filter(pkg => pkg.status === tab);
    }

    // Tab counts
    const tabCounts: { [key: string]: number } = {
        ALL: packages.filter(pkg => pkg.status !== "HAVE_REPORT").length,
        AVAILABLE: packages.filter(pkg => pkg.status === "AVAILABLE").length,
        HIDDEN: packages.filter(pkg => pkg.status === "HIDDEN").length,
        REJECTED: packages.filter(pkg => pkg.status === "REJECTED").length,
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <MaterialIcons name="arrow-back" size={28} color={Colors.black} onPress={() => router.back()} />
                <View style={styles.titleContainer}>
                    <Text style={styles.title}>Gói dịch vụ của tôi</Text>
                </View>
                <TouchableOpacity style={styles.addBtn} onPress={() => router.push("/create-package")}>
                    <MaterialCommunityIcons name="plus" size={28} color={Colors.primary} />
                </TouchableOpacity>
            </View>

            <View style={styles.tabsRow}>
                <FlatList
                    data={TABS}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    keyExtractor={item => item.key}
                    contentContainerStyle={{ paddingRight: 10 }}
                    renderItem={({ item: t }) => (
                        <TouchableOpacity
                            key={t.key}
                            style={[styles.tabBtn, tab === t.key && { backgroundColor: t.color || Colors.primary }]}
                            onPress={() => setTab(t.key)}
                        >
                            <Text style={[styles.tabLabel, tab === t.key && { color: t.color ? Colors.white : Colors.white }]}>{t.label}</Text>
                            <View style={[styles.tabCount, tab === t.key && styles.tabCountActive, t.color && tab === t.key ? { backgroundColor: t.color } : {}]}>
                                <Text style={{ color: tab === t.key ? Colors.white : Colors.primary, fontFamily: "inter" }}>{tabCounts[t.key]}</Text>
                            </View>
                        </TouchableOpacity>
                    )}
                />
            </View>

            {loading ? (
                <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={filteredPackages}
                    keyExtractor={item => item.id}
                    contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
                    renderItem={({ item }) => <PackageCard pkg={item} />}
                    ListEmptyComponent={<Text style={{ textAlign: "center", color: Colors.gray, marginTop: 40 }}>Không có gói dịch vụ nào</Text>}
                />
            )}
        </SafeAreaView>
    );
}

type Category = {
    id: string;
    name: string;
    description: string;
};

type PackageStatus = "AVAILABLE" | "REJECTED" | "HAVE_REPORT" | "HIDDEN";

type ServicePackage = {
    id: string;
    packageTitle: string;
    packageContent: string;
    imageUrl: string;
    durationMinutes: number;
    price: number;
    categories: Category[];
    status: PackageStatus;
    rejectionReason: string | null;
    avgRating: number | null;
    totalReviews: number;
};

const TABS = [
    { key: "ALL", label: "Tất cả" },
    { key: "AVAILABLE", label: "Đã duyệt" },
    { key: "HIDDEN", label: "Chờ duyệt" },
    { key: "REJECTED", label: "Bị từ chối", color: Colors.error },
];

function getStatusBadge(status: PackageStatus) {
    if (status === "AVAILABLE") return { label: "Đã duyệt", color: Colors.green, icon: "check-circle" };
    if (status === "HIDDEN") return { label: "Chờ duyệt", color: Colors.yellow, icon: "clock-outline" };
    if (status === "REJECTED") return { label: "Bị từ chối", color: Colors.purple, textColor: Colors.white, icon: "close-circle" };
    return { label: status, color: Colors.gray };
}

function PackageCard({ pkg }: { pkg: ServicePackage }) {
    const badge = getStatusBadge(pkg.status);
    const categoryLabel = pkg.categories?.[0]?.name ?? "";
    const [coverError, setCoverError] = useState(false);
    return (
        <TouchableOpacity style={styles.cardWrapper} onPress={() => router.push({ pathname: '/package-detail', params: { id: pkg.id } })}>
            <View style={styles.cardImageWrapper}>
                <Image
                    source={
                        coverError || !pkg.imageUrl
                            ? require("@/assets/images/placeholder.png")
                            : { uri: pkg.imageUrl }
                    }
                    style={styles.cardImage}
                    onError={(e) => {
                        setCoverError(true);
                    }}
                />

                {categoryLabel ? (
                    <View style={styles.categoryBadge}><Text style={styles.categoryBadgeText}>{categoryLabel}</Text></View>
                ) : null}

                <View style={[styles.statusBadge, { backgroundColor: badge.color, flexDirection: 'row', alignItems: 'center' }]}>
                    {badge.icon && (
                        <MaterialCommunityIcons name={badge.icon as any} size={16} color={badge.textColor || Colors.white} style={{ marginRight: 2 }} />
                    )}
                    <Text style={[styles.statusBadgeText, badge.textColor ? { color: badge.textColor } : {}]}>{badge.label}</Text>
                </View>
            </View>
            <View style={styles.cardContent}>
                <Text style={styles.cardTitle} numberOfLines={1}>{pkg.packageTitle}</Text>
                <Text style={styles.cardDesc} numberOfLines={2}>{pkg.packageContent}</Text>
                {pkg.status === "REJECTED" && pkg.rejectionReason && (
                    <View style={styles.rejectReasonBox}>
                        <Text style={styles.rejectReasonTitle}>Lý do từ chối: <Text style={styles.rejectReasonText}>{pkg.rejectionReason}</Text></Text>
                    </View>
                )}
                <View style={styles.cardMetaRow}>
                    <Text style={styles.cardPrice}>{pkg.price.toLocaleString()} ₫</Text>
                    <View style={{flexDirection: "row", alignItems: "center"}}>
                        <Clock size={16} color={Colors.gray}/>
                        <Text style={styles.cardDuration}>{pkg.durationMinutes} phút</Text>
                    </View>
                    
                </View>
                {(pkg.status === "AVAILABLE" || pkg.status === "HIDDEN") && (
                    <View style={styles.cardRatingRow}>
                        <MaterialIcons name="star" size={18} color={Colors.yellow} />
                        <Text style={styles.cardRating}>{pkg.avgRating ? pkg.avgRating.toFixed(1) : "-"}</Text>
                        <Text style={styles.cardReviewCount}>({pkg.totalReviews ?? 0} đánh giá)</Text>
                    </View>
                )}
            </View>
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
        color: Colors.black,
        fontSize: 18,
    },
    addBtn: {
        width: 28,
        height: 28,
        alignItems: "center",
        justifyContent: "center",
    },
    tabsRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 10,
        paddingVertical: 10,
        backgroundColor: Colors.grayBackground,
    },
    tabBtn: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: Colors.white,
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 6,
        marginRight: 8,
    },
    tabBtnActive: {
        backgroundColor: Colors.primary,
    },
    tabLabel: {
        color: Colors.primary,
        fontFamily: "inter",
        fontSize: 15,
        marginRight: 6,
    },
    tabLabelActive: {
        color: Colors.white,
    },
    tabCount: {
        backgroundColor: Colors.grayBackground,
        borderRadius: 10,
        paddingHorizontal: 7,
        paddingVertical: 2,
        marginLeft: 2,
    },
    tabCountActive: {
        backgroundColor: Colors.purple,
    },
    cardWrapper: {
        backgroundColor: Colors.white,
        borderRadius: 16,
        marginBottom: 18,
        overflow: "hidden",
        shadowColor: Colors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
    },
    cardImageWrapper: {
        position: "relative",
        width: "100%",
        height: 140,
        backgroundColor: Colors.grayBackground,
    },
    cardImage: {
        width: "100%",
        height: "100%",
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
    },
    categoryBadge: {
        position: "absolute",
        top: 10,
        left: 10,
        backgroundColor: Colors.purple,
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 3,
    },
    categoryBadgeText: {
        color: Colors.white,
        fontFamily: "inter",
        fontSize: 13,
    },
    statusBadge: {
        position: "absolute",
        top: 10,
        right: 10,
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 3,
    },
    statusBadgeText: {
        color: Colors.white,
        fontWeight: "600",
        fontSize: 13,
    },
    cardContent: {
        padding: 14,
    },
    rejectReasonBox: {
        backgroundColor: '#ffeaea',
        borderRadius: 8,
        padding: 8,
        marginBottom: 8,
        marginTop: 2,
    },
    rejectReasonTitle: {
        color: Colors.error,
        fontWeight: 'bold',
        fontSize: 14,
    },
    rejectReasonText: {
        color: Colors.error,
        fontWeight: 'normal',
        fontSize: 14,
    },
    cardTitle: {
        fontWeight: "bold",
        fontSize: 16,
        color: Colors.black,
        marginBottom: 4,
    },
    cardDesc: {
        color: Colors.gray,
        fontSize: 14,
        fontFamily: "inter",
        marginBottom: 8,
    },
    cardMetaRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 6,
        gap: 12,
    },
    cardPrice: {
        color: Colors.green,
        fontFamily: "inter",
        fontSize: 15,
    },
    cardDuration: {
        color: Colors.gray,
        fontSize: 14,
        marginLeft: 3,
        fontFamily: "inter",
    },
    cardRatingRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    cardRating: {
        color: Colors.yellow,
        fontFamily: "inter",
        fontSize: 15,
        marginLeft: 4,
    },
    cardReviewCount: {
        color: Colors.gray,
        fontSize: 12,
        marginLeft: 4,
        fontFamily: "inter",
    },
});