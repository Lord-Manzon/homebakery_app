import { AlertCircle, Banknote, ChevronRight, Clipboard, Flame, PlusCircle, Receipt } from 'lucide-react-native';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { DashboardStats, getDashboardStats } from '../../services/dashboard';
import { getSettings } from '../../services/settings';
import { Settings } from '../../types';

type PeriodTab = 'today' | 'week' | 'month';

export default function DashboardScreen() {
  const Colors = useTheme();
  const styles = useMemo(() => getStyles(Colors), [Colors]);
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

  const periodLabel = period === 'today' ? 'today' : period === 'week' ? 'this week' : 'this month';
  const todayLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <ScrollView
      style={styles.scroll}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <Text style={styles.dateText}>{todayLabel}</Text>
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

      <TouchableOpacity
        style={styles.heroCard}
        activeOpacity={0.8}
        onPress={() => router.push('/modals/reports')}
      >
        <Text style={styles.heroLabel}>Net profit {periodLabel}</Text>
        <Text style={[
          styles.heroValue,
          { color: financial.netProfit >= 0 ? Colors.success : Colors.error },
        ]}>
          {currency} {fmt(financial.netProfit)}
        </Text>
        <View style={styles.heroDivider} />
        <View style={styles.heroSplitRow}>
          <View style={styles.heroSplitItem}>
            <Banknote size={15} color={Colors.textSecondary} />
            <Text style={styles.heroSplitLabel}>Revenue</Text>
            <Text style={styles.heroSplitValue}>{fmt(financial.revenue)}</Text>
          </View>
          <View style={styles.heroSplitDivider} />
          <View style={styles.heroSplitItem}>
            <Receipt size={15} color={Colors.textSecondary} />
            <Text style={styles.heroSplitLabel}>Expenses</Text>
            <Text style={styles.heroSplitValue}>{fmt(financial.expenses)}</Text>
          </View>
        </View>
        <View style={styles.heroTapHint}>
          <Text style={styles.heroTapHintText}>View full reports</Text>
          <ChevronRight size={14} color={Colors.textMuted} />
        </View>
      </TouchableOpacity>

      <View style={styles.statsGrid}>
        <TouchableOpacity
          style={styles.statCard}
          activeOpacity={0.8}
          onPress={() => router.push('/(tabs)/orders' as any)}
        >
          <View style={[styles.statIconWrap, { backgroundColor: '#FAECE7' }]}>
            <Clipboard size={18} color="#993C1D" />
          </View>
          <Text style={styles.statNumber}>{stats?.activeOrders ?? 0}</Text>
          <Text style={styles.statLabel}>Active orders</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.statCard}
          activeOpacity={0.8}
          onPress={() => router.push('/(tabs)/inventory' as any)}
        >
          <View style={[styles.statIconWrap, { backgroundColor: '#FFF3E0' }]}>
            <AlertCircle size={18} color={Colors.warning} />
          </View>
          <Text style={[styles.statNumber, { color: Colors.warning }]}>
            {stats?.lowStockCount ?? 0}
          </Text>
          <Text style={styles.statLabel}>Low stock</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.productionRow}
        activeOpacity={0.8}
        onPress={() => router.push('/(tabs)/production' as any)}
      >
        <View style={[styles.statIconWrap, { backgroundColor: '#FAEEDA' }]}>
          <Flame size={18} color="#854F0B" />
        </View>
        <Text style={styles.productionLabel}>In production</Text>
        <Text style={styles.productionValue}>{stats?.productionCount ?? 0}</Text>
        <ChevronRight size={16} color={Colors.textMuted} />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.quickAction}
        activeOpacity={0.8}
        onPress={() => router.push('/modals/expenses')}
      >
        <PlusCircle size={18} color={Colors.primary} />
        <Text style={styles.quickActionText}>Log expense</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const getStyles = (Colors: Record<string, string>) => StyleSheet.create({
  scroll: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { fontSize: 16, color: Colors.textMuted },

  dateText: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  periodTabs: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: 10,
    padding: 4,
    marginHorizontal: 16,
    gap: 4,
  },
  periodTab: {
    flex: 1,
    paddingVertical: 8,
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

  heroCard: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    margin: 16,
    marginTop: 12,
    padding: 20,
    alignItems: 'center',
  },
  heroLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  heroValue: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 16,
  },
  heroDivider: {
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  heroSplitRow: {
    flexDirection: 'row',
    width: '100%',
    paddingTop: 12,
  },
  heroSplitItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  heroSplitDivider: {
    width: 1,
    backgroundColor: Colors.border,
  },
  heroSplitLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  heroSplitValue: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  heroTapHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 14,
  },
  heroTapHintText: {
    fontSize: 12,
    color: Colors.textMuted,
  },

  statsGrid: {
    flexDirection: 'row',
    marginHorizontal: 16,
    gap: 10,
    marginBottom: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 14,
  },
  statIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },

  productionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 14,
  },
  productionLabel: {
    fontSize: 14,
    color: Colors.textPrimary,
    flex: 1,
  },
  productionValue: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginRight: 4,
  },
  quickAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 14,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
});