import Colors from '@/src/constants/colors';
import { getSeerSalaryHistory } from '@/src/services/api';
import DateTimePicker from '@react-native-community/datetimepicker';
import { router, Stack } from 'expo-router';
import { Calendar, ChevronLeft, ChevronRight, Clock, CreditCard, Filter, Hash, Wallet, X } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Modal, Platform, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Customer = {
  fullName: string;
  avatarUrl: string;
};

type Seer = {
  fullName: string;
  avatarUrl: string;
};

type SalaryRecord = {
  id: string;
  createdAt: string;
  updatedAt: string;
  bookingId: string;
  paymentStatus: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
  customer: Customer;
  seer: Seer;
  transactionId: string;
  packageTitle: string;
  paymentMethod: string;
  amount: number;
  failureReason: string | null;
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('vi-VN');
};

const formatTime = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'COMPLETED': return Colors.green;
    case 'PENDING': return Colors.yellow;
    case 'FAILED': return Colors.error;
    case 'REFUNDED': return Colors.gray;
    default: return Colors.text;
  }
};

const getStatusBackgroundColor = (status: string) => {
  switch (status) {
    case 'COMPLETED': return '#dcfce7'; 
    case 'PENDING': return '#fef9c3'; 
    case 'FAILED': return '#fee2e2'; 
    case 'REFUNDED': return '#f3f4f6'; 
    default: return '#f3f4f6';
  }
};

const getStatusText = (status: string) => {
  switch (status) {
    case 'COMPLETED': return 'Hoàn thành';
    case 'PENDING': return 'Đang xử lý';
    case 'FAILED': return 'Thất bại';
    case 'REFUNDED': return 'Đã hoàn tiền';
    default: return status;
  }
};

