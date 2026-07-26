import { router, useFocusEffect } from 'expo-router';
import { AlertCircle, Banknote, ChevronRight, Clipboard, Flame, Menu, Receipt } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ActiveDeliveriesMap from '../../components/common/ActiveDeliveriesMap';
import { FadeInView } from '../../components/motion/FadeInView';
import { Button } from '../../components/ui/Button';
import { StatCard } from '../../components/ui/StatCard';
import { Fonts, Radius, Shadows, Spacing } from '../../constants/theme';
import { useTabBarHeight, useTabBarVisibility } from '../../contexts/TabBarVisibilityContext';
import { useTheme } from '../../contexts/ThemeContext';
import { ActiveDeliveryLocation, DashboardStats, getActiveDeliveryLocations, getDashboardStats } from '../../services/dashboard';
import { getSettings } from '../../services/settings';
import { Settings } from '../../types';
import { eventBus } from '../../utils/eventBus';

type PeriodTab = 'today' | 'week' | 'month';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function DashboardScreen() {
  const Colors = useTheme();
  const insets = useSafeAreaInsets();
  const { onScroll } = useTabBarVisibility();
  const tabBarHeight = useTabBarHeight();
  const styles = useMemo(() => getStyles(Colors), [Colors]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [deliveries, setDeliveries] = useState<ActiveDeliveryLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState<PeriodTab>('today');

  async function load() {
    const [settingsData, statsData, deliveryLocations] = await Promise.all([
      getSettings(),
      getDashboardStats(),
      getActiveDeliveryLocations(),
    ]);
    setSettings(settingsData);
    setStats(statsData);
    setDeliveries(deliveryLocations);
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
      onScroll={onScroll}
      scrollEventThrottle={16}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Greeting replaces the old native "Dashboard" header title. The
          native header is fully hidden for this tab now (see _layout.tsx)
          so we own the top safe-area inset and the menu icon ourselves —
          this removes the dead empty header-bar space the native header
          reserved even with the title blanked out. */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.two }]}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>
              {getGreeting()}{settings?.business_name ? `, ${settings.business_name}` : ''}
            </Text>
            <Text style={styles.dateText}>{todayLabel}</Text>
          </View>
          <TouchableOpacity onPress={() => eventBus.emit('sidebar:open')} hitSlop={12}>
            <Menu size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

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

      {/* Hero — the "big" tile in the bento grid, full width */}
      <FadeInView delay={0}>
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
      </FadeInView>

      {/* Three small tiles in a row — the size contrast against the hero
          above is what makes this read as a bento grid instead of a
          uniform list of identical cards. */}
      <View style={styles.statsRow}>
        <StatCard
          icon={Clipboard}
          value={String(stats?.activeOrders ?? 0)}
          label="Active orders"
          tone="#993C1D"
          onPress={() => router.push('/(tabs)/orders' as any)}
          delay={50}
          style={styles.statCardFlex}
        />
        <StatCard
          icon={AlertCircle}
          value={String(stats?.lowStockCount ?? 0)}
          label="Low stock"
          tone={Colors.warning}
          onPress={() => router.push('/(tabs)/inventory' as any)}
          delay={100}
          style={styles.statCardFlex}
        />
        <StatCard
          icon={Flame}
          value={String(stats?.productionCount ?? 0)}
          label="In production"
          tone="#854F0B"
          onPress={() => router.push('/(tabs)/production' as any)}
          delay={150}
          style={styles.statCardFlex}
        />
      </View>

      <FadeInView delay={180} style={styles.deliveryMapSection}>
        <View style={styles.deliveryMapHeader}>
          <Text style={styles.deliveryMapTitle}>Active Deliveries Today</Text>
          <Text style={styles.deliveryMapCount}>{deliveries.length}</Text>
        </View>
        {deliveries.length > 0 ? (
          <ActiveDeliveriesMap
            locations={deliveries}
            originLat={settings?.origin_lat ?? null}
            originLng={settings?.origin_lng ?? null}
          />
        ) : (
          <View style={styles.deliveryMapEmpty}>
            <Text style={styles.deliveryMapEmptyText}>No deliveries out today.</Text>
          </View>
        )}
      </FadeInView>

      <FadeInView delay={200} style={styles.quickActionWrap}>
        <Button
          label="Log expense"
          variant="secondary"
          onPress={() => router.push('/modals/expenses')}
        />
      </FadeInView>

      <View style={{ height: tabBarHeight + Spacing.two }} />
    </ScrollView>
  );
}

const getStyles = (Colors: Record<string, string>) => StyleSheet.create({
  scroll: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { fontSize: 16, color: Colors.textMuted },

  header: {
    marginHorizontal: Spacing.three,
    marginBottom: Spacing.two,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  greeting: {
    fontFamily: Fonts.bold,
    fontSize: 20,
    color: Colors.textPrimary,
  },
  dateText: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },

  periodTabs: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    padding: 4,
    marginHorizontal: Spacing.three,
    gap: 4,
  },
  periodTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: Radius.sm,
    alignItems: 'center',
  },
  periodTabActive: {
    backgroundColor: Colors.primary,
  },
  periodTabText: {
    fontFamily: Fonts.medium,
    fontSize: 12,
    color: Colors.textMuted,
  },
  periodTabTextActive: {
    color: '#fff',
  },

  heroCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    margin: Spacing.three,
    marginTop: Spacing.two + 4,
    padding: Spacing.four,
    alignItems: 'center',
    ...Shadows.sm,
  },
  heroLabel: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  heroValue: {
    fontFamily: Fonts.bold,
    fontSize: 32,
    marginBottom: Spacing.three,
  },
  heroDivider: {
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  heroSplitRow: {
    flexDirection: 'row',
    width: '100%',
    paddingTop: Spacing.two + 4,
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
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  heroSplitValue: {
    fontFamily: Fonts.medium,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  heroTapHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: Spacing.three - 2,
  },
  heroTapHintText: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: Colors.textMuted,
  },

  statsRow: {
    flexDirection: 'row',
    marginHorizontal: Spacing.three,
    gap: 10,
    marginBottom: Spacing.two,
  },
  statCardFlex: {
    flex: 1,
  },

  deliveryMapSection: {
    marginHorizontal: Spacing.three,
    marginBottom: Spacing.two,
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  deliveryMapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  deliveryMapTitle: {
    fontFamily: Fonts.medium,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  deliveryMapCount: {
    fontFamily: Fonts.bold,
    fontSize: 14,
    color: Colors.primary,
  },
  deliveryMapEmpty: {
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deliveryMapEmptyText: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: Colors.textMuted,
  },

  quickActionWrap: {
    marginHorizontal: Spacing.three,
    marginTop: Spacing.two,
  },
});