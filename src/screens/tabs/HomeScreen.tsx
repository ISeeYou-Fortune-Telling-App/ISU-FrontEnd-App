import TopBar from "@/src/components/TopBar";
import Colors from "@/src/constants/colors";
import { getServicePackageDetail, getServicePackages } from "@/src/services/api";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { router, useFocusEffect } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { Clock, Coins, Eye, Hand, Laugh, MessageCircle, MoreHorizontal, Package, Sparkles, Star, ThumbsDown, ThumbsUp, Wallet, X, Flag } from 'lucide-react-native';
import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Button } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

const demoServicePackages = [
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

const popularServices = [
  { name: 'Cung Hoàng Đạo', Icon: Star, color: Colors.categoryColors.zodiac.icon, bgColor: Colors.categoryColors.zodiac.chip },
  { name: 'Nhân Tướng Học', Icon: Eye, color: Colors.categoryColors.physiognomy.icon, bgColor: Colors.categoryColors.physiognomy.chip },
  { name: 'Ngũ Hành', Icon: Coins, color: Colors.categoryColors.elements.icon, bgColor: Colors.categoryColors.elements.chip },
  { name: 'Chỉ Tay', Icon: Hand, color: Colors.categoryColors.palmistry.icon, bgColor: Colors.categoryColors.palmistry.chip },
  { name: 'Tarot', Icon: Sparkles, color: Colors.categoryColors.tarot.icon, bgColor: Colors.categoryColors.tarot.chip },
  { name: 'Khác', Icon: MoreHorizontal, color: Colors.categoryColors.other.icon, bgColor: Colors.categoryColors.other.chip },
];

type ServicePackageCardProps = {
  servicePackage: any;
  expanded: boolean;
  onToggle: () => void;
};

const ServicePackageCard = ({ servicePackage, expanded, onToggle }: ServicePackageCardProps) => (
    <TouchableOpacity style={styles.packageCard} activeOpacity={0.85} onPress={onToggle}>
      <View style={styles.packageHeader}>
        <Laugh size={40} color="black" />
        <View style={styles.packageHeaderText}>
          <Text style={styles.seerName}>{servicePackage.seer} <Star size={16} color="#FFD700" fill="#FFD700" /> {servicePackage.rating}</Text>
          <View style={{flexDirection: 'row', alignItems: 'center'}}>
              <Text style={styles.packageTime}>{servicePackage.time} • </Text>
              <View style={[styles.categoryTag, {backgroundColor: servicePackage.categoryBgColor}]}>
                  <Text style={[styles.categoryText, {color: servicePackage.categoryColor}]}>{servicePackage.category}</Text>
              </View>
          </View>
        </View>
        <View style={{flexDirection: 'row', alignItems: 'center'}}>
          <TouchableOpacity onPress={() => router.push({ pathname: "/report", params: { targetId: servicePackage.id, targetType: 'SERVICE_PACKAGE', targetName: servicePackage.title }})}>
            <Flag size={20} color="gray" style={{marginRight: 12}}/>
          </TouchableOpacity>
          <X size={24} color="gray" />
        </View>
      </View>
      <Text style={styles.packageTitle}>{servicePackage.title}</Text>
  <Text style={styles.packageContent} numberOfLines={expanded ? undefined : 3}>{servicePackage.content}</Text>
      {servicePackage.imageUrl && <Image source={{ uri: servicePackage.imageUrl }} style={styles.packageImage} />}
      <View style={styles.packageFooterInfo}>
          <View style={{flexDirection: 'row', alignItems: 'center'}}>
              <Wallet size={16} color="#32CD32" />
              <Text style={styles.packagePrice}>{servicePackage.price}</Text>
              <Clock size={16} color="gray" style={{marginLeft: 16}}/>
              <Text style={styles.packageDuration}>{servicePackage.duration}</Text>
          </View>
      </View>
      <View style={styles.packageStats}>
          <View style={{flexDirection: 'row', alignItems: 'center'}}>
              <View style={[styles.likeIconCircle, {backgroundColor: '#E7F3FF'}]}>
                  <ThumbsUp size={16} color="#1877F2" />
              </View>
              <Text style={styles.likes}>{servicePackage.likes}</Text>
              <View style={[styles.dislikeIconCircle, {backgroundColor: '#FFF8DC'}]}>
                  <ThumbsDown size={16} color="#FBCB0A" />
              </View>
              <Text style={styles.dislikes}>{servicePackage.dislikes}</Text>
          </View>
        <Text style={styles.comments}>{servicePackage.comments}</Text>
      </View>
      <View style={styles.packageActions}>
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
    </TouchableOpacity>
);


export default function HomeScreen() {
  const [activePage, setActivePage] = useState<"home" | "search">("home");
  const [servicePackages, setServicePackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);
  const [expandedPackages, setExpandedPackages] = useState<Record<string, boolean>>({});
  const tabBarHeight = useBottomTabBarHeight();

  const fetchServicePackages = useCallback(async () => {
    setServicePackages(demoServicePackages);
    setLoading(true);
    setError(null);
    try {
      // Check if user is authenticated
      const token = await SecureStore.getItemAsync("authToken");
      const isDemoMode = token === "demo-token";

      if (!token) {
        router.replace("/auth");
        return;
      }

      if (isDemoMode) {
        //setServicePackages(demoServicePackages);
        return;
      }
      
      const response = await getServicePackages({
        page: 1,
        limit: 15,
        sortType: "desc",
        sortBy: "createdAt",
      });
      
      if (response.data && response.data.data) {
        const packagesWithDetails = await Promise.all(
          response.data.data.map(async (p: any) => {
            try {
              const detailResponse = await getServicePackageDetail(p.id);
              const detail = detailResponse.data.data;
              return {
                id: detail.packageId,
                seer: detail.seer.fullName,
                rating: detail.seer.avgRating,
                time: new Date(detail.createdAt).toLocaleDateString(),
                category: 'Unknown', // API doesn't provide category, so using a placeholder
                categoryColor: '#808080',
                categoryBgColor: '#F0F0F0',
                title: detail.packageTitle,
                content: detail.packageContent,
                price: `${detail.price.toLocaleString("vi-VN")} VNĐ`,
                duration: `${detail.durationMinutes} phút`,
                imageUrl: detail.imageUrl,
                likes: '0', // Placeholder
                dislikes: '0', // Placeholder
                comments: '0 bình luận', // Placeholder
              };
            } catch (detailErr) {
              console.error(`Error fetching details for package ${p.id}:`, detailErr);
              // Return package with available data even if detail fetch failed
              return {
                id: p.id,
                seer: 'Không có thông tin',
                rating: 0,
                time: new Date(p.createdAt).toLocaleDateString(),
                category: 'Unknown',
                categoryColor: '#808080',
                categoryBgColor: '#F0F0F0',
                title: p.packageTitle,
                content: p.packageContent,
                price: `${p.price.toLocaleString("vi-VN")} VNĐ`,
                duration: `${p.durationMinutes} phút`,
                imageUrl: p.imageUrl,
                likes: '0',
                dislikes: '0',
                comments: '0 bình luận',
              };
            }
          })
        );
        setServicePackages(packagesWithDetails);
      }
    } catch (err: any) {
      console.error("Failed to fetch service packages:", err);
      const token = await SecureStore.getItemAsync("authToken");
      const isDemoMode = token === "demo-token";
      if (isDemoMode) {
        // setServicePackages(demoServicePackages);
        return;
      }
      if (err.response?.status === 401) {
        setError("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
        // Redirect to login after a short delay
        setTimeout(() => {
          router.replace("/auth");
        }, 2000);
      } else {
        setError("Không thể tải gói dịch vụ. Vui lòng thử lại sau.");
      }
    } finally {
      setLoading(false);
    }
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      fetchServicePackages();
    }, [fetchServicePackages])
  );

  if (loading) {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={[styles.safeAreaView, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </SafeAreaView>
    );
  }
  
  if (error) {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={[styles.safeAreaView, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={styles.errorText}>{error}</Text>
        <Button 
          mode="contained" 
          style={{ marginTop: 16 }} 
          onPress={() => fetchServicePackages()}>
          Thử lại
        </Button>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeAreaView}>
      <TopBar placeholder="Tìm kiếm dịch vụ, nhà tiên tri"/>
      <FlatList
        data={servicePackages}
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
          />
        )}
        keyExtractor={item => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.listContent, { paddingBottom: tabBarHeight + 16 }]}
        ListHeaderComponent={
          <>
            <View style={[styles.servicesContainer, styles.cardShadow]}>
              <Text style={styles.servicesTitle}>Dịch vụ phổ biến 🔥</Text>
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

            <View style={[styles.servicesContainer, styles.cardShadow]}>
              <Text style={styles.text}>Tạo gói dịch vụ mới để thu hút khách hàng 💵</Text>
              <Button 
                mode="contained" 
                style={styles.btn} 
                icon={() => <Package size={18} color="white" />}
                onPress={() => router.push("/create-package")}>
                  Tạo gói dịch vụ mới
              </Button>
            </View>
          </>
        }
        ListEmptyComponent={<Text style={styles.emptyText}>Không có gói dịch vụ nào.</Text>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeAreaView: {
    flex: 1,
    backgroundColor: Colors.grayBackground,
  },
  errorText: {
    fontSize: 16,
    color: 'red',
    textAlign: 'center',
    padding: 16,
  },
  servicesContainer: {
    backgroundColor: Colors.white,
    padding: 16,
    // borderWidth: 1,
    // borderColor: Colors.primary,
    borderRadius: 15,
    margin: 10
  },
  // subtle cross-platform card shadow
  cardShadow: {
    shadowColor: '#000',
    // push the shadow downward
    shadowOffset: { width: 10, height: 6 },
    shadowOpacity: .12,
    shadowRadius: 8,
    elevation: 6,
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
  packageCard: {
    backgroundColor: Colors.white,
    marginTop: 8,
    marginHorizontal: 10,
    padding: 16,
    borderRadius: 12,
  },
  listContent: {
    paddingBottom: 20,
  },
  packageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  packageHeaderText: {
    marginLeft: 12,
    flex: 1,
  },
  seerName: {
    fontWeight: 'bold',
    fontSize: 16,
    fontFamily: 'Inter',
  },
  packageTime: {
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
  packageTitle: {
    fontWeight: 'bold',
    fontSize: 16,
    marginTop: 12,
    fontFamily: 'Inter',
  },
  packageContent: {
    marginTop: 8,
    fontSize: 16,
    color: '#333',
    fontFamily: 'Inter',
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
    fontFamily: 'Inter',
  },
  packageDuration: {
    marginLeft: 4,
    color: 'gray',
    fontSize: 16,
    fontFamily: 'Inter',
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
  },
  text: {
    fontSize: 16,
    fontWeight: "bold",
  },
  btn: {
    marginTop: 10,
    backgroundColor: Colors.primary,
    borderRadius: 10,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    fontFamily: 'Inter',
  }
});