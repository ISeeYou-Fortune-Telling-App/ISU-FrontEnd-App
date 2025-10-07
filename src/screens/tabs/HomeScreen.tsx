import TopBar from "@/src/components/TopBar";
import Colors from "@/src/constants/colors";
import { CircleDollarSign, Clock, Eye, Hand, Laugh, MessageCircle, MoreHorizontal, Sparkles, Star, ThumbsDown, ThumbsUp, Wallet, X } from 'lucide-react-native';
import { FlatList, Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const popularServices = [
  { name: 'Cung Hoàng Đạo', Icon: Star, color: '#8A2BE2', bgColor: '#E6E6FA' },
  { name: 'Nhân Tướng Học', Icon: Eye, color: '#4169E1', bgColor: '#E0EFFF' },
  { name: 'Ngũ Hành', Icon: CircleDollarSign, color: '#32CD32', bgColor: '#DFFFE0' },
  { name: 'Chỉ Tay', Icon: Hand, color: '#FF69B4', bgColor: '#FFEFF5' },
  { name: 'Tarot', Icon: Sparkles, color: '#FFD700', bgColor: '#FFF8DC' },
  { name: 'Khác', Icon: MoreHorizontal, color: '#808080', bgColor: '#F0F0F0' },
];

const posts = [
  {
    id: '1',
    seer: 'Thầy Ông Nội',
    rating: 4.8,
    time: '2 giờ trước',
    category: 'Cung Hoàng Đạo',
    categoryColor: '#8A2BE2',
    categoryBgColor: '#E6E6FA',
    title: 'Xem bói tổng quát cuộc đời 2024',
    content: 'Dự đoán vận mệnh, tình duyên, sự nghiệp và tài lộc trong năm 2024. Phân tích chi tiết dựa trên ngày sinh và đặc điểm cá nhân. Tôi sẽ giúp bạn hiểu rõ hơn về con đường phía trước và cách để đạt được thành công.',
    price: '1.000.000 VNĐ',
    duration: '90 phút',
    imageUrl: 'https://krython.com/_astro/cover.gk93idBH_Z1HCSxk.webp',
    likes: '1.2k',
    dislikes: '200m',
    comments: '143 bình luận',
  },
  {
    id: '2',
    seer: 'Thầy Nguyễn Tấn Trần Minh Khang',
    rating: 3.5,
    time: '2 giờ trước',
    category: 'Chỉ tay',
    categoryColor: '#FF69B4',
    categoryBgColor: '#FFEFF5',
    title: 'Xem chỉ tay - Dự đoán tương lai',
    content: 'Đọc các đường chỉ tay ...Xem thêm',
    price: '10.000 VNĐ',
    duration: '40 phút',
    imageUrl: null,
    likes: '1.2k',
    dislikes: '200m',
    comments: '143 bình luận',
  },
];

const PostCard = ({ post }: { post: any }) => (
  <View style={styles.postCard}>
    <View style={styles.postHeader}>
      <Laugh size={40} color="black" />
      <View style={styles.postHeaderText}>
        <Text style={styles.seerName}>{post.seer} <Star size={16} color="#FFD700" fill="#FFD700" /> {post.rating}</Text>
        <View style={{flexDirection: 'row', alignItems: 'center'}}>
            <Text style={styles.postTime}>{post.time} • </Text>
            <View style={[styles.categoryTag, {backgroundColor: post.categoryBgColor}]}>
                <Text style={[styles.categoryText, {color: post.categoryColor}]}>{post.category}</Text>
            </View>
        </View>
      </View>
      <X size={24} color="gray" />
    </View>
    <Text style={styles.postTitle}>{post.title}</Text>
    <Text style={styles.postContent}>{post.content}</Text>
    {post.imageUrl && <Image source={{ uri: post.imageUrl }} style={styles.postImage} />}
    <View style={styles.postFooterInfo}>
        <View style={{flexDirection: 'row', alignItems: 'center'}}>
            <Wallet size={16} color="#32CD32" />
            <Text style={styles.postPrice}>{post.price}</Text>
            <Clock size={16} color="gray" style={{marginLeft: 16}}/>
            <Text style={styles.postDuration}>{post.duration}</Text>
        </View>
    </View>
    <View style={styles.postStats}>
        <View style={{flexDirection: 'row', alignItems: 'center'}}>
            <View style={[styles.likeIconCircle, {backgroundColor: '#E7F3FF'}]}>
                <ThumbsUp size={16} color="#1877F2" />
            </View>
            <Text style={styles.likes}>{post.likes}</Text>
            <View style={[styles.dislikeIconCircle, {backgroundColor: '#FFF8DC'}]}>
                <ThumbsDown size={16} color="#FBCB0A" />
            </View>
            <Text style={styles.dislikes}>{post.dislikes}</Text>
        </View>
      <Text style={styles.comments}>{post.comments}</Text>
    </View>
    <View style={styles.postActions}>
      <View style={styles.actionButton}>
        <ThumbsUp size={20} color="gray" />
        <Text style={styles.actionText}>Thích</Text>
      </View>
      <View style={styles.actionButton}>
        <MessageCircle size={20} color="gray" />
        <Text style={styles.actionText}>Bình luận</Text>
      </View>
    </View>
    <View style={styles.bookButtonContainer}>
        <Text style={styles.bookButton}>Đặt lịch ngay</Text>
    </View>
  </View>
);


export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.safeAreaView}>
      <TopBar placeholder="Tìm kiếm dịch vụ, nhà tiên tri"/>
      <ScrollView>
        <View style={styles.servicesContainer}>
          <Text style={styles.servicesTitle}>Dịch vụ phổ biến</Text>
          <View style={styles.servicesGrid}>
            {popularServices.map((service, index) => (
              <View key={index} style={styles.serviceItem}>
                <View style={[styles.serviceIcon, {backgroundColor: service.bgColor}]}>
                    <service.Icon color={service.color} size={24} />
                </View>
                <Text style={styles.serviceName}>{service.name}</Text>
              </View>
            ))}
          </View>
        </View>
        <FlatList
          data={posts}
          renderItem={({ item }) => <PostCard post={item} />}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeAreaView: {
    flex: 1,
    backgroundColor: Colors.grayBackground,
  },
  servicesContainer: {
    backgroundColor: Colors.white,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  servicesTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    fontFamily: 'Inter',
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  serviceItem: {
    alignItems: 'center',
    width: '33.33%',
    marginBottom: 16,
  },
  serviceIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  serviceName: {
    fontSize: 12,
    textAlign: 'center',
    fontFamily: 'Inter',
  },
  postCard: {
    backgroundColor: Colors.white,
    marginTop: 8,
    padding: 16,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  postHeaderText: {
    marginLeft: 12,
    flex: 1,
  },
  seerName: {
    fontWeight: 'bold',
    fontSize: 16,
    fontFamily: 'Inter',
  },
  postTime: {
    color: 'gray',
    fontSize: 12,
    fontFamily: 'Inter',
  },
  categoryTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 4,
  },
  categoryText: {
    fontSize: 12,
    fontFamily: 'Inter',
  },
  postTitle: {
    fontWeight: 'bold',
    fontSize: 16,
    marginTop: 12,
    fontFamily: 'Inter',
  },
  postContent: {
    marginTop: 8,
    fontSize: 16,
    color: '#333',
    fontFamily: 'Inter',
  },
  postImage: {
    width: '100%',
    height: 200,
    marginTop: 12,
    borderRadius: 8,
  },
  postFooterInfo: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginTop: 12,
    paddingHorizontal: 8,
  },
  postPrice: {
    marginLeft: 4,
    color: '#32CD32',
    fontWeight: 'bold',
    fontSize: 16,
    fontFamily: 'Inter',
  },
  postDuration: {
    marginLeft: 4,
    color: 'gray',
    fontSize: 16,
    fontFamily: 'Inter',
  },
  postStats: {
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
    fontFamily: 'Inter',
  },
  dislikes: {
    color: 'gray',
    marginLeft: 4,
    fontSize: 12,
    fontFamily: 'Inter',
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
    fontFamily: 'Inter',
  },
  postActions: {
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
    fontFamily: 'Inter',
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
    fontFamily: 'Inter',
  }
});