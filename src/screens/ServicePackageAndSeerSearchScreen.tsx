import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Colors from '../constants/colors';
import { getKnowledgeCategories } from '../services/api';

const SIZES = {
    medium: 16,
};

const FONT = {
    bold: 'inter-bold', // Assuming you have a bold version of inter font
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

const ServicePackageAndSeerSearchScreen = () => {
    const router = useRouter();
    const [searchText, setSearchText] = useState('');
    const [categories, setCategories] = useState<Array<{id: string, name: string}>>([]);
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
    const [minPrice, setMinPrice] = useState('');
    const [maxPrice, setMaxPrice] = useState('');
    const [minTime, setMinTime] = useState('');
    const [maxTime, setMaxTime] = useState('');
    const [selectedSort, setSelectedSort] = useState(sortOptions[0]);

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
        const params: any = {
            searchText: searchText || undefined,
            packageCategoryIds: selectedCategories.length > 0 ? selectedCategories : undefined,
            seerSpecialityIds: selectedSpecialties.length > 0 ? selectedSpecialties : undefined,
            minPrice: minPrice ? parseFloat(minPrice) : undefined,
            maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
            minTime: minTime ? parseInt(minTime) : undefined,
            maxTime: maxTime ? parseInt(maxTime) : undefined,
            sortBy: selectedSort.sortBy,
            sortType: selectedSort.sortType,
            status: 'AVAILABLE', // default to available
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
                    <Ionicons name="search" size={20} color="gray" style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Tìm tên dịch vụ, tên nhà tiên tri..."
                        value={searchText}
                        onChangeText={setSearchText}
                    />
                </View>
            </View>
            <ScrollView>
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
                            onChangeText={setMinPrice}
                            keyboardType="numeric"
                        />
                        <Text>-</Text>
                        <TextInput
                            style={styles.rangeInput}
                            value={maxPrice}
                            onChangeText={setMaxPrice}
                            keyboardType="numeric"
                        />
                    </View>
                </View>

                <View style={styles.filterSection}>
                    <Text style={styles.sectionTitle}>Thời lượng (phút)</Text>
                    <View style={styles.rangeContainer}>
                        <TextInput
                            style={styles.rangeInput}
                            value={minTime}
                            onChangeText={setMinTime}
                            keyboardType="numeric"
                        />
                        <Text>-</Text>
                        <TextInput
                            style={styles.rangeInput}
                            value={maxTime}
                            onChangeText={setMaxTime}
                            keyboardType="numeric"
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