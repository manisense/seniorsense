import React from 'react';
import { ScrollView, StyleSheet, View, Image } from 'react-native';
import { Text, Surface } from 'react-native-paper';
import { useTheme } from '../context/ThemeContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

type RootStackParamList = {
  FeedDetail: { item: any };
};

type Props = NativeStackScreenProps<RootStackParamList, 'FeedDetail'>;

const FeedDetailScreen = ({ route }: Props) => {
  const { item } = route.params;
  const { theme } = useTheme();

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        <Image source={item.image} style={styles.headerImage} />
        <View style={styles.content}>
          <View style={styles.titleContainer}>
            <MaterialCommunityIcons 
              name={item.icon} 
              size={32} 
              color={theme.colors.primary} 
            />
            <Text style={[styles.title, { color: theme.colors.text }]}>
              {item.title}
            </Text>
          </View>
          <Text style={[styles.date, { color: theme.colors.textSecondary }]}>
            {new Date(item.date).toLocaleDateString()}
          </Text>
          <Text style={[styles.body, { color: theme.colors.text }]}>
            {item.content}
          </Text>
        </View>
      </Surface>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  card: {
    margin: 16,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 2,
  },
  headerImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  content: {
    padding: 16,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginLeft: 12,
  },
  date: {
    fontSize: 14,
    marginBottom: 16,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
  },
});

export default FeedDetailScreen; 