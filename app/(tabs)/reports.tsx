import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { showMessage } from 'react-native-flash-message';
import { logRepository } from '../../repositories/logRepository';
import { Log } from '../../services/api';

interface MonthlyTotal {
  month: string;
  totalCalories: number;
}

export default function ReportsScreen() {
  const [monthlyData, setMonthlyData] = useState<MonthlyTotal[]>([]);
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const logs = await logRepository.getAllLogs();
      const totals = computeMonthlyTotals(logs);
      setMonthlyData(totals);
    } catch (error) {
      console.error('[UI] Error loading monthly analysis:', error);
      showMessage({
        message: 'Error',
        description: 'Failed to load monthly calorie analysis',
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

  const computeMonthlyTotals = (logs: Log[]): MonthlyTotal[] => {
    const monthMap = new Map<string, number>();

    logs.forEach((log) => {
      const month = log.date.substring(0, 7); // YYYY-MM
      const currentTotal = monthMap.get(month) || 0;
      // For intake, add; for burn, subtract
      const amount = log.type === 'intake' ? log.amount : -log.amount;
      monthMap.set(month, currentTotal + amount);
    });

    const result: MonthlyTotal[] = [];
    monthMap.forEach((totalCalories, month) => {
      result.push({ month, totalCalories });
    });

    // Sort descending by total calories
    result.sort((a, b) => b.totalCalories - a.totalCalories);
    return result;
  };

  const renderItem = ({ item, index }: { item: MonthlyTotal; index: number }) => (
    <View style={styles.item}>
      <Text style={styles.rank}>#{index + 1}</Text>
      <View style={styles.itemContent}>
        <Text style={styles.month}>{item.month}</Text>
        <Text style={[styles.total, item.totalCalories >= 0 ? styles.positive : styles.negative]}>
          {item.totalCalories >= 0 ? '+' : ''}{item.totalCalories.toFixed(1)} cal
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Monthly Calorie Analysis</Text>
      <Text style={styles.subtitle}>Net calories by month (descending)</Text>

      {loading && <ActivityIndicator size="large" style={styles.loader} />}

      <FlatList
        data={monthlyData}
        keyExtractor={(item) => item.month}
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
  item: { flexDirection: 'row', padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee', alignItems: 'center' },
  rank: { fontSize: 18, fontWeight: 'bold', color: '#007AFF', marginRight: 16, width: 40 },
  itemContent: { flex: 1, flexDirection: 'row', justifyContent: 'space-between' },
  month: { fontSize: 16 },
  total: { fontSize: 16, fontWeight: 'bold' },
  positive: { color: '#34c759' },
  negative: { color: '#ff3b30' },
  empty: { textAlign: 'center', marginTop: 32, color: '#666' },
});
