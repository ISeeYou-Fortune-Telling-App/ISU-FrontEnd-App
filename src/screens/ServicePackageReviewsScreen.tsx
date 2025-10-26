import Colors from "@/src/constants/colors";
import { router, useLocalSearchParams } from "expo-router";
import { ArrowLeft, Calendar, Image as ImageIcon, Send, ThumbsDown, ThumbsUp } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const categoryColors = [
  Colors.categoryColors.tarot.icon,
  Colors.categoryColors.elements.icon,
  Colors.categoryColors.physiognomy.icon,
  Colors.categoryColors.zodiac.icon,
  Colors.categoryColors.palmistry.icon,
];

const mockServicePackageDetail = {
  packageId: "1bd59501-f981-4cf0-90ed-0c63a4235b5f",
  totalReviews: 143,
  reviews: [
    {
      review_id: "1",
      ref_review_id: null,
      comment: "Thầy bói hay nha, tôi đã thử dịch vụ của thầy và rất ấn tượng với khả năng dự đoán chính xác về tương lai. Thầy có thể nhìn thấu được những điều mà tôi đang suy nghĩ và lo lắng. Rất đáng tin cậy và chuyên nghiệp trong cách tư vấn.",
      reviewedAt: "2024-08-15T10:00:00.000Z",
      customer: {
        customerName: "An Nghiện Bói",
        customerAvatar: "https://i.pravatar.cc/150?u=a042581f4e29026704e"
      }
    },
    {
      review_id: "2",
      ref_review_id: "1",
      comment: "Cảm ơn bạn đã đánh giá cao! Tôi rất vui khi dịch vụ của chúng tôi có thể giúp ích được cho bạn. Nếu bạn cần thêm thông tin gì khác, đừng ngần ngại liên hệ với chúng tôi nhé. Chúng tôi luôn sẵn sàng hỗ trợ.",
      reviewedAt: "2024-08-15T10:10:00.000Z",
      customer: {
        customerName: "Thầy Bói ABC",
        customerAvatar: "https://i.pravatar.cc/150?u=b042581f4e29026704f"
      }
    },
    {
      review_id: "3",
      ref_review_id: "2",
      comment: "Thầy có thể cho tôi hỏi thêm về cách tính toán số mệnh không? Tôi nghe nói phương pháp bói toán của thầy rất đặc biệt và chính xác. Mong thầy có thể giải thích thêm về quy trình này để tôi hiểu rõ hơn.",
      reviewedAt: "2024-08-15T10:15:00.000Z",
      customer: {
        customerName: "Nguyen Van A",
        customerAvatar: "https://i.pravatar.cc/150?u=c042581f4e29026704g"
      }
    },
    {
      review_id: "4",
      ref_review_id: "3",
      comment: "Tất nhiên rồi! Phương pháp của chúng tôi dựa trên sự kết hợp giữa khoa học và nghệ thuật bói toán truyền thống. Mỗi người đều có một bản đồ số mệnh riêng biệt được tính toán từ ngày sinh và các yếu tố khác. Đây là một quá trình rất phức tạp và đòi hỏi sự chính xác cao.",
      reviewedAt: "2024-08-15T10:20:00.000Z",
      customer: {
        customerName: "Thầy Bói ABC",
        customerAvatar: "https://i.pravatar.cc/150?u=b042581f4e29026704f"
      }
    },
    {
      review_id: "5",
      ref_review_id: "4",
      comment: "Nghe thú vị lắm! Tôi cũng muốn thử dịch vụ này. Thầy có thể cho biết giá cả và thời gian thực hiện không? Tôi đang cân nhắc đăng ký cho cả gia đình mình. Bao gồm mẹ và các con nữa.",
      reviewedAt: "2024-08-15T10:25:00.000Z",
      customer: {
        customerName: "Tran Thi B",
        customerAvatar: "https://i.pravatar.cc/150?u=d042581f4e29026704h"
      }
    },
    {
      review_id: "6",
      ref_review_id: "5",
      comment: "Giá cả phụ thuộc vào gói dịch vụ bạn chọn. Chúng tôi có gói cơ bản từ 500k, gói nâng cao 1.2 triệu và gói VIP 2.5 triệu. Thời gian thực hiện khoảng 30-45 phút cho mỗi người. Với gói gia đình sẽ có ưu đãi đặc biệt.",
      reviewedAt: "2024-08-15T10:30:00.000Z",
      customer: {
        customerName: "Thầy Bói ABC",
        customerAvatar: "https://i.pravatar.cc/150?u=b042581f4e29026704f"
      }
    },
    {
      review_id: "7",
      ref_review_id: "6",
      comment: "Giá cả hợp lý lắm! Tôi sẽ đăng ký gói nâng cao cho cả nhà. Cảm ơn thầy đã tư vấn chi tiết. Mong được phục vụ bởi thầy trong thời gian sớm nhất. Sẽ liên hệ qua số điện thoại để đặt lịch.",
      reviewedAt: "2024-08-15T10:35:00.000Z",
      customer: {
        customerName: "Tran Thi B",
        customerAvatar: "https://i.pravatar.cc/150?u=d042581f4e29026704h"
      }
    },
    {
      review_id: "8",
      ref_review_id: "7",
      comment: "Rất vui khi được đón tiếp bạn và gia đình! Chúng tôi sẽ sắp xếp lịch hẹn phù hợp nhất. Xin vui lòng để lại thông tin liên hệ để chúng tôi có thể liên hệ xác nhận. Dịch vụ của chúng tôi đảm bảo tính bảo mật tuyệt đối.",
      reviewedAt: "2024-08-15T10:40:00.000Z",
      customer: {
        customerName: "Thầy Bói ABC",
        customerAvatar: "https://i.pravatar.cc/150?u=b042581f4e29026704f"
      }
    },
    {
      review_id: "9",
      ref_review_id: "8",
      comment: "Đã gửi thông tin liên hệ qua tin nhắn riêng. Mong thầy xác nhận sớm để tôi có thể sắp xếp thời gian. Cảm ơn thầy rất nhiều! Rất mong được trải nghiệm dịch vụ chất lượng cao từ thầy.",
      reviewedAt: "2024-08-15T10:45:00.000Z",
      customer: {
        customerName: "Tran Thi B",
        customerAvatar: "https://i.pravatar.cc/150?u=d042581f4e29026704h"
      }
    },
    {
      review_id: "10",
      ref_review_id: null,
      comment: "Thầy bói flop quá, bói 1 tuần trúng số mà một tháng r còn chưa được. Thất vọng lắm, không nên tin vào những lời hứa hão này. Dịch vụ tệ, thái độ phục vụ kém, không chuyên nghiệp chút nào.",
      reviewedAt: "2024-08-15T10:05:00.000Z",
      customer: {
        customerName: "Anh Lý",
        customerAvatar: "https://i.pravatar.cc/150?u=a042581f4e29026704e"
      }
    },
        {
      review_id: "11",
      ref_review_id: "9",
      comment: "Đã gửi thông tin liên hệ qua tin nhắn riêng. Mong thầy xác nhận sớm để tôi có thể sắp xếp thời gian. Cảm ơn thầy rất nhiều! Rất mong được trải nghiệm dịch vụ chất lượng cao từ thầy.",
      reviewedAt: "2024-08-15T10:45:00.000Z",
      customer: {
        customerName: "Tran Thi B",
        customerAvatar: "https://i.pravatar.cc/150?u=d042581f4e29026704h"
      }
    },
        {
      review_id: "12",
      ref_review_id: "11",
      comment: "Đã gửi thông tin liên hệ qua tin nhắn riêng. Mong thầy xác nhận sớm để tôi có thể sắp xếp thời gian. Cảm ơn thầy rất nhiều! Rất mong được trải nghiệm dịch vụ chất lượng cao từ thầy.",
      reviewedAt: "2024-08-15T10:45:00.000Z",
      customer: {
        customerName: "Tran Thi B",
        customerAvatar: "https://i.pravatar.cc/150?u=d042581f4e29026704h"
      }
    },
        {
      review_id: "13",
      ref_review_id: "12",
      comment: "Đã gửi thông tin liên hệ qua tin nhắn riêng. Mong thầy xác nhận sớm để tôi có thể sắp xếp thời gian. Cảm ơn thầy rất nhiều! Rất mong được trải nghiệm dịch vụ chất lượng cao từ thầy.",
      reviewedAt: "2024-08-15T10:45:00.000Z",
      customer: {
        customerName: "Tran Thi B",
        customerAvatar: "https://i.pravatar.cc/150?u=d042581f4e29026704h"
      }
    },
  ],
};


