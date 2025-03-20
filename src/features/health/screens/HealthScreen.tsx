import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { Text, Searchbar, FAB, Card, ActivityIndicator, DefaultTheme, PaperProvider } from 'react-native-paper';
import { useTranslation } from '../../../hooks/useTranslation';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../navigation/types';
import { medicineHistoryService, MedicineHistoryItem } from '../../../services/supabase';
import { medicineHistoryLocalService } from '../../../services/medicineHistoryLocalService';
import { useAuth } from '../../../context/AuthContext';
import NetInfo from '@react-native-community/netinfo';
import supabase from '../../../services/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// Create a custom theme that doesn't rely on level3
const customTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#2563EB',
    background: '#F5F5F5',
    surface: '#FFFFFF',
    surfaceVariant: '#F1F5F9',
    text: '#1E293B',
    outline: '#E5E7EB',
    onSurface: '#1E293B',
    secondary: '#64748B',
    error: '#EF4444',
  },
};

export const HealthScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();
  
  const [medicineHistory, setMedicineHistory] = useState<MedicineHistoryItem[]>([]);
  const [filteredHistory, setFilteredHistory] = useState<MedicineHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      const isUserLoggedIn = !!user;
      console.log(`Auth state changed. User logged in: ${isUserLoggedIn}`);
      setIsLoggedIn(isUserLoggedIn);
      
      // If user just logged in, schedule a sync after a short delay
      // This gives auth system time to fully establish the session
      if (isUserLoggedIn) {
        console.log('User logged in, scheduling sync in 2 seconds...');
        setTimeout(() => {
          syncMedicineData(true); // Force sync after login
        }, 2000);
      }
    };
    
    checkUser();
  }, [user]);

  useEffect(() => {
    if (isLoggedIn) {
      loadMedicineHistory();
    }
  }, [isLoggedIn]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (isLoggedIn) {
        loadMedicineHistory();
      }
    });
    
    return unsubscribe;
  }, [navigation, isLoggedIn]);

  useEffect(() => {
    // Setup network connectivity listener
    const netInfoUnsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected || false);
      // If we just got connected, trigger sync
      if (state.isConnected) {
        syncMedicineData();
      }
    });

    // Initial load
    loadMedicineHistory();
    // Initial sync attempt
    syncMedicineData();

    return () => {
      netInfoUnsubscribe();
    };
  }, []);

  const loadMedicineHistory = async () => {
    setLoading(true);
    try {
      console.log('Loading medicine history in Health screen...');
      
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
      
      // Also get local data in any case
      // console.log('Fetching local medicine history');
      // const localHistory = await medicineHistoryLocalService.getMedicineHistory();
      // console.log(`Retrieved ${localHistory.length} records from local storage`);
      
      // If we got data from Supabase, use it as primary source
      if (supabaseData.length > 0) {
        console.log('Using Supabase data as primary source');
        
        // Find local items not in Supabase data
        const supabaseIds = new Set(supabaseData.map(item => item.id));
        // const localOnlyItems = localHistory.filter(item => !supabaseIds.has(item.id));
        
        // console.log(`Found ${localOnlyItems.length} local-only items to merge`);
        
        // Merge Supabase and unique local items
        //const combinedData = [...supabaseData, ...localOnlyItems];
        
        // Sort by created_at date (newest first)
        supabaseData.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        
        // Remove any potential duplicates (matching by id)
        const uniqueItems = Array.from(
          new Map(supabaseData.map(item => [item.id, item])).values()
        );
        
        // IMPORTANT: We'll only update local items that already exist, not create new ones
        // This prevents creating duplicate entries in local storage
        for (const item of supabaseData) {
          try {
            // Only update existing items in local storage
            // const existingItem = localHistory.find(localItem => localItem.id === item.id);
            // if (existingItem) {
            //   // Just update the item if it exists
            //   await medicineHistoryLocalService.updateMedicineHistory(item);
            // }
          } catch (err) {
            console.error('Error updating item in local storage:', err);
          }
        }
        
        // Limit to recent items for the dashboard
        const recentItems = uniqueItems.slice(0, 5);
        setMedicineHistory(recentItems);
        setFilteredHistory(recentItems);
        
        // Extract unique medicine names for auto-suggest
        const uniqueNames = Array.from(new Set(recentItems.map(item => item.medicine_name)));
        setSuggestions(uniqueNames);
        
        setLoading(false);
        return;
      }
      
      // If no Supabase data, use only local storage
      console.log('No Supabase data found, using local storage only');
      
      // Remove any potential duplicates (matching by id)
      // const uniqueLocalItems = Array.from(
      //   new Map(localHistory.map(item => [item.id, item])).values()
      // );
      
      // Sort by created_at date (newest first)
      // uniqueLocalItems.sort((a, b) => 
      //   new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      // );
      
      // Limit to recent items for the Health dashboard
      // const recentItems = uniqueLocalItems.slice(0, 5);
      
      // setMedicineHistory(recentItems);
      // setFilteredHistory(recentItems);
      
      // Extract unique medicine names for auto-suggest feature
      // const uniqueNames = Array.from(new Set(recentItems.map(item => item.medicine_name)));
      // setSuggestions(uniqueNames);
    } catch (error) {
      console.error('Error loading medicine history:', error);
    } finally {
      setLoading(false);
    }
  };

  const syncMedicineData = async (force = false) => {
    if (!isConnected && !force) {
      console.log('Not connected to network, skipping sync');
      return;
    }
    
    // Add throttling - only sync once every 60 seconds unless forced
    const lastSyncTime = await AsyncStorage.getItem('LAST_SYNC_TIME');
    const now = Date.now();
    
    if (!force && lastSyncTime) {
      const timeSinceLastSync = now - parseInt(lastSyncTime);
      if (timeSinceLastSync < 60000) { // 60 seconds
        console.log(`Skipping sync - last sync was ${Math.floor(timeSinceLastSync/1000)} seconds ago`);
        return;
      }
    }
    
    console.log('Starting medicine history sync from health screen');
    try {
      // Set a flag to avoid multiple concurrent syncs
      if (isSyncing) {
        console.log('Sync already in progress, skipping');
        return;
      }
      
      setIsSyncing(true);
      
      // Save current time as last sync time
      await AsyncStorage.setItem('LAST_SYNC_TIME', now.toString());
      
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
          
          // Get the current user ID
          const { data: userData } = await supabase.auth.getUser();
          const userId = userData?.user?.id;
          
          if (!userId) {
            console.log('Could not determine user ID for direct data fetch');
            return;
          }
          
          // Now try to get data directly
          const { data, error } = await supabase
            .from('medicine_history')
            .select('*')
            .eq('user_id', userId) // Filter by current user ID
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
      await loadMedicineHistory();
      
      // Clear the sync flag
      setIsSyncing(false);
    } catch (error) {
      console.error('Error syncing medicine history:', error);
      setIsSyncing(false);
    }
  };

  const handleRefresh = async () => {
    if (!isLoggedIn) return;
    
    setRefreshing(true);
    await loadMedicineHistory();
    setRefreshing(false);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    
    // Show suggestions as user types
    if (query.length > 0) {
      const matchingSuggestions = suggestions.filter(name => 
        name.toLowerCase().includes(query.toLowerCase())
      );
      setSuggestions(matchingSuggestions);
      setShowSuggestions(matchingSuggestions.length > 0);
    } else {
      setShowSuggestions(false);
    }
    
    // Filter the history items
    if (!query.trim()) {
      setFilteredHistory(medicineHistory);
      return;
    }

    const filtered = medicineHistory.filter(item => 
      item.medicine_name.toLowerCase().includes(query.toLowerCase()) ||
      (item.response_text && item.response_text.toLowerCase().includes(query.toLowerCase()))
    );
    setFilteredHistory(filtered);
  };

  const handleSelectSuggestion = (suggestion: string) => {
    setSearchQuery(suggestion);
    setShowSuggestions(false);
    
    const filtered = medicineHistory.filter(item => 
      item.medicine_name.toLowerCase().includes(suggestion.toLowerCase())
    );
    setFilteredHistory(filtered);
  };

  const handleNavigateToMedicineIdentifier = () => {
    navigation.navigate('MedicineIdentifier');
  };

  const handleViewMedicineDetail = (id: string) => {
    navigation.navigate('MedicineHistoryDetail', { id });
  };

  const formatHistoryDate = (dateString: string) => {
    try {
      const now = new Date();
      const date = new Date(dateString);
      
      const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
      
      if (diffHours < 24) {
        return `${diffHours}h ago`;
      } else {
        const diffDays = Math.floor(diffHours / 24);
        return `${diffDays}d ago`;
      }
    } catch (e) {
      return dateString;
    }
  };

  const renderMedicineItem = ({ item }: { item: MedicineHistoryItem }) => {
    // Define shadow styles with direct values to avoid level3 issues
    const shadowStyle = {
      shadowColor: 'rgba(0, 0, 0, 0.1)',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 3,
    };

    return (
      <Card 
        style={[
          styles.medicineCard, 
          shadowStyle
        ]}
        onPress={() => handleViewMedicineDetail(item.id)}
      >
        <Card.Content>
          <View style={styles.medicineItemRow}>
            <View style={styles.pillIconContainer}>
              <MaterialCommunityIcons name="pill" size={28} color="#333" />
            </View>
            <View style={styles.medicineTextContainer}>
              <Text style={styles.medicineName}>
                {item.medicine_name}
              </Text>
              <Text style={styles.medicineDate}>
                Searched {formatHistoryDate(item.created_at)}
              </Text>
            </View>
          </View>
        </Card.Content>
      </Card>
    );
  };

  const renderLoginMessage = () => (
    <View style={styles.loginContainer}>
      <MaterialCommunityIcons 
        name="account-lock" 
        size={64} 
        color={customTheme.colors.primary} 
        style={styles.loginIcon}
      />
      <Text style={styles.loginTitle}>
        {t('auth.signInRequired')}
      </Text>
      <Text style={styles.loginMessage}>
        {t('medicineIdentifier.loginToViewHistory')}
      </Text>
      <TouchableOpacity 
        style={[styles.loginButton, { backgroundColor: customTheme.colors.primary }]}
        onPress={() => navigation.navigate('Profile')}
      >
        <Text style={[styles.loginButtonText, { color: '#FFFFFF' }]}>
          {t('auth.signIn')}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <MaterialCommunityIcons 
        name="pill"
        size={64} 
        color={customTheme.colors.secondary} 
        style={styles.emptyIcon}
      />
      <Text style={styles.emptyText}>
        {searchQuery ? t('medicineIdentifier.noResultsFound') : t('medicineIdentifier.historyEmpty')}
      </Text>
      <Text style={styles.emptySubtext}>
        {t('medicineIdentifier.identifyToAddHistory')}
      </Text>
      <TouchableOpacity 
        style={[styles.scanButton, { backgroundColor: customTheme.colors.primary }]}
        onPress={handleNavigateToMedicineIdentifier}
      >
        <MaterialCommunityIcons name="camera" size={24} color="#FFFFFF" />
        <Text style={[styles.scanButtonText, { color: '#FFFFFF' }]}>
          {t('medicineIdentifier.scan')}
        </Text>
      </TouchableOpacity>
    </View>
  );

  if (!isLoggedIn) {
    return (
      <PaperProvider theme={customTheme}>
        <View style={styles.container}>
          {renderLoginMessage()}
        </View>
      </PaperProvider>
    );
  }

  return (
    <PaperProvider theme={customTheme}>
      <View style={styles.container}>
        <View style={styles.searchContainer}>
          <Searchbar
            placeholder={t('medicineIdentifier.searchMedicines')}
            onChangeText={handleSearch}
            value={searchQuery}
            style={styles.searchBar}
            inputStyle={{ color: customTheme.colors.text }}
            iconColor={customTheme.colors.primary}
          />
          
          {/* Auto-suggest dropdown */}
          {showSuggestions && (
            <Card style={styles.suggestionsCard}>
              <FlatList
                data={suggestions}
                keyExtractor={(item: string) => item}
                renderItem={({ item }: { item: string }) => (
                  <TouchableOpacity 
                    style={styles.suggestionItem}
                    onPress={() => handleSelectSuggestion(item)}
                  >
                    <Text>{item}</Text>
                  </TouchableOpacity>
                )}
              />
            </Card>
          )}
        </View>

        <View style={styles.identifierCard}>
          <View style={styles.identifierTextContainer}>
            <Text style={styles.identifierTitle}>
              Identify Your Medicine
            </Text>
            <Text style={styles.identifierSubtitle}>
              Scan or take a photo of your medicine
            </Text>
          </View>
          <TouchableOpacity 
            style={[styles.cameraButton, { backgroundColor: customTheme.colors.primary }]}
            onPress={handleNavigateToMedicineIdentifier}
          >
            <MaterialCommunityIcons name="camera" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={customTheme.colors.primary} />
            <Text style={styles.loadingText}>
              {t('medicineIdentifier.loadingHistory')}
            </Text>
          </View>
        ) : (
          <>
            {filteredHistory.length > 0 ? (
              <FlatList
                data={filteredHistory}
                renderItem={renderMedicineItem}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                  <RefreshControl 
                    refreshing={refreshing} 
                    onRefresh={handleRefresh}
                    colors={[customTheme.colors.primary]}
                  />
                }
              />
            ) : (
              renderEmptyList()
            )}
          </>
        )}

        <FAB
          icon="camera"
          style={[
            styles.fab, 
            { 
              backgroundColor: customTheme.colors.primary,
              // Avoid level3 by using direct shadow values
              shadowColor: 'rgba(0, 0, 0, 0.1)',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 3.84,
              elevation: 4,
            }
          ]}
          onPress={handleNavigateToMedicineIdentifier}
          color="#FFFFFF"
        />
      </View>
    </PaperProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  searchContainer: {
    padding: 16,
    position: 'relative',
    zIndex: 10,
  },
  searchBar: {
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  suggestionsCard: {
    position: 'absolute',
    top: 70,
    left: 16,
    right: 16,
    zIndex: 20,
    maxHeight: 200,
    backgroundColor: '#FFFFFF',
  },
  suggestionItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  identifierCard: {
    marginHorizontal: 16,
    marginBottom: 20,
    padding: 20,
    backgroundColor: '#000000',
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  identifierTextContainer: {
    flex: 1,
  },
  identifierTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  identifierSubtitle: {
    fontSize: 14,
    marginTop: 4,
    color: '#DDDDDD',
  },
  cameraButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
    paddingBottom: 80,
  },
  medicineCard: {
    marginBottom: 16,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  medicineItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pillIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  medicineTextContainer: {
    flex: 1,
  },
  medicineName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  medicineDate: {
    fontSize: 14,
    marginTop: 4,
    color: '#64748B',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#1E293B',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  emptyIcon: {
    marginBottom: 16,
    opacity: 0.6,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#64748B',
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    color: '#64748B',
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
  },
  scanButtonText: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    borderRadius: 28,
  },
  loginContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loginIcon: {
    marginBottom: 16,
  },
  loginTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
    color: '#1E293B',
  },
  loginMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    color: '#64748B',
  },
  loginButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  loginButtonText: {
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default HealthScreen;