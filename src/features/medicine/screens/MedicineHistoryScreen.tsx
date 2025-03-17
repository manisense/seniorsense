import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Image } from 'react-native';
import { Text, Surface, Card, Searchbar, IconButton, Divider, ActivityIndicator, Button } from 'react-native-paper';
import { useTheme } from '../../../context/ThemeContext';
import { useTranslation } from '../../../hooks/useTranslation';
import { medicineHistoryService, MedicineHistoryItem } from '../../../services/supabase';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../navigation/StackNavigator';
import { format } from 'date-fns';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const MedicineHistoryScreen = () => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp>();
  const [history, setHistory] = useState<MedicineHistoryItem[]>([]);
  const [filteredHistory, setFilteredHistory] = useState<MedicineHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const data = await medicineHistoryService.getMedicineHistory();
      setHistory(data);
      setFilteredHistory(data);
    } catch (error) {
      console.error('Error loading medicine history:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadHistory();
    setRefreshing(false);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setFilteredHistory(history);
      return;
    }

    const filtered = history.filter(item => 
      item.medicine_name.toLowerCase().includes(query.toLowerCase()) ||
      item.response_text.toLowerCase().includes(query.toLowerCase())
    );
    setFilteredHistory(filtered);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setFilteredHistory(history);
  };

  const handleViewDetails = (item: MedicineHistoryItem) => {
    navigation.navigate('MedicineHistoryDetail', { id: item.id });
  };

  const handleDeleteItem = async (id: string) => {
    try {
      const success = await medicineHistoryService.deleteMedicineHistory(id);
      if (success) {
        // Remove from local state
        const updatedHistory = history.filter(item => item.id !== id);
        setHistory(updatedHistory);
        setFilteredHistory(
          searchQuery ? 
            updatedHistory.filter(item => 
              item.medicine_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
              item.response_text.toLowerCase().includes(searchQuery.toLowerCase())
            ) : 
            updatedHistory
        );
      }
    } catch (error) {
      console.error('Error deleting history item:', error);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy h:mm a');
    } catch (e) {
      return dateString;
    }
  };

  const renderHistoryItem = ({ item }: { item: MedicineHistoryItem }) => (
    <Card 
      style={[styles.historyCard, { backgroundColor: theme.colors.surface }]}
      onPress={() => handleViewDetails(item)}
    >
      <Card.Content style={styles.cardContent}>
        {item.image_url && (
          <Image 
            source={{ uri: item.image_url }} 
            style={styles.thumbnail}
            resizeMode="cover"
          />
        )}
        <View style={styles.textContent}>
          <Text 
            variant="titleMedium" 
            style={[styles.medicineName, { color: theme.colors.primary }]}
            numberOfLines={1}
          >
            {item.medicine_name}
          </Text>
          <Text 
            style={[styles.responsePreview, { color: theme.colors.text }]}
            numberOfLines={2}
          >
            {item.response_text}
          </Text>
          <Text 
            style={[styles.dateText, { color: theme.colors.textSecondary }]}
          >
            {formatDate(item.created_at)}
          </Text>
        </View>
        <IconButton
          icon="delete"
          size={20}
          iconColor={theme.colors.error}
          onPress={() => handleDeleteItem(item.id)}
          style={styles.deleteButton}
        />
      </Card.Content>
    </Card>
  );

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
        {searchQuery ? t('medicineIdentifier.noResultsFound') : t('medicineIdentifier.historyEmpty')}
      </Text>
      {!searchQuery && (
        <Text style={[styles.emptySubtext, { color: theme.colors.textSecondary }]}>
          {t('medicineIdentifier.identifyToAddHistory')}
        </Text>
      )}
    </View>
  );

  return (
    <Surface style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Searchbar
        placeholder={t('medicineIdentifier.searchMedicines')}
        onChangeText={handleSearch}
        value={searchQuery}
        style={[styles.searchBar, { backgroundColor: theme.colors.surfaceVariant }]}
        inputStyle={{ color: theme.colors.text }}
        iconColor={theme.colors.primary}
        clearIcon={() => searchQuery ? 
          <IconButton icon="close" size={20} onPress={handleClearSearch} /> : 
          <View />
        }
      />

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.text }]}>
            {t('medicineIdentifier.loadingHistory')}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredHistory}
          renderItem={renderHistoryItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <Divider style={styles.divider} />}
          ListEmptyComponent={renderEmptyList}
          onRefresh={handleRefresh}
          refreshing={refreshing}
        />
      )}
    </Surface>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchBar: {
    margin: 16,
    elevation: 2,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    flexGrow: 1,
  },
  historyCard: {
    marginVertical: 8,
    borderRadius: 12,
    elevation: 2,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  textContent: {
    flex: 1,
  },
  medicineName: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  responsePreview: {
    fontSize: 14,
    marginBottom: 4,
  },
  dateText: {
    fontSize: 12,
  },
  deleteButton: {
    margin: 0,
  },
  divider: {
    height: 1,
    marginVertical: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
});

export default MedicineHistoryScreen; 