import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Colors } from '../../constants/theme';
import { DashboardStats, getDashboardStats } from '../../services/dashboard';
import { getSettings } from '../../services/settings';
import { Settings } from '../../types';

type PeriodTab = 'today' | 'week' | 'month';

export default function DashboardScreen() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState<PeriodTab>('today');

  async function load() {
    const [settingsData, statsData] = await Promise.all([
      getSettings(),
      getDashboardStats(),
    ]);
    setSettings(settingsData);
    setStats(statsData);
    setLoading(false);
  }

  useFocusEffect(useCallback(() => { load(); }, []));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, []);

  const currency = settings?.currency ?? 'PHP';

  // Pick the right period's numbers
  const financial = stats
    ? period === 'today'
      ? stats.today
      : period === 'week'
      ? stats.week
      : stats.month
    : { revenue: 0, expenses: 0, netProfit: 0 };

  const fmt = (n: number) =>
    n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  if (loading) {
    return (
      <View style={styles.centered}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.scroll}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Financial Summary Card */}
      <View style={styles.card}>
        {/* Period Tabs */}
        <View style={styles.periodTabs}>
          {(['today', 'week', 'month'] as PeriodTab[]).map((p) => (
            <TouchableOpacity
              key={p}
              style={[styles.periodTab, period === p && styles.periodTabActive]}
              onPress={() => setPeriod(p)}
            >
              <Text style={[
                styles.periodTabText,
                period === p && styles.periodTabTextActive,
              ]}>
                {p === 'today' ? 'Today' : p === 'week' ? 'This Week' : 'This Month'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Financial Rows */}
        <View style={styles.financialRow}>
          <Text style={styles.financialLabel}>Revenue</Text>
          <Text style={styles.financialValue}>{currency} {fmt(financial.revenue)}</Text>
        </View>
        <View style={styles.financialRow}>
          <Text style={styles.financialLabel}>Expenses</Text>
          <Text style={[styles.financialValue, { color: Colors.error }]}>
            {currency} {fmt(financial.expenses)}
          </Text>
        </View>
        <View style={[styles.financialRow, styles.profitRow]}>
          <Text style={styles.profitLabel}>Net Profit</Text>
          <Text style={[
            styles.profitValue,
            { color: financial.netProfit >= 0 ? Colors.success : Colors.error },
          ]}>
            {currency} {fmt(financial.netProfit)}
          </Text>
        </View>
      </View>

      {/* Quick Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats?.activeOrders ?? 0}</Text>
          <Text style={styles.statLabel}>Active Orders</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: Colors.warning }]}>
            {stats?.lowStockCount ?? 0}
          </Text>
          <Text style={styles.statLabel}>Low Stock</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: Colors.primary }]}>
            {stats?.productionCount ?? 0}
          </Text>
          <Text style={styles.statLabel}>Production</Text>
        </View>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { fontSize: 16, color: Colors.textMuted },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    margin: 16,
    padding: 16,
  },
  periodTabs: {
    flexDirection: 'row',
    backgroundColor: Colors.background,
    borderRadius: 10,
    padding: 4,
    marginBottom: 16,
    gap: 4,
  },
  periodTab: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: 'center',
  },
  periodTabActive: {
    backgroundColor: Colors.primary,
  },
  periodTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  periodTabTextActive: {
    color: '#fff',
  },
  financialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  financialLabel: {
    fontSize: 15,
    color: Colors.textSecondary,
  },
  financialValue: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  profitRow: {
    borderBottomWidth: 0,
    marginTop: 4,
  },
  profitLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  profitValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },
});