const ServicePackageReviewsScreen = () => {
  const { id, rootReviewId } = useLocalSearchParams<{ id: string; rootReviewId?: string }>();
  const [servicePackage, setServicePackage] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedReviews, setExpandedReviews] = useState<Set<string>>(new Set());
  const [expandedText, setExpandedText] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchReviews = async () => {
      // MOCK DATA USAGE
      setServicePackage(mockServicePackageDetail);
      setLoading(false);
      return;
    };

    fetchReviews();
  }, [id]);

  const getRepliesForReview = (reviewId: string) => {
    return servicePackage?.reviews?.filter((review: any) => review.ref_review_id === reviewId) || [];
  };

  const toggleReplies = (reviewId: string) => {
    setExpandedReviews(prev => {
      const newSet = new Set(prev);
      if (newSet.has(reviewId)) {
        newSet.delete(reviewId);
      } else {
        newSet.add(reviewId);
      }
      return newSet;
    });
  };

  const toggleTextExpansion = (reviewId: string) => {
    setExpandedText(prev => {
      const newSet = new Set(prev);
      if (newSet.has(reviewId)) {
        newSet.delete(reviewId);
      } else {
        newSet.add(reviewId);
      }
      return newSet;
    });
  };

  const renderReviewItem = ({ item, depth = 0, colorIndex = 0 }: { item: any; depth?: number; colorIndex?: number }) => {
    const MAX_DEPTH = 5; // Maximum nesting levels before navigating to new screen
    const currentColor = categoryColors[colorIndex % categoryColors.length];
    const marginLeft = depth * 10; // Small margin left for nested comments
    const avatarStyle = styles.avatar;
    const commentContainerStyle = (item.ref_review_id && !(rootReviewId && item.review_id === rootReviewId))
      ? [styles.commentContainer, { marginLeft, borderLeftWidth: 3, borderLeftColor: currentColor, paddingLeft: 4 }]
      : [styles.commentContainer, { marginLeft }];
    const replies = getRepliesForReview(item.review_id);
    const isExpanded = expandedReviews.has(item.review_id);
    const isTextExpanded = expandedText.has(item.review_id);

    return (
      <View>
        <View style={commentContainerStyle}>
          <Image source={{ uri: item.customer.customerAvatar }} style={avatarStyle} />
          <View style={styles.commentContent}>
            <Text style={styles.customerName}>{item.customer.customerName}</Text>
            <TouchableOpacity onPress={() => toggleTextExpansion(item.review_id)}>
              <Text style={styles.commentText} numberOfLines={isTextExpanded ? undefined : 3}>
                {item.comment}
              </Text>
            </TouchableOpacity>
            <View style={styles.commentFooter}>
              <Calendar size={14} color="gray" />
              <Text style={styles.commentDate}>{new Date(item.reviewedAt).toLocaleDateString('vi-VN')}</Text>
              <TouchableOpacity>
                <Text style={styles.replyButton}>Trả lời</Text>
              </TouchableOpacity>
              {replies.length > 0 && depth < MAX_DEPTH && !rootReviewId && (
                <TouchableOpacity onPress={() => toggleReplies(item.review_id)} style={styles.viewRepliesButton}>
                  <Text style={styles.viewRepliesText}>
                    {isExpanded ? 'Ẩn trả lời' : `Xem trả lời (${replies.length})`}
                  </Text>
                </TouchableOpacity>
              )}
              {replies.length > 0 && depth >= MAX_DEPTH && (
                <TouchableOpacity 
                  onPress={() => router.push({
                    pathname: '/service-package-reviews',
                    params: { id: id, rootReviewId: item.review_id }
                  })} 
                  style={styles.viewRepliesButton}
                >
                  <Text style={styles.viewRepliesText}>
                    Xem thêm trả lời ({replies.length})
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
        {(isExpanded || rootReviewId) && depth < MAX_DEPTH && replies.map((reply: any, index: number) => (
          <View key={reply.review_id}>
            {renderReviewItem({ item: reply, depth: depth + 1, colorIndex: depth })}
          </View>
        ))}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeAreaView}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color="black" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Bình luận</Text>
          <View style={styles.headerPlaceholder} />
        </View>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeAreaView}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color="black" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Bình luận</Text>
          <View style={styles.headerPlaceholder} />
        </View>
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeAreaView}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color="black" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {rootReviewId ? 'Trả lời' : 'Bình luận'}
        </Text>
        <View style={styles.headerPlaceholder} /> 
      </View>
      {!rootReviewId && (
        <View style={styles.statsContainer}>
          <View style={styles.likesContainer}>
            <View style={[styles.likeIconCircle, { backgroundColor: '#E7F3FF' }]}>
              <ThumbsUp size={16} color="#1877F2" />
            </View>
            <Text style={styles.likes}>1.2k</Text>
            <View style={[styles.dislikeIconCircle, { backgroundColor: '#FFF8DC' }]}>
              <ThumbsDown size={16} color="#FBCB0A" />
            </View>
            <Text style={styles.dislikes}>200m</Text>
          </View>
          <Text style={styles.totalComments}>{servicePackage?.totalReviews || 0} bình luận</Text>
        </View>
      )}
      <FlatList
        data={rootReviewId 
          ? servicePackage?.reviews?.filter((review: any) => review.review_id === rootReviewId) || []
          : servicePackage?.reviews?.filter((review: any) => review.ref_review_id === null) || []
        }
        renderItem={({ item, index }) => renderReviewItem({ 
          item, 
          depth: 0, 
          colorIndex: index 
        })}
        keyExtractor={(item) => item.review_id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={<Text style={styles.emptyText}>Chưa có bình luận nào.</Text>}
      />
      {!rootReviewId && (
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            placeholder="Nhập bình luận của bạn..."
            placeholderTextColor="gray"
          />
          <TouchableOpacity style={styles.iconButton}>
            <ImageIcon size={24} color="gray" />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.iconButton, styles.sendButton]}>
            <Send size={24} color="white" />
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeAreaView: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: Colors.white,
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  headerPlaceholder: {
    width: 24,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: 'red',
    fontSize: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  likesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  likeIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dislikeIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  likes: {
    color: 'gray',
    marginLeft: 6,
    fontSize: 14,
  },
  dislikes: {
    color: 'gray',
    marginLeft: 6,
    fontSize: 14,
  },
  totalComments: {
    color: 'gray',
    fontSize: 14,
  },
  listContent: {
    paddingHorizontal: 8,
    paddingBottom: 16,
  },
  commentContainer: {
    flexDirection: 'row',
    paddingVertical: 4,
    marginVertical: 4
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 4,
  },
  commentContent: {
    flex: 1,
    backgroundColor: '#f0f2f5',
    borderRadius: 12,
    padding: 8,
  },
  customerName: {
    fontWeight: 'bold',
    fontSize: 15,
  },
  commentText: {
    marginTop: 4,
    fontSize: 15,
  },
  commentFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  commentDate: {
    color: 'gray',
    fontSize: 12,
    marginLeft: 4,
  },
  replyButton: {
    color: 'gray',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    backgroundColor: Colors.white,
  },
  textInput: {
    flex: 1,
    height: 40,
    backgroundColor: '#f0f2f5',
    borderRadius: 20,
    paddingHorizontal: 16,
    marginRight: 8,
  },
  iconButton: {
    padding: 8,
  },
  sendButton: {
    backgroundColor: Colors.primary,
    borderRadius: 20,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 32,
    color: 'gray',
  },
  viewRepliesButton: {
    marginLeft: 8,
  },
  viewRepliesText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: 'bold',
  }
});

export default ServicePackageReviewsScreen;
