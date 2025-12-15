import Colors from "@/src/constants/colors";
import { getReviewReplies, getServicePackageDetail, getServicePackageInteractions, getServicePackageReviews, postServicePackageReview, updateServicePackageReview } from "@/src/services/api";
import { router, useLocalSearchParams } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { ArrowLeft, Calendar, MessageCircle, Send, ThumbsDown, ThumbsUp } from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Image, KeyboardAvoidingView, Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const categoryColors = [
  Colors.categoryColors.tarot.icon,
  Colors.categoryColors.elements.icon,
  Colors.categoryColors.physiognomy.icon,
  Colors.categoryColors.zodiac.icon,
  Colors.categoryColors.palmistry.icon,
];

const ServicePackageReviewsScreen = () => {
  const { id, rootReviewId, rootReview: rootReviewParam } = useLocalSearchParams<{ id: string; rootReviewId?: string; rootReview?: string }>();
  const [servicePackage, setServicePackage] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedReviews, setExpandedReviews] = useState<Set<string>>(new Set());
  const [expandedText, setExpandedText] = useState<Set<string>>(new Set());
  const [loadedReplies, setLoadedReplies] = useState<Map<string, any[]>>(new Map());
  const [loadingReplies, setLoadingReplies] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [comment, setComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [editingReview, setEditingReview] = useState<any>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const userId = await SecureStore.getItemAsync("userId");
        setCurrentUserId(userId);
        
        let packageDetail = null;
        if (!rootReviewId) {
          const detailResponse = await getServicePackageInteractions(id);
          packageDetail = detailResponse.data.data;
        }
        const commentNum = await (await getServicePackageDetail(id)).data?.data.totalReviews || 0;

        let response;
        if (rootReviewId) {
          response = await getReviewReplies(rootReviewId, { page: 1, limit: 15, sortType: 'asc', sortBy: 'createdAt' });
        } else {
          response = await getServicePackageReviews(id, { page: 1, limit: 15, sortType: 'desc', sortBy: 'createdAt' });
        }
        const data = response.data;
        const mappedReviews = data.data.map((review: any) => ({
          review_id: review.reviewId,
          ref_review_id: review.parentReviewId,
          comment: review.comment,
          reviewedAt: review.createdAt,
          userId: review.user.userId,
          customer: {
            customerName: review.user.fullName || review.user.username,
            customerAvatar: review.user.avatarUrl
          }
        }));
        setServicePackage({
          packageId: id,
          totalReviews: commentNum || packageDetail?.totalReviews || data.paging.total,
          reviews: mappedReviews,
          likeCount: packageDetail?.likeCount || 0,
          dislikeCount: packageDetail?.dislikeCount || 0
        });
        if (rootReviewId) {
          setLoadedReplies(prev => new Map(prev).set(rootReviewId, mappedReviews));
        }
        setPage(2);
        setHasMore(data.paging.totalPages > 1);
      } catch (err: any) {
        setError(err.message || 'Failed to load reviews');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, rootReviewId]);

  const getRepliesForReview = (reviewId: string) => {
    return loadedReplies.get(reviewId) || [];
  };

  const toggleReplies = async (reviewId: string) => {
    const isExpanded = expandedReviews.has(reviewId);
    const hasReplies = loadedReplies.has(reviewId);
    const replies = loadedReplies.get(reviewId) || [];
    
    if (!isExpanded && !hasReplies && !loadingReplies.has(reviewId)) {
      try {
        setLoadingReplies(prev => new Set(prev).add(reviewId));
        const response = await getReviewReplies(reviewId, { page: 1, limit: 15, sortType: 'asc', sortBy: 'createdAt' });
        const data = response.data;
        const mappedReplies = data.data.map((review: any) => ({
          review_id: review.reviewId,
          ref_review_id: review.parentReviewId,
          comment: review.comment,
          reviewedAt: review.createdAt,
          userId: review.user.userId,
          customer: {
            customerName: review.user.fullName || review.user.username,
            customerAvatar: review.user.avatarUrl
          }
        }));
        setLoadedReplies(prev => new Map(prev).set(reviewId, mappedReplies));
        
        if (mappedReplies.length > 0) {
          setExpandedReviews(prev => new Set(prev).add(reviewId));
        }
      } catch (err: any) {
        console.error('Failed to load replies:', err);
      } finally {
        setLoadingReplies(prev => {
          const newSet = new Set(prev);
          newSet.delete(reviewId);
          return newSet;
        });
      }
    } else if (hasReplies && replies.length > 0) {
      setExpandedReviews(prev => {
        const newSet = new Set(prev);
        if (newSet.has(reviewId)) {
          newSet.delete(reviewId);
        } else {
          newSet.add(reviewId);
        }
        return newSet;
      });
    }
  };

  const loadReplies = async (reviewId: string) => {
    if (loadedReplies.has(reviewId) || loadingReplies.has(reviewId)) return;

    try {
      setLoadingReplies(prev => new Set(prev).add(reviewId));
      const response = await getReviewReplies(reviewId, { page: 1, limit: 15, sortType: 'asc', sortBy: 'createdAt' });
      const data = response.data;
      const mappedReplies = data.data.map((review: any) => ({
        review_id: review.reviewId,
        ref_review_id: review.parentReviewId,
        comment: review.comment,
        reviewedAt: review.createdAt,
        userId: review.user.userId,
        customer: {
          customerName: review.user.fullName || review.user.username,
          customerAvatar: review.user.avatarUrl
        }
      }));
      setLoadedReplies(prev => new Map(prev).set(reviewId, mappedReplies));
    } catch (err: any) {
      console.error('Failed to load replies:', err);
    } finally {
      setLoadingReplies(prev => {
        const newSet = new Set(prev);
        newSet.delete(reviewId);
        return newSet;
      });
    }
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

  const loadMoreReviews = async () => {
    if (loadingMore || !hasMore) return;

    try {
      setLoadingMore(true);
      let response;
      if (rootReviewId) {
        response = await getReviewReplies(rootReviewId, { page, limit: 15, sortType: 'asc', sortBy: 'createdAt' });
      } else {
        response = await getServicePackageReviews(id, { page, limit: 15, sortType: 'desc', sortBy: 'createdAt' });
      }
      const data = response.data;
      const mappedReviews = data.data.map((review: any) => ({
        review_id: review.reviewId,
        ref_review_id: review.parentReviewId,
        comment: review.comment,
        reviewedAt: review.createdAt,
        userId: review.user.userId,
        customer: {
          customerName: review.user.fullName || review.user.username,
          customerAvatar: review.user.avatarUrl
        }
      }));
      setServicePackage((prev: any) => ({
        ...prev,
        reviews: [...prev.reviews, ...mappedReviews]
      }));
      setPage(prev => prev + 1);
      setHasMore(page < data.paging.totalPages);
    } catch (err: any) {
      setError(err.message || 'Failed to load more reviews');
    } finally {
      setLoadingMore(false);
    }
  };

  const postReview = async (commentText: string, parentReviewId?: string) => {
    if (!commentText.trim()) return;

    try {
      setPosting(true);
      const response = await postServicePackageReview(id, {
        comment: commentText.trim(),
        ...(parentReviewId && { parentReviewId })
      });

      const newReview = {
        review_id: response.data.data.reviewId,
        ref_review_id: parentReviewId || null,
        comment: response.data.data.comment,
        reviewedAt: response.data.data.createdAt,
        userId: response.data.data.user.userId,
        customer: {
          customerName: response.data.data.user.fullName || response.data.data.user.username,
          customerAvatar: response.data.data.user.avatarUrl
        }
      };

      setServicePackage((prev: any) => ({
        ...prev,
        reviews: parentReviewId 
          ? [...prev.reviews, newReview]
          : [newReview, ...prev.reviews],
        totalReviews: prev.totalReviews + 1
      }));

      if (parentReviewId) {
        setLoadedReplies(prev => {
          const currentReplies = prev.get(parentReviewId) || [];
          return new Map(prev).set(parentReviewId, [...currentReplies, newReview]);
        });
        setExpandedReviews(prev => new Set(prev).add(parentReviewId));
      }

      setComment('');
      setReplyingTo(null);
    } catch (err: any) {
      Alert.alert('Lỗi', err.message || 'Không thể đăng bình luận');
    } finally {
      setPosting(false);
    }
  };

  const handleReplyPress = (reviewId: string) => {
    if(!replyingTo) {
      setReplyingTo(reviewId);
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setReplyingTo(null);
    }
  };

  const handleSendPress = () => {
    postReview(comment, replyingTo || undefined);
  };

  const handleLongPress = (item: any) => {
    if (currentUserId && item.userId === currentUserId) {
      setEditingReview(item);
      setShowEditModal(true);
    }
  };

  const handleEditPress = () => {
    setShowEditModal(false);
    setComment(editingReview.comment);
    setReplyingTo(null);
  };

  const handleCancelEdit = () => {
    setShowEditModal(false);
    setEditingReview(null);
    setComment('');
  };

  const updateReview = async (reviewId: string, commentText: string) => {
    if (!commentText.trim()) return;

    try {
      setPosting(true);
      const response = await updateServicePackageReview(reviewId, {
        comment: commentText.trim(),
        parentReviewId: editingReview.ref_review_id
      });

      const updatedReview = {
        review_id: response.data.data.reviewId,
        ref_review_id: response.data.data.parentReviewId,
        comment: response.data.data.comment,
        reviewedAt: response.data.data.createdAt,
        userId: response.data.data.user.userId,
        customer: {
          customerName: response.data.data.user.fullName || response.data.data.user.username,
          customerAvatar: response.data.data.user.avatarUrl
        }
      };

      setServicePackage((prev: any) => ({
        ...prev,
        reviews: prev.reviews.map((review: any) => 
          review.review_id === reviewId ? updatedReview : review
        )
      }));

      if (editingReview.ref_review_id) {
        setLoadedReplies(prev => {
          const newMap = new Map(prev);
          const parentReplies = newMap.get(editingReview.ref_review_id) || [];
          newMap.set(
            editingReview.ref_review_id,
            parentReplies.map((reply: any) => 
              reply.review_id === reviewId ? updatedReview : reply
            )
          );
          return newMap;
        });
      }

      setComment('');
      setEditingReview(null);
    } catch (err: any) {
      Alert.alert('Lỗi', err.message || 'Không thể cập nhật bình luận');
    } finally {
      setPosting(false);
    }
  };

  const handleUpdatePress = () => {
    if (editingReview) {
      updateReview(editingReview.review_id, comment);
    }
  };

  const renderReviewItem = ({ item, depth = 0 }: { item: any; depth?: number }) => {
    const MAX_DEPTH = 10; 
    const currentColor = categoryColors[depth % categoryColors.length];
    const marginLeft = depth * 10; 
    const avatarStyle = styles.avatar;
    const commentContainerStyle = (item.ref_review_id && !(rootReviewId && item.review_id === rootReviewId))
      ? [styles.commentContainer, { marginLeft, borderLeftWidth: 3, borderLeftColor: currentColor, paddingLeft: 4 }]
      : [styles.commentContainer, { marginLeft }];
    const replies = getRepliesForReview(item.review_id);
    const isExpanded = expandedReviews.has(item.review_id);
    const isTextExpanded = expandedText.has(item.review_id);
    const isLoadingReplies = loadingReplies.has(item.review_id);
    const hasRepliesLoaded = loadedReplies.has(item.review_id);

    return (
      <View>
        <View style={commentContainerStyle}>
          <Image source={{ uri: item.customer.customerAvatar }} style={avatarStyle} />
          <TouchableOpacity 
            style={styles.commentContent} 
            activeOpacity={0.9}
            onLongPress={() => handleLongPress(item)}
            onPress={() => toggleTextExpansion(item.review_id)}
            delayLongPress={500}
          >
            <Text style={styles.customerName}>{item.customer.customerName}</Text>
            <Text style={styles.commentText} numberOfLines={isTextExpanded ? undefined : 3}>
              {item.comment}
            </Text>
            <View style={styles.commentFooter}>
              <Calendar size={14} color="gray" />
              <Text style={styles.commentDate}>{new Date(item.reviewedAt).toLocaleDateString('vi-VN')}</Text>
              <TouchableOpacity style={styles.replyButton} onPress={() => handleReplyPress(item.review_id)}>
                <MessageCircle size={20} color="gray" />
                <Text style={styles.commentDate}>Trả lời</Text>
              </TouchableOpacity>
              {depth < MAX_DEPTH && !rootReviewId && (!hasRepliesLoaded || replies.length > 0 || isLoadingReplies) && (
                <TouchableOpacity 
                  onPress={() => toggleReplies(item.review_id)} 
                  disabled={hasRepliesLoaded && replies.length === 0}
                >
                  <Text style={styles.viewRepliesText}>
                    {isLoadingReplies ? 'Đang tải...' : isExpanded ? 'Ẩn trả lời' : hasRepliesLoaded ? `Xem trả lời (${replies.length})` : 'Xem trả lời'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </TouchableOpacity>
        </View>
        {(isExpanded || rootReviewId) && replies.map((reply: any, index: number) => (
          <View key={reply.review_id}>
            {renderReviewItem({ item: reply, depth: depth + 1 >= MAX_DEPTH ? 0 : depth + 1 })}
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
      <View style={styles.contentContainer}>
        {!rootReviewId && (
          <View style={styles.statsContainer}>
            <View style={styles.likesContainer}>
              <View style={[styles.likeIconCircle, { backgroundColor: '#E7F3FF' }]}>
                <ThumbsUp size={16} color="#1877F2" />
              </View>
              <Text style={styles.likes}>{servicePackage?.likeCount || 0}</Text>
              <View style={[styles.dislikeIconCircle, { backgroundColor: '#FFF8DC' }]}>
                <ThumbsDown size={16} color="#FBCB0A" />
              </View>
              <Text style={styles.dislikes}>{servicePackage?.dislikeCount || 0}</Text>
            </View>
            <Text style={styles.totalComments}>{servicePackage?.totalReviews || 0} bình luận</Text>
          </View>
        )}
        <FlatList
          data={rootReviewId 
            ? (rootReviewParam ? [JSON.parse(rootReviewParam)] : servicePackage?.reviews?.filter((review: any) => review.review_id === rootReviewId) || [])
            : servicePackage?.reviews?.filter((review: any) => review.ref_review_id === null) || []
          }
          renderItem={({ item }) => renderReviewItem({ 
            item, 
            depth: 0
          })}
          keyExtractor={(item) => item.review_id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<Text style={styles.emptyText}>Chưa có bình luận nào.</Text>}
          onEndReached={loadMoreReviews}
          onEndReachedThreshold={0.5}
          ListFooterComponent={loadingMore ? <ActivityIndicator size="small" color={Colors.primary} /> : null}
        />
      </View>
      {!rootReviewId && (
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'position'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
          style={styles.keyboardAvoidingView}
        >
          {(replyingTo || editingReview) && (
            <View style={styles.replyIndicator}>
              <Text style={styles.replyIndicatorText}>
                {editingReview ? 'Đang chỉnh sửa bình luận' : 'Đang trả lời bình luận'}
              </Text>
              <TouchableOpacity onPress={() => {
                setReplyingTo(null);
                setEditingReview(null);
                setComment('');
              }}>
                <Text style={styles.cancelReplyText}>Hủy</Text>
              </TouchableOpacity>
            </View>
          )}
          <View style={styles.inputContainer}>
            <TextInput
              ref={inputRef}
              style={styles.textInput}
              placeholder="Nhập bình luận của bạn..."
              placeholderTextColor="gray"
              value={comment}
              onChangeText={setComment}
              multiline
            />
            <TouchableOpacity 
              style={[styles.iconButton, styles.sendButton, (!comment.trim() || posting) && styles.sendButtonDisabled]} 
              onPress={editingReview ? handleUpdatePress : handleSendPress}
              disabled={!comment.trim() || posting}
            >
              {posting ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Send size={24} color="white" />
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}
      
      {/* Edit Modal */}
      <Modal
        visible={showEditModal}
        transparent={true}
        animationType="slide"
        onRequestClose={handleCancelEdit}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1}
          onPress={handleCancelEdit}
        >
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalContent}>
              <TouchableOpacity 
                style={styles.modalOption}
                onPress={handleEditPress}
              >
                <Text style={styles.modalOptionText}>Chỉnh sửa bình luận</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalOption, styles.modalCancelOption]}
                onPress={handleCancelEdit}
              >
                <Text style={[styles.modalOptionText, styles.modalCancelText]}>Hủy</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeAreaView: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  contentContainer: {
    flex: 1,
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
    flexDirection: "row",
    paddingHorizontal: 10,
    alignItems: "center"
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
  sendButtonDisabled: {
    backgroundColor: 'gray',
  },
  replyIndicator: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f0f0f0',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  replyIndicatorText: {
    fontSize: 12,
    color: 'gray',
  },
  cancelReplyText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: 'bold',
  },
  keyboardAvoidingView: {
    backgroundColor: Colors.white,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 32,
    color: 'gray',
  },
  viewRepliesText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  modalOption: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalCancelOption: {
    borderBottomWidth: 0,
    marginTop: 8,
  },
  modalOptionText: {
    fontSize: 16,
    textAlign: 'center',
    color: Colors.primary,
  },
  modalCancelText: {
    color: 'gray',
  },
});

export default ServicePackageReviewsScreen;
