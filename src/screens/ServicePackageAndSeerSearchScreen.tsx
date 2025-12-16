import Colors from '@/src/constants/colors';
import { getKnowledgeCategories } from '@/src/services/api';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const SIZES = {
    medium: 16,
};

const FONT = {
    bold: 'inter-bold',
    regular: 'inter',
};

const categoryPalette: Record<string, { background: string; text: string }> = {
    "Cung Hoàng Đạo": { background: Colors.categoryColors.zodiac.chip, text: Colors.categoryColors.zodiac.icon },
    "Ngũ Hành": { background: Colors.categoryColors.elements.chip, text: Colors.categoryColors.elements.icon },
    "Nhân Tướng Học": { background: Colors.categoryColors.physiognomy.chip, text: Colors.categoryColors.physiognomy.icon },
    "Chỉ Tay": { background: Colors.categoryColors.palmistry.chip, text: Colors.categoryColors.palmistry.icon },
    "Tarot": { background: Colors.categoryColors.tarot.chip, text: Colors.categoryColors.tarot.icon },
    "Khác": { background: Colors.categoryColors.other.chip, text: Colors.categoryColors.other.icon },
};

const getCategoryStyle = (category: string) =>
    categoryPalette[category] ?? { background: "#F2F2F2", text: "#4F4F4F" };

const sortOptions = [
    { label: "Mới nhất", sortBy: "createdAt", sortType: "desc" },
    { label: "Cũ nhất", sortBy: "createdAt", sortType: "asc" },
    { label: "Giá thấp nhất", sortBy: "price", sortType: "asc" },
    { label: "Giá cao nhất", sortBy: "price", sortType: "desc" },
    { label: "Tên A-Z", sortBy: "packageTitle", sortType: "asc" },
    { label: "Tên Z-A", sortBy: "packageTitle", sortType: "desc" },
];

