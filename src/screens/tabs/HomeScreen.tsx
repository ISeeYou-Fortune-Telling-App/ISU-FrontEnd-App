import TopBar from "@/src/components/TopBar";
import Colors from "@/src/constants/colors";
import { getKnowledgeCategories, getSeers, getServicePackageDetail, getServicePackages, interactWithServicePackage } from "@/src/services/api";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { Clock, Coins, Eye, Flag, Hand, MessageCircle, MoreHorizontal, Package, Sparkles, Star, ThumbsDown, ThumbsUp, Wallet, X } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Image, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Markdown from "react-native-markdown-display";
import { Button, SegmentedButtons, Switch } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

const demoServicePackages = [
  {
    id: '1',
    seer: 'Thầy Ông Nội',
    rating: 4.8,
    time: '2 giờ trước',
    categories: [{ id: '1', name: 'Cung Hoàng Đạo', description: 'Dự đoán theo cung hoàng đạo' }],
    categoryDisplays: [{ name: 'Cung Hoàng Đạo', display: 'Cung Hoàng Đạo', background: Colors.categoryColors.zodiac.chip, text: Colors.categoryColors.zodiac.icon }],
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
    categories: [{ id: '2', name: 'Chỉ Tay', description: 'Xem vận mệnh qua đường chỉ tay' }],
    categoryDisplays: [{ name: 'Chỉ Tay', display: 'Chỉ Tay', background: Colors.categoryColors.palmistry.chip, text: Colors.categoryColors.palmistry.icon }],
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

export default function HomeScreen() {
  const searchParams = useLocalSearchParams();
  const searchParamsRef = useRef(searchParams);
  const [activePage, setActivePage] = useState<"home" | "search">("home");
  const [searchType, setSearchType] = useState<"packages" | "seers">("packages");
  const [servicePackages, setServicePackages] = useState<any[]>([]);
  const [seers, setSeers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string>("CUSTOMER");

  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [likeInFlight, setLikeInFlight] = useState<Record<string, boolean>>({});
  const tabBarHeight = useBottomTabBarHeight();
  const pageSize = 15;
  const [categories, setCategories] = useState<Array<{ id: string, name: string, description: string }>>([]);
  const [selectedCategory, setSelectedCategory] = useState<{ id: string, name: string, description: string } | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [onlyShowAvailable, setOnlyShowAvailable] = useState(false);

  const fetchServicePackages = useCallback(async (page: number = 1, filterCategoryId?: string) => {
    if (page === 1) {
      setServicePackages([]);
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    setError(null);
    try {
      const token = await SecureStore.getItemAsync("authToken");
      const isDemoMode = token === "demo-token";

      if (!token) {
        router.replace("/auth");
        return;
      }

      if (isDemoMode) {
        if (page === 1) {
          if (filterCategoryId && categories.length > 0) {
            const cat = categories.find(c => c.id === filterCategoryId);
            if (cat) {
              const filtered = demoServicePackages.filter(p => (p.categories || []).some((pc: any) => pc.name === cat.name));
              setServicePackages(filtered);
            } else {
              setServicePackages(demoServicePackages);
            }
          } else {
            setServicePackages(demoServicePackages);
          }
        }
        setCurrentPage(page);
        setHasMore(false);
        if (page === 1) setLoading(false); else setLoadingMore(false);
        return;
      }

      const params: any = {
        page,
        limit: pageSize,
        sortType: searchParamsRef.current?.sortType as string || "desc",
        sortBy: searchParamsRef.current?.sortBy as string || "createdAt",
        minPrice: searchParamsRef.current?.minPrice ? parseFloat(searchParamsRef.current.minPrice as string) : undefined,
        maxPrice: searchParamsRef.current?.maxPrice ? parseFloat(searchParamsRef.current.maxPrice as string) : undefined,
        searchText: searchParamsRef.current?.searchText as string || undefined,
        minTime: searchParamsRef.current?.minTime ? parseInt(searchParamsRef.current.minTime as string) : undefined,
        maxTime: searchParamsRef.current?.maxTime ? parseInt(searchParamsRef.current.maxTime as string) : undefined,
        packageCategoryIds: filterCategoryId ? [filterCategoryId] : (searchParamsRef.current?.packageCategoryIds ? (Array.isArray(searchParamsRef.current.packageCategoryIds) ? searchParamsRef.current.packageCategoryIds : [searchParamsRef.current.packageCategoryIds]) : undefined),
        seerSpecialityIds: searchParamsRef.current?.seerSpecialityIds ? (Array.isArray(searchParamsRef.current.seerSpecialityIds) ? searchParamsRef.current.seerSpecialityIds : [searchParamsRef.current.seerSpecialityIds]) : undefined,
        status: searchParamsRef.current?.status as string || "AVAILABLE",
        onlyAvailable: onlyShowAvailable
      };

      Object.keys(params).forEach(key => params[key] === undefined && delete params[key]);

      const response = await getServicePackages(params);

      if (response.data && response.data.data) {
        const packagesWithDetails = await Promise.all(
          response.data.data.map(async (p: any) => {
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
                price: `${p.price.toLocaleString("vi-VN")} VNĐ`,
                duration: `${p.durationMinutes} phút`,
                imageUrl: p.imageUrl,
                likes: p.likeCount,
                dislikes: p.dislikeCount,
                comments: `${p.totalReviews} bình luận`,
              };
            }
          })
        );
        if (page === 1) setServicePackages(packagesWithDetails);
        else setServicePackages(prev => [...prev, ...packagesWithDetails]);
        setCurrentPage(page);
        setHasMore(page < response.data.paging.totalPages && response.data.data.length === pageSize);
      }
    } catch (err: any) {
      console.error("Failed to fetch service packages:", err);
      if (err.response?.status === 401) {
        setError("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
        setTimeout(() => {
          router.replace("/auth");
        }, 2000);
      } else {
        setError("Không thể tải gói dịch vụ. Vui lòng thử lại sau.");
      }
    } finally {
      if (page === 1) setLoading(false); else setLoadingMore(false);
    }
  }, [router, onlyShowAvailable]); // <- removed `categories` from dependency list

  const fetchSeers = useCallback(async (page: number = 1) => {
    if (page === 1) {
      setSeers([]);
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
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
        // For demo, show empty or dummy seers
        setSeers([]);
        setCurrentPage(page);
        setHasMore(false);
        if (page === 1) {
          setLoading(false);
        } else {
          setLoadingMore(false);
        }
        return;
      }

      const params: any = {
        page,
        limit: pageSize,
        sortType: searchParamsRef.current?.sortType as string || "desc",
        sortBy: searchParamsRef.current?.sortBy as string || "createdAt",
        searchText: searchParamsRef.current?.searchText as string || undefined,
        seerSpecialityIds: searchParamsRef.current?.seerSpecialityIds ? (Array.isArray(searchParamsRef.current.seerSpecialityIds) ? searchParamsRef.current.seerSpecialityIds : [searchParamsRef.current.seerSpecialityIds]) : undefined,
      };

      // Remove undefined values
      Object.keys(params).forEach(key => params[key] === undefined && delete params[key]);

      const response = await getSeers(params);

      if (response.data && response.data.data) {
        const seersData = response.data.data.map((s: any) => ({
          id: s.id,
          name: s.name,
          avatarUrl: s.avatarUrl,
          rating: s.rating,
          totalRates: s.totalRates,
          profileDescription: s.profileDescription,
          specialities: s.specialities,
          specialityDisplays: s.specialities.map((spec: string) => ({
            name: spec,
            ...getCategoryStyle(spec)
          })),
        }));
        if (page === 1) {
          setSeers(seersData);
        } else {
          setSeers(prev => [...prev, ...seersData]);
        }
        setCurrentPage(page);
        setHasMore(page < response.data.paging.totalPages && response.data.data.length === pageSize);
      }
    } catch (err: any) {
      console.error("Failed to fetch seers:", err);
      if (err.response?.status === 401) {
        setError("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
        setTimeout(() => {
          router.replace("/auth");
        }, 2000);
      } else {
        setError("Không thể tải danh sách thầy bói. Vui lòng thử lại sau.");
      }
    } finally {
      if (page === 1) {
        setLoading(false);
      } else {
        setLoadingMore(false);
      }
    }
  }, [router]);

  const loadMore = useCallback(() => {
    if (hasMore && !loadingMore) {
      if (searchType === "packages") {
        fetchServicePackages(currentPage + 1, selectedCategory?.id);
      } else {
        fetchSeers(currentPage + 1);
      }
    }
  }, [hasMore, loadingMore, currentPage, searchType, fetchServicePackages, fetchSeers, selectedCategory]);

  useEffect(() => {
    searchParamsRef.current = searchParams;
    if (searchParams.searchText || searchParams.packageCategoryIds || searchParams.seerSpecialityIds || searchParams.minPrice || searchParams.maxPrice || searchParams.minTime || searchParams.maxTime) {
      setActivePage("search");
    } else {
      setActivePage("home");
    }
    (async () => {
      try {
        const storedRole = await SecureStore.getItemAsync("userRole");
        if (storedRole) setRole(storedRole);
      } catch (e) {
        console.warn("Unable to read userRole from SecureStore", e);
      }
    })();
  }, [searchParams]);

  useFocusEffect(
    useCallback(() => {
      if (categories.length === 0) fetchCategories();
      if ((searchType === "packages" && servicePackages.length === 0) ||
        (searchType === "seers" && seers.length === 0)) {
        setCurrentPage(1);
        setHasMore(true);
        (async () => {
          await fetchCategories();
          if (searchType === "packages") {
            // if user had selected a category keep it, otherwise normal load
            await fetchServicePackages(1, selectedCategory?.id);
          } else {
            await fetchSeers(1);
          }
        })();
      }
    }, [searchType, fetchServicePackages, fetchSeers, selectedCategory])
  );

  useEffect(() => {
    if (Object.keys(searchParams).length > 0) {
      setCurrentPage(1);
      setHasMore(true);
      if (searchType === "packages") {
        fetchServicePackages(1);
      } else {
        fetchSeers(1);
      }
    }
  }, [JSON.stringify(searchParams), searchType, fetchServicePackages, fetchSeers]);

  useEffect(() => {
    if (activePage === "search") {
      setCurrentPage(1);
      setHasMore(true);
      if (searchType === "packages") {
        fetchServicePackages(1);
      } else {
        fetchSeers(1);
      }
    }
  }, [searchType, activePage, fetchServicePackages, fetchSeers]);

  useEffect(() => {
    if (searchType === "packages") {
      fetchServicePackages(currentPage, selectedCategory?.id);
    }
  }, [onlyShowAvailable]);

  const handleLike = async (packageId: string) => {
    if (likeInFlight[packageId]) return; // prevent double taps
    try {
      setLikeInFlight((s) => ({ ...s, [packageId]: true }));

      // find package current userInteraction
      const pkg = servicePackages.find((p) => p.id === packageId);
      const currentlyLiked = pkg?.userInteraction === 'LIKE';

      // decide action: if currentlyLiked then UNLIKE (or REMOVE), else LIKE
      const action = currentlyLiked ? 'LIKE' : 'LIKE';

      const res = await interactWithServicePackage(packageId, { interactionType: action });
      const data = res?.data?.data ?? res?.data ?? null;
      if (data) {
        setServicePackages((prev) =>
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
      const pkg = servicePackages.find((p) => p.id === packageId);
      const currentlyDisliked = pkg?.userInteraction === 'DISLIKE';

      const action = currentlyDisliked ? 'DISLIKE' : 'DISLIKE';

      const res = await interactWithServicePackage(packageId, { interactionType: action });
      const data = res?.data?.data ?? res?.data ?? null;
      if (data) {
        setServicePackages((prev) =>
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

  const fetchCategories = useCallback(async () => {
    try {
      const resp = await getKnowledgeCategories({ page: 1, limit: 200 });
      const payload = resp?.data?.data || [];
      const arr = Array.isArray(payload) ? payload : [];
      const mapped = arr.map((c: any) => ({ id: String(c.id), name: c.name, description: c.description }));
      setCategories(mapped);
      return mapped;
    } catch (e) {
      console.error('Failed to fetch categories', e);
      return [];
    }
  }, []);

  // when user taps a category chip
  const handleSelectCategory = async (categoryName: string) => {
    let cat = categories.find(c => c.name === categoryName);
    if (!cat) {
      // fetch categories and use the freshly returned list
      const fresh = await fetchCategories();
      cat = fresh.find((c: any) => c.name === categoryName);
      if (!cat) {
        // fail silently if category truly doesn't exist
        return;
      }
    }
    setSelectedCategory(cat);
    setCurrentPage(1);
    setHasMore(true);
    fetchServicePackages(1, cat.id);
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setCurrentPage(1);
    setHasMore(true);
    if (searchType === "packages") {
      await fetchServicePackages(1, selectedCategory?.id);
    } else {
      await fetchSeers(1);
    }
    setRefreshing(false);
  }, [searchType, fetchServicePackages, fetchSeers, selectedCategory, fetchCategories]);

  const clearSelectedCategory = () => {
    setSelectedCategory(null);
    setCurrentPage(1);
    setHasMore(true);
    fetchServicePackages(1);
  };

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
      <TopBar placeholder="Tìm kiếm dịch vụ, nhà tiên tri" isSearchButton={true} onSearchPress={() => router.push('/search')} />
      {activePage === "search" && (
        <View style={[styles.servicesContainer, styles.cardShadow, { marginHorizontal: 10, marginTop: 10, marginBottom: 0, paddingHorizontal: 16, paddingVertical: 12 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ width: 34 }} />
            <Text style={[styles.servicesTitle, { marginBottom: 0 }]}>Kết quả tìm kiếm</Text>
            <TouchableOpacity style={styles.iconButton} onPress={() => {
              searchParamsRef.current = {};

              setActivePage("home");
              setSearchType("packages");
              setOnlyShowAvailable(false); // Reset luôn switch nếu cần

              router.replace({
                pathname: '/(tabs)/home', params: {}
              });

              fetchServicePackages(1);
            }}>
              <X size={22} color={Colors.primary} />
            </TouchableOpacity>
          </View>
          <View style={{ paddingVertical: 8 }}>
            <SegmentedButtons
              value={searchType}
              onValueChange={setSearchType}
              buttons={[
                { value: 'packages', label: 'Gói dịch vụ' },
                { value: 'seers', label: 'Thầy bói' },
              ]}
            />
          </View>
        </View>
      )}

      {/* If a category is selected show small card with description and X to clear */}
      {activePage === "home" && selectedCategory && (
        <View style={[styles.servicesContainer, styles.cardShadow, { marginHorizontal: 10, marginTop: 10, paddingVertical: 12 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <View style={[
                styles.selectedCategoryIcon,
                { backgroundColor: getCategoryStyle(selectedCategory.name).background }
              ]}>
                {getCategoryIcon(selectedCategory.name, getCategoryStyle(selectedCategory.name).text)}
              </View>

              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={[styles.servicesTitle, { marginBottom: 4 }, { color: popularServices.find((c) => c.name == selectedCategory.name)?.color }]}>{selectedCategory.name}</Text>
                <Text style={{ color: Colors.gray, fontFamily: "inter" }}>{selectedCategory.description}</Text>
              </View>
            </View>

            <TouchableOpacity onPress={clearSelectedCategory} style={styles.iconButton}>
              <X size={20} color="gray" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {loading && <ActivityIndicator size="large" color={Colors.primary} style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }} />}

      {!loading && <FlatList
        data={activePage === "search" && searchType === "seers" ? seers : servicePackages}
        renderItem={({ item }) => (
          activePage === "search" && searchType === "seers" ? (
            <SeerCard seer={item} />
          ) : (
            <ServicePackageCard
              servicePackage={item}
              onLike={handleLike}
              onDislike={handleDislike}
              isLiking={Boolean(likeInFlight[item.id])}
              onBooking={() => router.push({ pathname: "/book-package", params: { id: item.id, title: item.title, content: item.content, rating: item.rating, price: item.price, duration: item.duration, seer: item.seer, avatarUrl: item.avatarUrl } })}
              userRole={role}
              isLike={item.isLike}
              isDislike={item.isDislike}
            />
          )
        )}
        keyExtractor={(item, index) => item.id + '-' + index}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.listContent, { paddingBottom: tabBarHeight + 16 }]}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.loadingMoreContainer}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.loadingMoreText}>Đang tải thêm...</Text>
            </View>
          ) : servicePackages.length > 0 ? (
            <View style={styles.loadingMoreContainer}>
              <Text style={styles.loadingMoreText}>Không có thêm gói nữa.</Text>
            </View>
          ) : null
        }
        ListHeaderComponent={activePage === "home" ? (
          <>
            {!selectedCategory && <View style={[styles.servicesContainer, styles.cardShadow]}>
              <Text style={styles.servicesTitle}>Dịch vụ phổ biến 🔥</Text>
              <View style={styles.servicesGrid}>
                {popularServices.map((service, index) => (
                  <TouchableOpacity key={index} style={styles.serviceItem} onPress={() => handleSelectCategory(service.name)}>
                    <View style={[styles.serviceIcon, { backgroundColor: service.bgColor }]}>
                      <service.Icon color={service.color} size={24} />
                    </View>
                    <Text style={styles.serviceName}>{service.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>}

            {role === "SEER" &&
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
            }

            {role === "CUSTOMER" &&
              <View style={[styles.servicesContainer, { flexDirection: "row", justifyContent: "space-between", flexWrap: "wrap" }, styles.cardShadow]}>
                <Text style={styles.text}>Chỉ show các gói có thể đặt ngay lúc này: </Text>
                <Switch
                  value={onlyShowAvailable}
                  onValueChange={setOnlyShowAvailable}
                  thumbColor={onlyShowAvailable ? Colors.primary : Colors.grayBackground}
                />
              </View>
            }

          </>
        ) : (
          <View style={{ paddingVertical: 8 }} />
        )}
        ListEmptyComponent={<Text style={styles.emptyText}>{activePage === "search" && searchType === "seers" ? "Không có thầy bói nào." : "Không có gói dịch vụ nào."}</Text>}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[Colors.primary]}
          />
        }
      />}
    </SafeAreaView>
  );
}

const getCategoryIcon = (category: string | null, color?: string) => {
  if (!category) return null;
  const iconColor = color ?? getCategoryStyle(category).text ?? 'gray';
  switch (category) {
    case 'Cung Hoàng Đạo':
      return <Star size={18} color={iconColor} />;
    case 'Nhân Tướng Học':
      return <Eye size={18} color={iconColor} />;
    case 'Ngũ Hành':
      return <Coins size={18} color={iconColor} />;
    case 'Chỉ Tay':
      return <Hand size={18} color={iconColor} />;
    case 'Tarot':
    case 'TAROT':
      return <Sparkles size={18} color={iconColor} />;
    case 'Khác':
      return <MoreHorizontal size={18} color={iconColor} />;
    default:
      // fallback: use Star for unknown categories
      return <Star size={18} color={iconColor} />;
  }
};

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
  onLike?: (id: string) => void;
  onDislike?: (id: string) => void;
  isLiking?: boolean;
  onBooking?: (id: string, title: string, content: string, rating: number, price: string, duration: string, seer: string, avatarUrl: string) => void;
  userRole?: string;
  isLike: boolean;
  isDislike: boolean;
};

const ServicePackageCard = ({ servicePackage, onLike, onDislike, onBooking, userRole, isLike, isDislike }: ServicePackageCardProps) => {
  const [avatarError, setAvatarError] = useState(false);
  const [coverError, setCoverError] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [int, setInt] = useState(isLike ? "LIKE" : isDislike ? "DISLIKE" : "");
  const [expanded, setExpanded] = useState(false);

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
    <TouchableOpacity style={styles.packageCard} activeOpacity={0.85}>
      {/* --- HEADER --- */}
      <View style={styles.packageHeader}>
        <Image
          source={
            avatarError || !servicePackage.avatarUrl
              ? require("@/assets/images/user-placeholder.png")
              : { uri: servicePackage.avatarUrl }
          }
          style={styles.avatar}
          resizeMode="cover"
          onError={(e) => {
            setAvatarError(true);
          }}
        />
        <TouchableOpacity style={styles.packageHeaderText} onPress={() => router.push({
          pathname: "/seer-profile",
          params: { seerId: servicePackage.seerId }
        })}>
          <Text style={styles.seerName}>
            {servicePackage.seer} <Star size={16} color="#FFD700" /> {servicePackage.rating}
          </Text>
          <Text style={styles.packageTime}>{servicePackage.time}</Text>
        </TouchableOpacity>
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
      <TouchableOpacity onPress={() => setExpanded(!expanded)}>
        <Markdown style={{
          body: { ...styles.packageContent },
          paragraph: { marginBottom: 0 },
        }}>
          {expanded 
            ? (servicePackage.content || '').replace(/\\n/g, '\n')
            : ((servicePackage.content || '').replace(/\\n/g, '\n').slice(0, 150) + ((servicePackage.content || '').length > 150 ? '...' : ''))}
        </Markdown>
      </TouchableOpacity>

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


type SeerCardProps = {
  seer: any;
};

const SeerCard = ({ seer }: SeerCardProps) => {
  const [avatarError, setAvatarError] = useState(false);
  return (
    <TouchableOpacity style={styles.packageCard} activeOpacity={0.85} onPress={() => router.push({
      pathname: "/seer-profile",
      params: { seerId: seer.id }
    })}>
      <View style={styles.packageHeader}>
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
        <View style={styles.packageHeaderText}>
          <Text style={styles.seerName}>{seer.name} <Star size={16} color="#FFD700" fill="#FFD700" /> {seer.rating}</Text>
          <Text style={styles.seerDescription}>{seer.profileDescription}</Text>
        </View>
      </View>

      {seer.specialityDisplays && seer.specialityDisplays.length > 0 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8, marginBottom: 4 }}>
          {seer.specialityDisplays.map((specDisplay: any, index: number) => (
            <View key={index} style={[styles.categoryTag, { backgroundColor: specDisplay.background, marginRight: 4, marginBottom: 2 }]}>
              <Text style={[styles.categoryText, { color: specDisplay.text }]}>{specDisplay.display}</Text>
            </View>
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
};

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
    fontFamily: 'inter',
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
    fontFamily: 'inter',
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
    fontFamily: 'inter',
  },
  packageTime: {
    color: 'gray',
    fontSize: 12,
    fontFamily: 'inter',
  },
  seerDescription: {
    color: 'gray',
    fontSize: 14,
    fontFamily: 'inter',
    marginTop: 4,
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
  text: {
    fontSize: 16,
    fontFamily: "inter",
    flexWrap: "wrap"
  },
  btn: {
    marginTop: 10,
    backgroundColor: Colors.primary,
    borderRadius: 10,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    fontFamily: 'inter',
  },
  loadingMoreContainer: {
    padding: 16,
    alignItems: 'center',
  },
  loadingMoreText: {
    marginTop: 8,
    fontSize: 14,
    color: 'gray',
    fontFamily: 'inter',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: Colors.borderGray
  },
  iconButton: {
    padding: 8,
  },
  selectedCategoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    // a subtle border for contrast on light backgrounds
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.06)',
  },
});
