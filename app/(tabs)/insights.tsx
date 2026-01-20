import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { showMessage } from 'react-native-flash-message';
import { logRepository } from '../../repositories/logRepository';
import { Log } from '../../services/api';

interface CategoryTotal {
  category: string;
  totalCalories: number;
}

export default function InsightsScreen() {
  const [topCategories, setTopCategories] = useState<CategoryTotal[]>([]);
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const logs = await logRepository.getAllLogs();
      const top3 = computeTopCategories(logs);
      setTopCategories(top3);
    } catch (error) {
      console.error('[UI] Error loading insights:', error);
      showMessage({
        message: 'Error',
        description: 'Failed to load category insights',
        type: 'danger',
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  // Reload every time the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const computeTopCategories = (logs: Log[]): CategoryTotal[] => {
    const categoryMap = new Map<string, number>();

    logs.forEach((log) => {
      const currentTotal = categoryMap.get(log.category) || 0;
      categoryMap.set(log.category, currentTotal + log.amount);
    });

    const result: CategoryTotal[] = [];
    categoryMap.forEach((totalCalories, category) => {
      result.push({ category, totalCalories });
    });

    // Sort descending and take top 3
    result.sort((a, b) => b.totalCalories - a.totalCalories);
    return result.slice(0, 3);
  };

  const renderItem = ({ item, index }: { item: CategoryTotal; index: number }) => {
    const medals = ['🥇', '🥈', '🥉'];
    return (
      <View style={styles.item}>
        <Text style={styles.medal}>{medals[index]}</Text>
        <View style={styles.itemContent}>
          <Text style={styles.category}>{item.category}</Text>
          <Text style={styles.total}>{item.totalCalories.toFixed(1)} cal</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Top 3 Categories by Calories</Text>
      <Text style={styles.subtitle}>Categories with highest total calories</Text>

      {loading && <ActivityIndicator size="large" style={styles.loader} />}

      <FlatList
        data={topCategories}
        keyExtractor={(item) => item.category}
        renderItem={renderItem}
        refreshing={loading}
        onRefresh={loadData}
        ListEmptyComponent={<Text style={styles.empty}>No data available</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', marginTop: 40 },
  subtitle: { fontSize: 14, color: '#666', marginBottom: 16 },
  loader: { marginVertical: 16 },
  item: { flexDirection: 'row', padding: 20, borderBottomWidth: 1, borderBottomColor: '#eee', alignItems: 'center' },
  medal: { fontSize: 32, marginRight: 16 },
  itemContent: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  category: { fontSize: 18, fontWeight: '500' },
  total: { fontSize: 18, fontWeight: 'bold', color: '#007AFF' },
  empty: { textAlign: 'center', marginTop: 32, color: '#666' },
});