const formatMoney = (value: string) => {
    if (!value) return '';
    const cleanValue = value.replace(/\D/g, '');
    return cleanValue.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

const parseMoney = (value: string) => {
    return value.replace(/\./g, '');
};

const ServicePackageAndSeerSearchScreen = () => {
    const router = useRouter();
    const params = useLocalSearchParams();

    const [searchText, setSearchText] = useState(params.searchText as string || '');
    const [categories, setCategories] = useState<Array<{ id: string, name: string }>>([]);
    
    const initialCategories = params.packageCategoryIds 
        ? (Array.isArray(params.packageCategoryIds) ? params.packageCategoryIds : [params.packageCategoryIds]) 
        : [];
    const [selectedCategories, setSelectedCategories] = useState<string[]>(initialCategories as string[]);

    const initialSpecialties = params.seerSpecialityIds
        ? (Array.isArray(params.seerSpecialityIds) ? params.seerSpecialityIds : [params.seerSpecialityIds])
        : [];
    const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>(initialSpecialties as string[]);

    const [minPrice, setMinPrice] = useState(params.minPrice ? formatMoney(String(params.minPrice)) : '');
    const [maxPrice, setMaxPrice] = useState(params.maxPrice ? formatMoney(String(params.maxPrice)) : '');
    const [minTime, setMinTime] = useState(params.minTime ? String(params.minTime) : '');
    const [maxTime, setMaxTime] = useState(params.maxTime ? String(params.maxTime) : '');

    const initialSort = sortOptions.find(s => s.sortBy === params.sortBy && s.sortType === params.sortType) || sortOptions[0];
    const [selectedSort, setSelectedSort] = useState(initialSort);

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const resp = await getKnowledgeCategories({ page: 1, limit: 200 });
                const payload = resp?.data?.data || [];
                const arr = Array.isArray(payload) ? payload : [];
                const mapped = arr.map((c: any) => ({ id: String(c.id), name: c.name }));
                setCategories(mapped);
            } catch (e) {
                console.error('Failed to fetch categories', e);
            }
        };
        fetchCategories();
    }, []);

    const toggleSelection = (itemId: string, list: string[], setList: React.Dispatch<React.SetStateAction<string[]>>) => {
        if (list.includes(itemId)) {
            setList(list.filter(i => i !== itemId));
        } else {
            setList([...list, itemId]);
        }
    };

    const handleSearch = () => {
        const minPriceVal = minPrice ? parseFloat(parseMoney(minPrice)) : undefined;
        const maxPriceVal = maxPrice ? parseFloat(parseMoney(maxPrice)) : undefined;
        const minTimeVal = minTime ? parseInt(minTime) : undefined;
        const maxTimeVal = maxTime ? parseInt(maxTime) : undefined;

        if ((minPriceVal !== undefined && maxPriceVal !== undefined && minPriceVal > maxPriceVal)&&(minTimeVal !== undefined && maxTimeVal !== undefined && minTimeVal > maxTimeVal)) {
            Alert.alert("Lỗi", "Giá tối thiểu không được lớn hơn giá tối đa. Thời lượng tối thiểu không được lớn hơn thời lượng tối đa");
            return;
        }

        if (minPriceVal !== undefined && maxPriceVal !== undefined && minPriceVal > maxPriceVal) {
            Alert.alert("Lỗi", "Giá tối thiểu không được lớn hơn giá tối đa");
            return;
        }

        if (minTimeVal !== undefined && maxTimeVal !== undefined && minTimeVal > maxTimeVal) {
            Alert.alert("Lỗi", "Thời lượng tối thiểu không được lớn hơn thời lượng tối đa");
            return;
        }

        const params: any = {
            searchText: searchText || undefined,
            packageCategoryIds: selectedCategories.length > 0 ? selectedCategories : undefined,
            seerSpecialityIds: selectedSpecialties.length > 0 ? selectedSpecialties : undefined,
            minPrice: minPriceVal,
            maxPrice: maxPriceVal,
            minTime: minTimeVal,
            maxTime: maxTimeVal,
            sortBy: selectedSort.sortBy,
            sortType: selectedSort.sortType,
            status: 'AVAILABLE',
        };
        // Remove undefined values
        Object.keys(params).forEach(key => params[key] === undefined && delete params[key]);
        router.push({ pathname: "/(tabs)/home", params });
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="black" />
                </TouchableOpacity>
                <View style={styles.searchContainer}>
                    <Ionicons name="search" size={20} color={Colors.primary} style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Tìm tên dịch vụ, tên nhà tiên tri..."
                        placeholderTextColor={Colors.gray}
                        value={searchText}
                        onChangeText={setSearchText}
                    />
                </View>
            </View>
            <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
                style={{ flex: 1 }}
            >
                <ScrollView showsVerticalScrollIndicator={false}>
                    <View style={styles.filterSection}>
                    <Text style={styles.sectionTitle}>Danh mục dịch vụ</Text>
                    <View style={styles.chipContainer}>
                        {categories.map(category => {
                            const style = getCategoryStyle(category.name);
                            const isSelected = selectedCategories.includes(category.id);
                            return (
                                <TouchableOpacity
                                    key={category.id}
                                    style={[
                                        styles.chip,
                                        { backgroundColor: isSelected ? style.background : '#f0f0f0', borderWidth: isSelected ? 1 : 0, borderColor: isSelected ? style.text : undefined },
                                        isSelected && styles.chipSelected
                                    ]}
                                    onPress={() => toggleSelection(category.id, selectedCategories, setSelectedCategories)}
                                >
                                    <Text style={[styles.chipText, { color: isSelected ? style.text : 'black' }]}>{category.name}</Text>
                                </TouchableOpacity>
                            )
                        })}
                    </View>
                </View>

                <View style={styles.filterSection}>
                    <Text style={styles.sectionTitle}>Chuyên môn của nhà tiên tri</Text>
                    <View style={styles.chipContainer}>
                        {categories.map(specialty => {
                            const style = getCategoryStyle(specialty.name);
                            const isSelected = selectedSpecialties.includes(specialty.id);
                            return (
                                <TouchableOpacity
                                    key={specialty.id}
                                    style={[
                                        styles.chip,
                                        { backgroundColor: isSelected ? style.background : '#f0f0f0', borderWidth: isSelected ? 1 : 0, borderColor: isSelected ? style.text : undefined },
                                        isSelected && styles.chipSelected
                                    ]}
                                    onPress={() => toggleSelection(specialty.id, selectedSpecialties, setSelectedSpecialties)}
                                >
                                    <Text style={[styles.chipText, { color: isSelected ? style.text : 'black' }]}>{specialty.name}</Text>
                                </TouchableOpacity>
                            )
                        })}
                    </View>
                </View>

                <View style={styles.filterSection}>
                    <Text style={styles.sectionTitle}>Giá tiền (VNĐ)</Text>
                    <View style={styles.rangeContainer}>
                        <TextInput
                            style={styles.rangeInput}
                            value={minPrice}
                            onChangeText={(text) => setMinPrice(formatMoney(text))}
                            keyboardType="number-pad"
                        />
                        <Text>-</Text>
                        <TextInput
                            style={styles.rangeInput}
                            value={maxPrice}
                            onChangeText={(text) => setMaxPrice(formatMoney(text))}
                            keyboardType="number-pad"
                        />
                    </View>
                </View>

                <View style={styles.filterSection}>
                    <Text style={styles.sectionTitle}>Thời lượng (phút)</Text>
                    <View style={styles.rangeContainer}>
                        <TextInput
                            style={styles.rangeInput}
                            value={minTime}
                            onChangeText={(text) => setMinTime(text.replace(/[^0-9]/g, ''))}
                            keyboardType="number-pad"
                        />
                        <Text>-</Text>
                        <TextInput
                            style={styles.rangeInput}
                            value={maxTime}
                            onChangeText={(text) => setMaxTime(text.replace(/[^0-9]/g, ''))}
                            keyboardType="number-pad"
                        />
                    </View>
                </View>

                <View style={styles.filterSection}>
                    <Text style={styles.sectionTitle}>Sắp xếp</Text>
                    <View style={styles.chipContainer}>
                        {sortOptions.map(option => {
                            const isSelected = selectedSort === option;
                            return (
                                <TouchableOpacity
                                    key={option.label}
                                    style={[
                                        styles.chip,
                                        { backgroundColor: isSelected ? "#EEF2FF" : '#f0f0f0', borderWidth: 1, borderColor: isSelected ? Colors.primary : "#E5E7EB" }
                                    ]}
                                    onPress={() => setSelectedSort(option)}
                                >
                                    <Text style={[styles.chipText, { color: isSelected ? Colors.primary : 'black' }]}>{option.label}</Text>
                                </TouchableOpacity>
                            )
                        })}
                    </View>
                </View>

                <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
                    <Text style={styles.searchButtonText}>Áp dụng</Text>
                </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'white',
        paddingHorizontal: 16,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        paddingTop: 10,
    },
    searchContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f0f0f0',
        borderRadius: 20,
        paddingHorizontal: 10,
        marginLeft: 10,
    },
    searchIcon: {
        marginRight: 5,
    },
    searchInput: {
        flex: 1,
        paddingVertical: 8,
    },
    filterSection: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: SIZES.medium,
        fontFamily: FONT.bold,
        marginBottom: 10,
    },
    chipContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    chip: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center'
    },
    chipSelected: {
        paddingVertical: 7,
        paddingHorizontal: 15,
    },
    chipText: {
        fontWeight: '500',
        fontSize: 14,
    },
    rangeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    rangeInput: {
        flex: 1,
        backgroundColor: '#f0f0f0',
        borderRadius: 10,
        padding: 10,
        textAlign: 'center',
        color: 'black',
    },
    searchButton: {
        backgroundColor: Colors.primary,
        padding: 15,
        borderRadius: 25,
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 40,
    },
    searchButtonText: {
        color: 'white',
        fontSize: SIZES.medium,
        fontFamily: FONT.bold,
    },
});

export default ServicePackageAndSeerSearchScreen;