export default function SeerSalaryHistoryScreen() {
  const [data, setData] = useState<SalaryRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const limit = 15;

  const [modalVisible, setModalVisible] = useState(false);
  const [paymentType, setPaymentType] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);
  
  const [timeFilterType, setTimeFilterType] = useState<'date' | 'month' | 'year' | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [sortType, setSortType] = useState<'desc' | 'asc'>('desc');
  const [sortBy, setSortBy] = useState<string>('createdAt');

  const getSortOption = () => {
    if (sortBy === 'createdAt' && sortType === 'desc') return 'newest';
    if (sortBy === 'createdAt' && sortType === 'asc') return 'oldest';
    if (sortBy === 'amount' && sortType === 'desc') return 'amount_desc';
    if (sortBy === 'amount' && sortType === 'asc') return 'amount_asc';
    if (sortBy === 'transactionId' && sortType === 'asc') return 'trans_asc';
    if (sortBy === 'transactionId' && sortType === 'desc') return 'trans_desc';
    return 'newest';
  };

  const handleSortChange = (option: string) => {
    switch (option) {
      case 'newest':
        setSortBy('createdAt');
        setSortType('desc');
        break;
      case 'oldest':
        setSortBy('createdAt');
        setSortType('asc');
        break;
      case 'amount_desc':
        setSortBy('amount');
        setSortType('desc');
        break;
      case 'amount_asc':
        setSortBy('amount');
        setSortType('asc');
        break;
      case 'trans_asc':
        setSortBy('transactionId');
        setSortType('asc');
        break;
      case 'trans_desc':
        setSortBy('transactionId');
        setSortType('desc');
        break;
    }
  };

  const [appliedFilters, setAppliedFilters] = useState({
    paymentType: null as string | null,
    paymentStatus: null as string | null,
    year: null as number | null,
    month: null as number | null,
    day: null as number | null,
    sortType: 'desc' as 'desc' | 'asc',
    sortBy: 'createdAt'
  });

  const fetchData = async (pageNum: number, isRefresh = false) => {
    if (loading) return;
    setLoading(true);
    try {
      const params: any = {
        page: pageNum,
        limit: limit,
        sortType: appliedFilters.sortType,
        sortBy: appliedFilters.sortBy
      };

      if (appliedFilters.paymentType) params.paymentType = appliedFilters.paymentType;
      if (appliedFilters.paymentStatus) params.paymentStatus = appliedFilters.paymentStatus;
      if (appliedFilters.year) params.year = appliedFilters.year;
      if (appliedFilters.month) params.month = appliedFilters.month;
      if (appliedFilters.day) params.day = appliedFilters.day;

      const response = await getSeerSalaryHistory(params);
      
      const newData = response.data.data;

      if (isRefresh) {
        setData(newData);
      } else {
        setData(prev => [...prev, ...newData]);
      }

      setHasMore(newData.length === limit);
    } catch (error) {
      console.error('Error fetching salary history:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData(1, true);
  }, [appliedFilters]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setPage(1);
    fetchData(1, true);
  }, [appliedFilters]);

  const loadMore = () => {
    if (hasMore && !loading) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchData(nextPage);
    }
  };

  const applyFilters = () => {
    let filterYear: number | null = null;
    let filterMonth: number | null = null;
    let filterDay: number | null = null;

    if (timeFilterType === 'date') {
      filterYear = selectedDate.getFullYear();
      filterMonth = selectedDate.getMonth() + 1;
      filterDay = selectedDate.getDate();
    } else if (timeFilterType === 'month') {
      filterYear = selectedYear;
      filterMonth = selectedMonth;
    } else if (timeFilterType === 'year') {
      filterYear = selectedYear;
    }

    setAppliedFilters({
      paymentType,
      paymentStatus,
      year: filterYear,
      month: filterMonth,
      day: filterDay,
      sortType,
      sortBy
    });
    setModalVisible(false);
    setPage(1);
  };

  const resetFilters = () => {
    setPaymentType(null);
    setPaymentStatus(null);
    setTimeFilterType(null);
    setSelectedDate(new Date());
    setSelectedMonth(new Date().getMonth() + 1);
    setSelectedYear(new Date().getFullYear());
    setSortType('desc');
    setSortBy('createdAt');
  };

  const renderFilterModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={modalVisible}
      onRequestClose={() => setModalVisible(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Bộ lọc</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <X size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <Text style={styles.filterLabel}>Loại thanh toán</Text>
            <View style={styles.filterOptions}>
              <TouchableOpacity
                style={[styles.filterChip, paymentType === null && styles.filterChipSelected]}
                onPress={() => setPaymentType(null)}
              >
                <Text style={[styles.filterChipText, paymentType === null && styles.filterChipTextSelected]}>
                  Tất cả
                </Text>
              </TouchableOpacity>
              {['RECEIVED_PACKAGE', 'BONUS'].map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[styles.filterChip, paymentType === type && styles.filterChipSelected]}
                  onPress={() => setPaymentType(type)}
                >
                  <Text style={[styles.filterChipText, paymentType === type && styles.filterChipTextSelected]}>
                    {type === 'RECEIVED_PACKAGE' ? 'Nhận gói' : 'Thưởng'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.filterLabel}>Trạng thái</Text>
            <View style={styles.filterOptions}>
              <TouchableOpacity
                style={[styles.filterChip, paymentStatus === null && styles.filterChipSelected]}
                onPress={() => setPaymentStatus(null)}
              >
                <Text style={[styles.filterChipText, paymentStatus === null && styles.filterChipTextSelected]}>
                  Tất cả
                </Text>
              </TouchableOpacity>
              {['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED'].map((status) => (
                <TouchableOpacity
                  key={status}
                  style={[styles.filterChip, paymentStatus === status && styles.filterChipSelected]}
                  onPress={() => setPaymentStatus(status)}
                >
                  <Text style={[styles.filterChipText, paymentStatus === status && styles.filterChipTextSelected]}>
                    {getStatusText(status)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.filterLabel}>Thời gian</Text>
            <View style={styles.filterOptions}>
              <TouchableOpacity
                style={[styles.filterChip, timeFilterType === null && styles.filterChipSelected]}
                onPress={() => setTimeFilterType(null)}
              >
                <Text style={[styles.filterChipText, timeFilterType === null && styles.filterChipTextSelected]}>
                  Tất cả
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterChip, timeFilterType === 'date' && styles.filterChipSelected]}
                onPress={() => setTimeFilterType('date')}
              >
                <Text style={[styles.filterChipText, timeFilterType === 'date' && styles.filterChipTextSelected]}>
                  Theo ngày
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterChip, timeFilterType === 'month' && styles.filterChipSelected]}
                onPress={() => setTimeFilterType('month')}
              >
                <Text style={[styles.filterChipText, timeFilterType === 'month' && styles.filterChipTextSelected]}>
                  Theo tháng
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterChip, timeFilterType === 'year' && styles.filterChipSelected]}
                onPress={() => setTimeFilterType('year')}
              >
                <Text style={[styles.filterChipText, timeFilterType === 'year' && styles.filterChipTextSelected]}>
                  Theo năm
                </Text>
              </TouchableOpacity>
            </View>

            {timeFilterType === 'date' && (
              <View style={styles.datePickerContainer}>
                <TouchableOpacity 
                  style={styles.dateButton}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Calendar size={20} color={Colors.text} />
                  <Text style={styles.dateButtonText}>
                    {selectedDate.toLocaleDateString('vi-VN')}
                  </Text>
                </TouchableOpacity>
                {showDatePicker && (
                  <DateTimePicker
                    value={selectedDate}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={(event, date) => {
                      setShowDatePicker(false);
                      if (date) setSelectedDate(date);
                    }}
                  />
                )}
              </View>
            )}

            {timeFilterType === 'month' && (
              <View style={styles.monthPickerContainer}>
                <View style={styles.yearSelector}>
                  <TouchableOpacity onPress={() => setSelectedYear(prev => prev - 1)}>
                    <ChevronLeft size={24} color={Colors.text} />
                  </TouchableOpacity>
                  <Text style={styles.yearText}>{selectedYear}</Text>
                  <TouchableOpacity onPress={() => setSelectedYear(prev => prev + 1)}>
                    <ChevronRight size={24} color={Colors.text} />
                  </TouchableOpacity>
                </View>
                <View style={styles.monthGrid}>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                    <TouchableOpacity
                      key={m}
                      style={[styles.monthButton, selectedMonth === m && styles.monthButtonSelected]}
                      onPress={() => setSelectedMonth(m)}
                    >
                      <Text style={[styles.monthButtonText, selectedMonth === m && styles.monthButtonTextSelected]}>
                        Tháng {m}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {timeFilterType === 'year' && (
              <View style={styles.yearPickerContainer}>
                <View style={styles.yearSelector}>
                  <TouchableOpacity onPress={() => setSelectedYear(prev => prev - 1)}>
                    <ChevronLeft size={24} color={Colors.text} />
                  </TouchableOpacity>
                  <Text style={styles.yearText}>{selectedYear}</Text>
                  <TouchableOpacity onPress={() => setSelectedYear(prev => prev + 1)}>
                    <ChevronRight size={24} color={Colors.text} />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Sort */}
            <Text style={styles.filterLabel}>Sắp xếp</Text>
            <View style={styles.filterOptions}>
              {[
                { label: 'Mới nhất', value: 'newest' },
                { label: 'Cũ nhất', value: 'oldest' },
                { label: 'Tiền giảm dần', value: 'amount_desc' },
                { label: 'Tiền tăng dần', value: 'amount_asc' },
                { label: 'Mã giao dịch tăng dần', value: 'trans_asc' },
                { label: 'Mã giao dịch giảm dần', value: 'trans_desc' },
              ].map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[styles.filterChip, getSortOption() === option.value && styles.filterChipSelected]}
                  onPress={() => handleSortChange(option.value)}
                >
                  <Text style={[styles.filterChipText, getSortOption() === option.value && styles.filterChipTextSelected]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.resetButton} onPress={resetFilters}>
              <Text style={styles.resetButtonText}>Đặt lại</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyButton} onPress={applyFilters}>
              <Text style={styles.applyButtonText}>Áp dụng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderItem = ({ item }: { item: SalaryRecord }) => (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.userInfo}>
          <Image 
            source={item.customer.avatarUrl ? { uri: item.customer.avatarUrl } : require('@/assets/images/user-placeholder.png')} 
            style={styles.avatar} 
          />
          <View>
            <Text style={styles.userName}>{item.customer.fullName}</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusBackgroundColor(item.paymentStatus) }]}>
              <Text style={[styles.statusText, { color: getStatusColor(item.paymentStatus) }]}>
                {getStatusText(item.paymentStatus)}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <Text style={styles.packageTitle}>{item.packageTitle}</Text>

      <View style={styles.detailRow}>
        <Hash size={16} color={Colors.purple} />
        <View style={{ marginLeft: 8 }}>
          <Text style={styles.label}>Mã giao dịch</Text>
          <Text style={styles.value}>{item.transactionId}</Text>
        </View>
      </View>

      <View style={styles.rowContainer}>
        <View style={styles.halfRow}>
          <Wallet size={20} color={Colors.green} />
          <View style={{ marginLeft: 8 }}>
            <Text style={styles.label}>Tiền lương</Text>
            <Text style={styles.value}>{formatCurrency(item.amount)}</Text>
          </View>
        </View>
        <View style={styles.halfRow}>
          <CreditCard size={20} color={Colors.primary} />
          <View style={{ marginLeft: 8 }}>
            <Text style={styles.label}>Phương thức</Text>
            <Text style={styles.value}>{item.paymentMethod}</Text>
          </View>
        </View>
      </View>

      <View style={styles.rowContainer}>
        <View style={styles.halfRow}>
          <Calendar size={18} color={Colors.gray} />
          <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
        </View>
        <View style={styles.halfRow}>
          <Clock size={18} color={Colors.gray} />
          <Text style={styles.dateText}>{formatTime(item.createdAt)}</Text>
        </View>
      </View>

      {item.failureReason && (
        <Text style={styles.errorText}>(Lý do thất bại: {item.failureReason})</Text>
      )}

      <TouchableOpacity style={styles.button} onPress={() => router.push({ pathname: '/booking-detail', params: { id: item.bookingId } })}>
        <Text style={styles.buttonText}>Chi tiết lịch hẹn</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen options={{ 
        headerShown: true, 
        title: "Lịch sử nhận lương",
        headerTitleStyle: { fontFamily: 'inter', fontWeight: 'bold' },
        headerTitleAlign: 'center',
        headerTintColor: Colors.text,
        headerRight: () => (
          <TouchableOpacity onPress={() => setModalVisible(true)}>
            <Filter size={24} color={Colors.text} />
          </TouchableOpacity>
        ),
      }} />
      
      {renderFilterModal()}

      <FlatList
        data={data}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={loading && !refreshing ? <ActivityIndicator size="small" color={Colors.primary} style={{ margin: 20 }} /> : null}
        ListEmptyComponent={!loading ? <Text style={styles.emptyText}>Không có lịch sử nhận lương</Text> : null}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  listContent: {
    padding: 16,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  packageTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  rowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  halfRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    fontSize: 12,
    color: Colors.gray,
  },
  value: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '500',
  },
  dateText: {
    marginLeft: 8,
    color: Colors.gray,
    fontSize: 14,
  },
  errorText: {
    color: Colors.error,
    fontSize: 12,
    marginBottom: 12,
    fontStyle: 'italic',
  },
  button: {
    backgroundColor: '#2563eb',
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    color: Colors.gray,
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '80%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
  },
  modalBody: {
    flex: 1,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 10,
    marginTop: 10,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 8,
    marginRight: 8,
  },
  filterChipSelected: {
    backgroundColor: '#eff6ff',
    borderColor: Colors.primary,
  },
  filterChipText: {
    color: Colors.gray,
    fontSize: 14,
  },
  filterChipTextSelected: {
    color: Colors.primary,
    fontWeight: '600',
  },
  timeInputs: {
    flexDirection: 'row',
    gap: 10,
  },
  timeInputWrapper: {
    flex: 1,
  },
  timeLabel: {
    fontSize: 12,
    color: Colors.gray,
    marginBottom: 4,
  },
  timeInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
    paddingBottom: 20,
  },
  resetButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  resetButtonText: {
    color: Colors.text,
    fontWeight: '600',
  },
  applyButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  applyButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  datePickerContainer: {
    marginTop: 10,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    gap: 10,
  },
  dateButtonText: {
    fontSize: 16,
    color: Colors.text,
  },
  monthPickerContainer: {
    marginTop: 10,
  },
  yearPickerContainer: {
    marginTop: 10,
  },
  yearSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    marginBottom: 10,
  },
  yearText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  monthButton: {
    width: '30%',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  monthButtonSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  monthButtonText: {
    fontSize: 14,
    color: Colors.text,
  },
  monthButtonTextSelected: {
    color: 'white',
    fontWeight: '600',
  },
});
