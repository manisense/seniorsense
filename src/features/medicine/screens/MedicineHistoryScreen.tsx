import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Image } from 'react-native';
import { Text, Surface, Card, Searchbar, IconButton, Divider, ActivityIndicator, Button } from 'react-native-paper';
import { useTheme } from '../../../context/ThemeContext';
import { useTranslation } from '../../../hooks/useTranslation';
import { medicineHistoryService, MedicineHistoryItem } from '../../../services/supabase';
import { medicineHistoryLocalService } from '../../../services/medicineHistoryLocalService';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../navigation/types';
import { format } from 'date-fns';
import NetInfo from '@react-native-community/netinfo';
import supabase from '../../../services/supabase';

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
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const syncMedicineData = async (force = false) => {
    if (!isConnected && !force) {
      console.log('Not connected to network, skipping sync from history screen');
      return;
    }
    
    console.log('Starting medicine history sync from history screen');
    try {
      if (isSyncing) {
        console.log('Sync already in progress, skipping');
        return;
      }
      
      setIsSyncing(true);
      
      // First try bi-directional sync
      const syncResult = await medicineHistoryService.syncMedicineHistory();
      console.log('Medicine history sync result:', syncResult);
      
      // Even if sync wasn't successful, try to force-fetch from Supabase
      if (!syncResult.success) {
        console.log('Sync was not successful, attempting direct data fetch from Supabase');
        
        try {
          // Try to verify the session is valid first
          const { data: session } = await supabase.auth.getSession();
          if (session?.session?.access_token) {
            console.log('Session is valid, refreshing to ensure token is current');
            await supabase.auth.refreshSession();
          }
          
          // Now try to get data directly
          const { data, error } = await supabase
            .from('medicine_history')
            .select('*')
            .order('created_at', { ascending: false });
            
          if (!error && data && data.length > 0) {
            console.log(`Successfully retrieved ${data.length} records directly from Supabase`);
          } else if (error) {
            console.error('Error fetching data directly:', error);
          } else {
            console.log('No data found in direct fetch');
          }
        } catch (directError) {
          console.error('Error in direct fetch attempt:', directError);
        }
      }
      
      // Reload medicine history data after syncing
      await loadHistory();
      
      setIsSyncing(false);
    } catch (error) {
      console.error('Error syncing medicine history:', error);
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected);
      if (state.isConnected) {
        syncMedicineData();
      }
    });

    loadHistory();
    syncMedicineData();

    return () => {
      unsubscribe();
    };
  }, []);

  const loadHistory = async () => {
    setLoading(true);
    try {
      console.log('Loading medicine history in History screen...');
      
      // First try to get data from Supabase - always prioritize this
      let supabaseData: MedicineHistoryItem[] = [];
      if (isConnected) {
        try {
          console.log('Attempting to fetch data from Supabase first');
          supabaseData = await medicineHistoryService.getMedicineHistory();
          console.log(`Retrieved ${supabaseData.length} records from Supabase`);
        } catch (supabaseError) {
          console.error('Error loading from Supabase:', supabaseError);
        }
      }
      
      // If we got data from Supabase, use it as primary source
      if (supabaseData.length > 0) {
        console.log('Using Supabase data as primary source');
        
        // Also get local data to merge any items not yet synced
        const localHistory = await medicineHistoryLocalService.getMedicineHistory();
        
        // Find local items not in Supabase data
        const supabaseIds = new Set(supabaseData.map(item => item.id));
        const localOnlyItems = localHistory.filter(item => !supabaseIds.has(item.id));
        
        console.log(`Found ${localOnlyItems.length} local-only items to merge`);
        
        // Merge Supabase and unique local items
        const combinedData = [...supabaseData, ...localOnlyItems];
        
        // Sort by created_at date (newest first)
        combinedData.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        
        // Save all Supabase items to local storage for offline access
        console.log('Syncing Supabase data to local storage for offline access');
        for (const item of supabaseData) {
          await medicineHistoryLocalService.updateMedicineHistory(item);
        }
        
        setHistory(combinedData);
        setFilteredHistory(combinedData);
        setLoading(false);
        return;
      }
      
      // If no Supabase data, fall back to local storage
      console.log('No Supabase data found, falling back to local storage');
      const localHistory = await medicineHistoryLocalService.getMedicineHistory();
      console.log(`Retrieved ${localHistory.length} records from local storage`);
      
      // Sort by created_at date (newest first)
      localHistory.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      
      setHistory(localHistory);
      setFilteredHistory(localHistory);
    } catch (error) {
      console.error('Error loading medicine history:', error);
      
      try {
        // Fallback to local storage only in case of error
        console.log('Error occurred, using local storage as fallback');
        const localHistory = await medicineHistoryLocalService.getMedicineHistory();
        
        localHistory.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        
        setHistory(localHistory);
        setFilteredHistory(localHistory);
      } catch (localError) {
        console.error('Error loading local medicine history:', localError);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    if (isConnected) {
      await syncMedicineData();
    }
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
      await medicineHistoryLocalService.deleteMedicineHistory(id);
      
      if (isConnected) {
        await medicineHistoryService.deleteMedicineHistory(id);
      }
      
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