import Colors from "@/src/constants/colors";
import { cancelBooking, confirmBooking, getBookingDetail, submitBookingReview } from "@/src/services/api";
import { MaterialIcons } from "@expo/vector-icons";
import dayjs from "dayjs";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import * as SecureStore from 'expo-secure-store';
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, AppState, Image, KeyboardAvoidingView, Linking, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { Text, TextInput } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";


export default function BookingDetailScreen() {
    const params = useLocalSearchParams();
    const bookingId = (params.bookingId ?? params.id) as string | undefined;
    const [loading, setLoading] = useState<boolean>(true);
    const [booking, setBooking] = useState<any | null>(null);
    const [avatarError, setAvatarError] = useState(false);
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [review, setReview] = useState<any | null>(null);
    const [role, setRole] = useState<string>("");
    const [redirectUrl, setRedirectUrl] = useState("");

    const fetchBookingDetail = async (bookingId: string) => {
        try {
            setLoading(true);
            const res = await getBookingDetail(bookingId);
            const data = res?.data?.data ?? null;
            setBooking(data);
            setReview(data?.review);
        } catch (err) {
            console.error("Failed to fetch booking detail", err);
            Alert.alert("Lỗi", "Không thể tải chi tiết lịch hẹn");
        } finally {
            setLoading(false);
        }
    }

    const handleSubmitReview = async () => {
        if (!bookingId) return;
        if (rating <= 0) {
            Alert.alert("Vui lòng chọn số sao đánh giá");
            return;
        }

        try {
            setSubmitting(true);
            const res = await submitBookingReview(bookingId, {
                rating,
                comment: comment?.trim() || undefined,
            });
            const newReview = res?.data?.data;
            if (newReview) setReview(newReview);
            Alert.alert("Thành công", "Cảm ơn bạn đã gửi đánh giá!");
            setRating(0);
            setComment("");
        } catch (err) {
            console.error("Error submitting review", err);
            Alert.alert("Lỗi", "Không thể gửi đánh giá. Vui lòng thử lại.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleCancelBooking = async () => {
        try {
            const res = await cancelBooking(bookingId);
            Alert.alert("Thành công", "Lịch hẹn đã được huỷ", [
                {
                    text: "OK",
                    onPress: () => router.back(),
                },
            ]);
        } catch (err) {
            Alert.alert("Lỗi", "Không thể huỷ lịch hẹn. Vui lòng thử lại.");
            console.error("Error cancelling booking", err);
        }
    }

    const handleSeerCancelBooking = async () => {
        try {
            const status = {
                status: "CANCELED"
            }
            const res = await confirmBooking(bookingId, status);
            Alert.alert("Thành công", "Lịch hẹn đã được huỷ", [
                {
                    text: "OK",
                    onPress: () => router.back(),
                },
            ]);
        } catch (err) {
            Alert.alert("Lỗi", "Không thể huỷ lịch hẹn. Vui lòng thử lại.");
            console.error("Error cancelling booking", err);
        }
    }

    const handleConfirmBooking = async () => {
        try {
            const status = {
                status: "CONFIRMED"
            }
            const res = await confirmBooking(bookingId, status);
            Alert.alert("Thành công", "Lịch hẹn đã xác nhận", [
                {
                    text: "OK",
                    onPress: () => router.back(),
                },
            ]);
        } catch (err) {
            Alert.alert("Lỗi", "Không thể xác nhận lịch hẹn. Vui lòng thử lại.");
            console.error("Error confirming booking", err);
        }
    }

    const renderReviewCard = (review: any) => (
        <View style={styles.reviewCard}>
            <View style={{ flex: 1 }}>
                <Text style={styles.reviewDate}>
                    {dayjs(review.reviewedAt).format("DD/MM/YYYY HH:mm")}
                </Text>
            </View>

            <View style={{ flexDirection: "row", marginVertical: 6 }}>
                {[1, 2, 3, 4, 5].map((i) => (
                    <MaterialIcons
                        key={i}
                        name={i <= Math.round(review.rating) ? "star" : "star-border"}
                        size={32}
                        color={i <= Math.round(review.rating) ? "#FFD700" : "#9CA3AF"}
                    />
                ))}
            </View>

            {review.comment ? (
                <Text style={styles.reviewComment}>{review.comment}</Text>
            ) : null}
        </View>
    );

    const renderStars = () => (
        <View style={{ flexDirection: "row", marginVertical: 8 }}>
            {[1, 2, 3, 4, 5].map((i) => (
                <TouchableOpacity
                    key={i}
                    onPress={() => setRating(i)}
                    disabled={submitting}
                >
                    <MaterialIcons
                        name={i <= rating ? "star" : "star-border"}
                        size={32}
                        color={i <= rating ? "#FFD700" : "#9CA3AF"}
                    />
                </TouchableOpacity>
            ))}
        </View>
    );

    useFocusEffect(
        useCallback(() => {
            (async () => {
                try {
                    const storedRole = await SecureStore.getItemAsync("userRole");
                    if (storedRole) setRole(storedRole);
                } catch (e) {
                    console.warn("Unable to read userRole from SecureStore", e);
                }
            })();
            if (bookingId) {
                fetchBookingDetail(bookingId);
            } else {
                setLoading(false);
            }
        }, [bookingId])
    );

    useEffect(() => {
        const subscription = AppState.addEventListener('change', (nextAppState) => {
            if (nextAppState === 'active' && bookingId) {
                // App has come to the foreground, refresh booking data
                fetchBookingDetail(bookingId);
            }
        });

        return () => {
            subscription?.remove();
        };
    }, [bookingId]);

    return (
        <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeAreaView}>
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 24}>

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
                                        <MaterialIcons name="schedule" size={22} color={Colors.primary} />
                                        <View style={{ marginLeft: 8 }}>
                                            <Text style={{ fontWeight: '700' }}>Trạng thái lịch hẹn</Text>
                                            <Text style={{ color: '#6b7280', fontFamily: "inter" }}>Mã: {String(booking.id).slice(0, 8)}</Text>
                                        </View>
                                    </View>
                                    <View style={[styles.smallBadge, booking.status === "COMPLETED" ? { backgroundColor: '#dcfce7' } : booking.status === "CONFIRMED" ? { backgroundColor: '#e0e7ff' } : booking.status === "PENDING" ? { backgroundColor: '#faffe0ff' } : { backgroundColor: '#fee2e2' }]}>
                                        <Text style={{ fontWeight: '700', color: booking.status === "COMPLETED" ? '#16a34a' : booking.status === 'CONFIRMED' ? Colors.primary : booking.status === "PENDING" ? Colors.brightYellow : '#dc2626' }}>
                                            {booking.status === 'COMPLETED' && 'Hoàn thành'}
                                            {booking.status === 'CONFIRMED' && 'Đã xác nhận'}
                                            {booking.status === 'PENDING' && 'Chờ xác nhận'}
                                            {booking.status === 'CANCELED' && 'Đã hủy'}
                                            {booking.status === 'FAILED' && 'Thất bại'}
                                        </Text>
                                    </View>
                                </View>
                                {booking.status === 'PENDING' && (
                                    <View style={styles.infoBox}>
                                        <Text style={{ color: Colors.primary, fontFamily: "inter" }}>Lịch hẹn đang chờ xác nhận. Bạn sẽ nhận được thông báo khi được duyệt.</Text>
                                    </View>
                                )}
                            </View>

                            {/* Seer info */}
                            {role === "CUSTOMER" &&
                                <View style={styles.card}>
                                    <Text style={styles.cardTitle}>Thông tin thầy bói</Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                                        <Image
                                            source={
                                                avatarError || !booking.seer?.avatarUrl
                                                    ? require('@/assets/images/user-placeholder.png')
                                                    : { uri: booking.seer?.avatarUrl }
                                            }
                                            style={styles.avatarLarge}
                                            onError={(e) => {
                                                setAvatarError(true);
                                            }}
                                        />
                                        <View style={{ marginLeft: 12, flex: 1 }}>
                                            <Text style={{ fontWeight: '700' }}>{booking.seer?.fullName}</Text>
                                            <Text style={{ marginTop: 6, color: '#f59e0b', fontFamily: "inter" }}>⭐ {booking.seer?.avgRating ?? '-'}</Text>
                                        </View>
                                    </View>
                                </View>
                            }

                            {/* Customer info */}
                            {role === "SEER" &&
                                <View style={styles.card}>
                                    <Text style={styles.cardTitle}>Thông tin khách hàng</Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                                        <Image
                                            source={
                                                avatarError || !booking.customer?.avatarUrl
                                                    ? require('@/assets/images/user-placeholder.png')
                                                    : { uri: booking.customer?.avatarUrl }
                                            }
                                            style={styles.avatarLarge}
                                            onError={(e) => {
                                                console.log('Avatar image failed to load:', e.nativeEvent);
                                                setAvatarError(true);
                                            }}
                                        />
                                        <View style={{ marginLeft: 12, flex: 1 }}>
                                            <Text style={{ fontWeight: '700' }}>{booking.customer?.fullName}</Text>
                                        </View>
                                    </View>
                                </View>
                            }

                            {/* Booking detail */}
                            <View style={styles.card}>
                                <Text style={styles.cardTitle}>Chi tiết lịch hẹn</Text>
                                <Text style={{ fontWeight: '700', fontSize: 15, marginTop: 8 }}>{booking.servicePackage?.packageTitle}</Text>
                                <Text style={{ marginTop: 8, color: '#374151', fontFamily: "inter" }}>{booking.servicePackage?.packageContent}</Text>

                                <View style={{ flexDirection: 'row', marginTop: 10, flexWrap: 'wrap' }}>
                                    {(booking.servicePackage?.categories || []).map((c: string, idx: number) => (
                                        <View key={idx} style={[styles.tag]}>
                                            <Text style={{ color: '#374151', fontFamily: "inter" }}>{c}</Text>
                                        </View>
                                    ))}
                                </View>

                                <View style={{ flexDirection: 'row', marginTop: 12 }}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.infoTitle}>Ngày</Text>
                                        <Text style={styles.infoContent}>{dayjs(booking.scheduledTime).format('dddd, DD/MM/YYYY')}</Text>
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.infoTitle}>Thời gian</Text>
                                        <Text style={styles.infoContent}>{dayjs(booking.scheduledTime).format('HH:mm')}</Text>
                                    </View>
                                </View>

                                <View style={{ flexDirection: 'row', marginTop: 12 }}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.infoTitle}>Giá tiền</Text>
                                        <Text style={{ marginTop: 6, color: '#10B981', fontWeight: '700' }}>{booking.servicePackage?.price?.toLocaleString('vi-VN')} VND</Text>
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.infoTitle}>Thời lượng</Text>
                                        <Text style={styles.infoContent}>{booking.servicePackage?.durationMinutes} phút</Text>
                                    </View>
                                </View>
                            </View>

                            {/* Customer note */}
                            {booking.additionalNote ? (
                                <View style={styles.card}>
                                    <Text style={styles.cardTitle}>Ghi chú</Text>
                                    <Text style={styles.infoText}>{booking.additionalNote}</Text>
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
                                                <Text style={styles.infoText}>Phương thức: {p.paymentMethod}</Text>
                                                <Text style={styles.infoText}>Trạng thái: <Text style={[styles.infoText, {
                                                    color: p.paymentStatus === "COMPLETED" ? '#16a34a' :
                                                        p.paymentStatus === "FAILED" ? '#dc2626' :
                                                            p.paymentStatus === "REFUNDED" ? Colors.gray :
                                                                Colors.brightYellow
                                                }]}>
                                                    {
                                                        p.paymentStatus === "COMPLETED" ? 'Đã thanh toán' :
                                                            p.paymentStatus === "FAILED" ? 'Đã thất bại' :
                                                                p.paymentStatus === "REFUNDED" ? 'Đã hoàn tiền' :
                                                                    'Chờ thanh toán'
                                                    }</Text></Text>
                                                <Text style={styles.infoText}>Tổng tiền: {p.amount?.toLocaleString('vi-VN')} VNĐ</Text>
                                                {(p.paymentStatus === "PENDING" && p.approvalUrl && role == "CUSTOMER") && <TouchableOpacity style={styles.paymentButton} onPress={() => { Linking.openURL(p.approvalUrl) }}>
                                                    <Text style={{ color: Colors.white, fontFamily: "inter" }}>Thanh toán</Text>
                                                </TouchableOpacity>}
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
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#16a34a', marginRight: 8 }} />
                                        <Text> Lịch hẹn được tạo</Text>
                                    </View>
                                    <Text style={{ color: '#6b7280', marginTop: 6, marginLeft: 16 }}>{dayjs(booking.createdAt).format('HH:mm:ss DD/MM/YYYY')}</Text>
                                </View>
                                {booking.bookingPaymentInfos && booking.bookingPaymentInfos.length > 0 && (
                                    <View style={{ marginTop: 16 }}>
                                        {booking.bookingPaymentInfos.map((payment: any, index: number) => (
                                            <View key={index} style={{ marginTop: index > 0 ? 12 : 0, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#e5e7eb' }}>
                                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                    <View style={{ 
                                                        width: 8, 
                                                        height: 8, 
                                                        borderRadius: 4, 
                                                        backgroundColor: payment.paymentStatus === "COMPLETED" || payment.paymentStatus === "CONFIRMED" ? '#16a34a' :
                                                            payment.paymentStatus === "FAILED" || payment.paymentStatus === "CANCELED" ? '#dc2626' :
                                                                payment.paymentStatus === "PENDING" ? '#d97706' : '#374151',
                                                        marginRight: 8 
                                                    }} />
                                                    <Text>Chuyển {payment.amount?.toLocaleString('vi-VN')} qua {payment.paymentMethod}</Text>
                                                </View>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, marginLeft: 16 }}>
                                                    <View style={[styles.smallBadge, {
                                                        backgroundColor: payment.paymentStatus === "COMPLETED" || payment.paymentStatus === "CONFIRMED" ? '#dcfce7' :
                                                            payment.paymentStatus === "FAILED" || payment.paymentStatus === "CANCELED" ? '#fee2e2' :
                                                                payment.paymentStatus === "PENDING" ? '#fef3c7' : '#f3f4f6'
                                                    }]}>
                                                        <Text style={{
                                                            fontWeight: '700',
                                                            color: payment.paymentStatus === "COMPLETED" || payment.paymentStatus === "CONFIRMED" ? '#16a34a' :
                                                                payment.paymentStatus === "FAILED" || payment.paymentStatus === "CANCELED" ? '#dc2626' :
                                                                    payment.paymentStatus === "PENDING" ? '#d97706' : '#374151'
                                                        }}>
                                                            {payment.paymentStatus === 'COMPLETED' && 'Đã thanh toán'}
                                                            {payment.paymentStatus === 'CONFIRMED' && 'Đã xác nhận'}
                                                            {payment.paymentStatus === 'FAILED' && 'Thất bại'}
                                                            {payment.paymentStatus === 'CANCELED' && 'Đã hủy'}
                                                            {payment.paymentStatus === 'PENDING' && 'Chờ thanh toán'}
                                                            {payment.paymentStatus === 'REFUNDED' && 'Đã hoàn tiền'}
                                                        </Text>
                                                    </View>
                                                    {payment.failureReason && (
                                                        <Text style={{ marginLeft: 8, color: '#dc2626', fontSize: 12 }}>{payment.failureReason}</Text>
                                                    )}
                                                </View>
                                                <Text style={{ color: '#6b7280', marginTop: 6, marginLeft: 16 }}>{dayjs(payment.paymentTime).format('HH:mm:ss DD/MM/YYYY')}</Text>
                                            </View>
                                        ))}
                                    </View>
                                )}
                            </View>

                            {/* Review form + reviews */}
                            {booking.status === "COMPLETED" && role === "CUSTOMER" && !review && (
                                <View style={[styles.card, { marginBottom: 10 }]}>
                                    <Text style={styles.cardTitle}>Đánh giá</Text>
                                    {renderStars()}
                                    <View
                                        style={{
                                            flexDirection: "row",
                                            alignItems: "center",
                                            marginTop: 8,
                                            backgroundColor: "#F3F4F6",
                                            borderRadius: 10,
                                            paddingHorizontal: 8,
                                            paddingVertical: 4,
                                        }}
                                    >
                                        <TextInput
                                            style={{ flex: 1, padding: 8, marginRight: 8 }}
                                            placeholder="Nhập đánh giá của bạn..."
                                            value={comment}
                                            editable={!submitting}
                                            onChangeText={setComment}
                                            multiline
                                            mode="outlined"
                                        />
                                        <TouchableOpacity
                                            disabled={submitting}
                                            style={{
                                                padding: 8,
                                                borderRadius: 8,
                                                backgroundColor: submitting ? "#9CA3AF" : "#2563EB",
                                            }}
                                            onPress={handleSubmitReview}
                                        >
                                            {submitting ? (
                                                <ActivityIndicator color="#fff" />
                                            ) : (
                                                <MaterialIcons name="send" size={20} color="white" />
                                            )}
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            )}

                            {/* Render review */}
                            {review && (
                                <View style={[styles.card, { marginBottom: 10 }]}>
                                    <Text style={styles.cardTitle}>Đánh giá</Text>
                                    {renderReviewCard(review)}
                                </View>
                            )}
                        </View>
                    )}
                </ScrollView>

                {/* Footer actions */}
                <View style={styles.footer} pointerEvents="box-none">
                    <View style={styles.footerInner}>
                        {role === "SEER" && ["PENDING", "CONFIRMED"].includes(booking?.status) &&
                            <>
                                <TouchableOpacity style={styles.secondaryButton} onPress={() => { Alert.alert('Thông báo', 'Chức năng đổi lịch chưa sẵn sàng'); }}>
                                    <Text>Đổi lịch</Text>
                                </TouchableOpacity>

                                {booking.status === "PENDING" &&
                                    <TouchableOpacity style={styles.secondaryButton} onPress={() => {
                                        Alert.alert('Xác nhận', 'Bạn có chắc chắn không?', [
                                            { text: 'Không', style: "cancel" },
                                            { text: 'Có', style: "default", onPress: () => handleConfirmBooking() }
                                        ]);
                                    }}>
                                        <Text>Xác nhận lịch</Text>
                                    </TouchableOpacity>
                                }

                                <TouchableOpacity style={styles.dangerButton} onPress={() => {
                                    Alert.alert('Xác nhận', 'Bạn có chắc muốn huỷ lịch này?', [
                                        { text: 'Không', style: "cancel" },
                                        { text: 'Có', style: "default", onPress: () => handleSeerCancelBooking() }
                                    ]);
                                }}>
                                    <Text>Huỷ lịch</Text>
                                </TouchableOpacity>
                            </>
                        }
                        {role === "CUSTOMER" && ["PENDING", "CONFIRMED"].includes(booking?.status) &&
                            <TouchableOpacity
                                style={styles.dangerButton}
                                onPress={() => {
                                    Alert.alert('Xác nhận', 'Bạn có chắc muốn huỷ lịch này?', [
                                        { text: 'Không' },
                                        { text: 'Có', style: 'destructive', onPress: () => handleCancelBooking() }
                                    ]);
                                }}
                            >
                                <Text style={{ color: 'white', fontWeight: '700' }}>Hủy lịch</Text>
                            </TouchableOpacity>
                        }
                    </View>
                </View>
            </KeyboardAvoidingView>

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
        fontWeight: "bold",
        fontSize: 16
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
        paddingVertical: 12,
        backgroundColor: 'white',
        borderRadius: 10,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    paymentButton: {
        flex: 1,
        paddingVertical: 12,
        backgroundColor: Colors.green,
        borderRadius: 10,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        marginTop: 10
    },
    dangerButton: {
        flex: 1,
        paddingVertical: 12,
        backgroundColor: '#ef4444',
        borderRadius: 10,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    reviewCard: {
        marginTop: 10,
    },
    reviewAvatar: { width: 40, height: 40, borderRadius: 20 },
    reviewName: { fontWeight: "600", color: "#111827" },
    reviewDate: { fontSize: 12, color: "#6b7280" },
    reviewComment: { marginTop: 6, color: "#374151", fontFamily: "inter" },
    infoTitle: { color: '#6b7280', fontFamily: "inter" },
    infoContent: { marginTop: 6, fontFamily: "inter", fontSize: 12 },
    infoText: { marginTop: 8, color: '#374151', fontFamily: "inter" }
});