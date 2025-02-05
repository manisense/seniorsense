import React from 'react';
import { ScrollView, StyleSheet, View, Image, TouchableOpacity } from 'react-native';
import { Text, Surface } from 'react-native-paper';
import { useTheme } from '../context/ThemeContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/StackNavigator';

type FeedItem = {
  id: string;
  type: 'tip' | 'article' | 'exercise' | 'health' | 'technology';
  title: string;
  summary: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  iconColor: string;
  image: any;
  content: string;
  date: string;
};

const demoFeedData: FeedItem[] = [
  {
    id: '1',
    type: 'tip',
    title: 'Daily Health Tip',
    summary: 'Taking 10 minutes for mindful meditation each morning can help reduce stress and improve focus throughout your day.',
    icon: 'lightbulb',
    iconColor: '#FFD700',
    image: require('../assets/meditation.png'),
    content: 'Full meditation guide and benefits...',
    date: '2024-03-20'
  },
  {
    id: '2',
    type: 'article',
    title: 'Healthy Eating Habits',
    summary: 'Discover the benefits of a balanced diet and how it can improve your overall health and wellness.',
    icon: 'food-apple',
    iconColor: '#4CAF50',
    image: require('../assets/meditation.png'),
    content: 'Detailed article about nutrition...',
    date: '2024-03-19'
  },
  {
    id: '3',
    type: 'exercise',
    title: 'Daily Exercise Routine',
    summary: 'Simple exercises you can do at home to maintain flexibility and strength.',
    icon: 'run',
    iconColor: '#2196F3',
    image: require('../assets/meditation.png'),
    content: 'Full exercise routine guide...',
    date: '2024-03-18'
  },
  {
    id: '4',
    type: 'health',
    title: 'Daily Exercise Routine',
    summary: 'Simple exercises you can do at home to maintain flexibility and strength.',
    icon: 'run',
    iconColor: '#2196F3',
    image: require('../assets/meditation.png'),
    content: 'Full exercise routine guide...',
    date: '2024-03-18'
  },
];

// Update the navigation type
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const FeedCard = ({ item }: { item: FeedItem }) => {
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();

  return (
    <TouchableOpacity onPress={() => navigation.navigate('FeedDetail', { item })}>
      <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.cardHeader}>
          <MaterialCommunityIcons name={item.icon} size={24} color={theme.colors.primary} />
          <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
            {item.title}
          </Text>
        </View>
        <View style={styles.cardContent}>
          <Image source={item.image} style={styles.cardImage} />
          <Text style={[styles.cardText, { color: theme.colors.textSecondary }]}>
            {item.summary}
          </Text>
        </View>
        <Text style={[styles.dateText, { color: theme.colors.textSecondary }]}>
          {new Date(item.date).toLocaleDateString()}
        </Text>
      </Surface>
    </TouchableOpacity>
  );
};

const FeedScreen = () => {
  const { isDark } = useTheme();

  return (
    <ScrollView style={[styles.container, { backgroundColor: isDark ? '#1F2937' : '#F5F5F5' }]}>
      {demoFeedData.map((item) => (
        <FeedCard key={item.id} item={item} />
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  card: {
    margin: 16,
    padding: 16,
    borderRadius: 16,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  cardText: {
    flex: 1,
    fontSize: 14,
  },
  dateText: {
    fontSize: 12,
    marginTop: 8,
    textAlign: 'right',
  },
});

export default FeedScreen;