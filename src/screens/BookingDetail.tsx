import { getBookingDetail } from "@/src/services/api";
import { MaterialIcons } from "@expo/vector-icons";
import dayjs from "dayjs";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import Colors from "../constants/colors";


export default function BookingDetailScreen() {
    const params = useLocalSearchParams();
    const bookingId = (params.bookingId ?? params.id) as string | undefined;
    const [loading, setLoading] = useState<boolean>(true);
    const [booking, setBooking] = useState<any | null>(null);

    const fetchBookingDetail = async (bookingId: string) => {
        try {
            setLoading(true);
            const res = await getBookingDetail(bookingId);
            const data = res?.data?.data ?? null;
            setBooking(data);
        } catch (err) {
            console.error("Failed to fetch booking detail", err);
            Alert.alert("Lỗi", "Không thể tải chi tiết lịch hẹn");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        if (bookingId) {
            fetchBookingDetail(bookingId);
        } else {
            setLoading(false);
        }
    }, [bookingId]);

    return (
        <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeAreaView}>
            <View style={styles.header}>
                <MaterialIcons name="arrow-back" size={28} color={Colors.black} onPress={() => router.back()} />
                <View style={styles.titleContainer}>
                    <Text variant="titleLarge" style={styles.title}>Chi tiết lịch hẹn</Text>
                </View>
                <View style={styles.headerPlaceholder} />
            </View>

            <ScrollView
                style={{ flex: 1 }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ padding: 12 }}
            >
                {loading ? (
                    <View style={{ padding: 24, alignItems: 'center' }}>
                        <ActivityIndicator size="large" color={Colors.primary} />
                    </View>
                ) : !booking ? (
                    <View style={{ padding: 24, alignItems: 'center' }}>
                        <Text style={{ marginBottom: 12 }}>Không tìm thấy lịch hẹn</Text>
                        <TouchableOpacity
                            style={[styles.secondaryButton, { paddingHorizontal: 24 }]}
                            onPress={() => bookingId ? fetchBookingDetail(bookingId) : null}
                        >
                            <Text>Thử lại</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View>
                        {/* Status card */}
                        <View style={styles.statusCard}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <MaterialIcons name="schedule" size={20} color={Colors.primary} />
                                    <View style={{ marginLeft: 8 }}>
                                        <Text style={{ fontWeight: '700' }}>Trạng thái lịch hẹn</Text>
                                        <Text style={{ color: '#6b7280' }}>Mã: {String(booking.id).slice(0, 8)}</Text>
                                    </View>
                                </View>
                                <View style={[styles.smallBadge, booking.status === 'COMPLETED' ? { backgroundColor: '#dcfce7' } : { backgroundColor: '#fee2e2' }]}>
                                    <Text style={{ fontWeight: '700', color: booking.status === 'COMPLETED' ? '#16a34a' : '#dc2626' }}>{booking.status === 'CONFIRMED' ? 'Chờ xác nhận' : booking.status}</Text>
                                </View>
                            </View>
                            {booking.status === 'PENDING' && (
                                <View style={styles.infoBox}>
                                    <Text style={{ color: Colors.primary }}>Lịch hẹn đang chờ xác nhận. Bạn sẽ nhận được thông báo khi được duyệt.</Text>
                                </View>
                            )}
                        </View>

                        {/* Seer info */}
                        <View style={styles.card}>
                            <Text style={styles.cardTitle}>Thông tin thầy bói</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                                <Image source={booking.seer?.avatarUrl ? { uri: booking.seer.avatarUrl } : require('@/assets/images/user-placeholder.png')} style={styles.avatarLarge} />
                                <View style={{ marginLeft: 12, flex: 1 }}>
                                    <Text style={{ fontWeight: '700' }}>{booking.seer?.fullName}</Text>
                                    <Text style={{ marginTop: 6, color: '#f59e0b' }}>⭐ {booking.seer?.avgRating ?? '-'}</Text>
                                </View>
                            </View>
                        </View>

                        {/* Booking detail */}
                        <View style={styles.card}>
                            <Text style={styles.cardTitle}>Chi tiết lịch hẹn</Text>
                            <Text style={{ fontWeight: '700', marginTop: 8 }}>{booking.servicePackage?.packageTitle}</Text>
                            <Text style={{ marginTop: 8, color: '#374151' }}>{booking.servicePackage?.packageContent}</Text>

                            <View style={{ flexDirection: 'row', marginTop: 10, flexWrap: 'wrap' }}>
                                {(booking.servicePackage?.categories || []).map((c: string, idx: number) => (
                                    <View key={idx} style={[styles.tag]}>
                                        <Text style={{ color: '#374151' }}>{c}</Text>
                                    </View>
                                ))}
                            </View>

                            <View style={{ flexDirection: 'row', marginTop: 12 }}>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ color: '#6b7280' }}>Ngày</Text>
                                    <Text style={{ marginTop: 6 }}>{dayjs(booking.scheduledTime).format('dddd, DD/MM/YYYY')}</Text>
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ color: '#6b7280' }}>Thời gian</Text>
                                    <Text style={{ marginTop: 6 }}>{dayjs(booking.scheduledTime).format('HH:mm')}</Text>
                                </View>
                            </View>

                            <View style={{ flexDirection: 'row', marginTop: 12 }}>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ color: '#6b7280' }}>Giá tiền</Text>
                                    <Text style={{ marginTop: 6, color: '#10B981', fontWeight: '700' }}>{booking.servicePackage?.price?.toLocaleString('vi-VN')} VND</Text>
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ color: '#6b7280' }}>Thời lượng</Text>
                                    <Text style={{ marginTop: 6 }}>{booking.servicePackage?.durationMinutes} phút</Text>
                                </View>
                            </View>
                        </View>

                        {/* Customer note */}
                        {booking.additionalNote ? (
                            <View style={styles.card}>
                                <Text style={styles.cardTitle}>Ghi chú từ Khách hàng</Text>
                                <Text style={{ marginTop: 8, color: '#374151' }}>{booking.additionalNote}</Text>
                            </View>
                        ) : null}

                        {/* Payment */}
                        <View style={styles.card}>
                            <Text style={styles.cardTitle}>Thanh toán</Text>
                            {booking.bookingPaymentInfos && booking.bookingPaymentInfos.length > 0 ? (
                                (() => {
                                    const p = booking.bookingPaymentInfos[0];
                                    return (
                                        <View style={{ marginTop: 8 }}>
                                            <Text>Phương thức: {p.paymentMethod}</Text>
                                            <Text style={{ marginTop: 6 }}>Trạng thái: <Text style={{ color: p.paymentStatus === 'COMPLETED' ? '#16a34a' : '#dc2626' }}>{p.paymentStatus === 'COMPLETED' ? 'Đã thanh toán' : p.paymentStatus}</Text></Text>
                                            <Text style={{ marginTop: 6 }}>Tổng tiền: {p.amount?.toLocaleString('vi-VN')} VND</Text>
                                        </View>
                                    );
                                })()
                            ) : (
                                <Text style={{ marginTop: 8 }}>Chưa có thông tin thanh toán</Text>
                            )}
                        </View>

                        {/* History */}
                        <View style={styles.card}>
                            <Text style={styles.cardTitle}>Lịch sử</Text>
                            <View style={{ marginTop: 8 }}>
                                <Text> Lịch hẹn được tạo</Text>
                                <Text style={{ color: '#6b7280', marginTop: 6 }}>{dayjs(booking.createdAt).format('HH:mm:ss DD/MM/YYYY')}</Text>
                            </View>
                        </View>
                    </View>
                )}
            </ScrollView>

            {/* Footer actions */}
            <View style={styles.footer} pointerEvents="box-none">
                <View style={styles.footerInner}>
                    <TouchableOpacity
                        style={styles.secondaryButton}
                        onPress={() => {
                            Alert.alert('Thông báo', 'Chức năng đổi lịch chưa sẵn sàng');
                        }}
                    >
                        <Text>Đổi lịch</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.dangerButton}
                        onPress={() => {
                            Alert.alert('Xác nhận', 'Bạn có chắc muốn huỷ lịch này?', [
                                { text: 'Không' },
                                { text: 'Có', onPress: () => router.back(), style: 'destructive' }
                            ]);
                        }}
                    >
                        <Text style={{ color: 'white', fontWeight: '700' }}>Hủy lịch</Text>
                    </TouchableOpacity>
                </View>
            </View>

        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeAreaView: {
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
    statusCard: {
        backgroundColor: 'white',
        padding: 12,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        marginBottom: 12,
    },
    smallBadge: {
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 8,
    },
    infoBox: {
        marginTop: 12,
        padding: 10,
        backgroundColor: '#eef2ff',
        borderRadius: 8,
    },
    card: {
        backgroundColor: 'white',
        padding: 12,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        marginBottom: 12,
    },
    cardTitle: {
        color: '#6b7280',
        fontWeight: '700'
    },
    avatarLarge: {
        width: 64,
        height: 64,
        borderRadius: 40,
        borderWidth: 1,
        borderColor: Colors.borderGray,
    },
    tag: {
        backgroundColor: '#f3f4f6',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 12,
        marginRight: 8,
        marginBottom: 8,
    },
    footer: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        padding: 12,
        backgroundColor: 'transparent',
    },
    footerInner: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    secondaryButton: {
        flex: 1,
        marginRight: 8,
        paddingVertical: 12,
        backgroundColor: 'white',
        borderRadius: 10,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    dangerButton: {
        flex: 1,
        marginLeft: 8,
        paddingVertical: 12,
        backgroundColor: '#ef4444',
        borderRadius: 10,
        alignItems: 'center',
    },
});