import { router, useFocusEffect } from 'expo-router';
import { Calendar as CalendarIcon, X } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ReportsCalendarDay, ReportsDayMarking } from '../../components/ReportsCalendarDay';
import { useTheme } from '../../contexts/ThemeContext';
import {
  DayIndicator,
  PeriodSummary,
  ProductPerformance,
  getDateRange,
  getMonthIndicators,
  getPeriodSummary,
  getProductPerformance,
} from '../../services/reports';
import { getSettings } from '../../services/settings';
import { formatDistance } from '../../utils/distance';

type PeriodTab = 'today' | 'week' | 'month' | 'all' | 'custom';

export default function ReportsModal() {
  const Colors = useTheme();
  const styles = useMemo(() => getStyles(Colors), [Colors]);
  const insets = useSafeAreaInsets();
  const now = new Date();

  const [currency, setCurrency] = useState('PHP');
  const [distanceUnit, setDistanceUnit] = useState<'km' | 'miles'>('km');
  const [period, setPeriod] = useState<PeriodTab>('month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  // Anchors "This Week"/"This Month" to a tapped calendar date instead of
  // always using the real current date. Reset to null by "Today".
  const [referenceDate, setReferenceDate] = useState<string | null>(null);

  const [calendarYear, setCalendarYear] = useState(now.getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(now.getMonth() + 1);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const todayDateStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const weekBandDates = useMemo(() => {
    if (period !== 'week') return [] as string[];
    const anchor = referenceDate ? new Date(referenceDate + 'T00:00:00') : new Date();
    const start = new Date(anchor);
    start.setDate(anchor.getDate() - anchor.getDay());
    const out: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
    }
    return out;
  }, [period, referenceDate]);

  const [indicators, setIndicators] = useState<Record<string, DayIndicator>>({});
  const [summary, setSummary] = useState<PeriodSummary | null>(null);
  const [products, setProducts] = useState<ProductPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(false);

  async function loadAll() {
    setLoading(true);
    const [ind, settings] = await Promise.all([
      getMonthIndicators(calendarYear, calendarMonth),
      getSettings(),
    ]);
    setIndicators(ind);
    if (settings?.currency) setCurrency(settings.currency);
    if (settings?.distance_unit) setDistanceUnit(settings.distance_unit);
    await loadPeriodData(period, customStart, customEnd, referenceDate ?? undefined);
    setLoading(false);
  }

  async function loadPeriodData(
    p: PeriodTab,
    cStart?: string,
    cEnd?: string,
    refDate?: string
  ) {
    setSummaryLoading(true);
    const { startDate, endDate } = getDateRange(
      p,
      cStart || undefined,
      cEnd || undefined,
      refDate
    );
    const [s, prod] = await Promise.all([
      getPeriodSummary(startDate, endDate),
      getProductPerformance(startDate, endDate),
    ]);
    setSummary(s);
    setProducts(prod);
    setSummaryLoading(false);
  }

  useFocusEffect(useCallback(() => { loadAll(); }, []));

  function handlePeriodChange(p: PeriodTab) {
    // "Today" always means the real current day — any other tab keeps
    // whatever date was last tapped on the calendar, so the highlighted
    // day on the calendar doesn't disappear when switching tabs.
    const nextReferenceDate = p === 'today' ? null : referenceDate;
    setPeriod(p);
    if (p === 'today') setSelectedDate(null);
    setReferenceDate(nextReferenceDate);
    loadPeriodData(p, customStart, customEnd, nextReferenceDate ?? undefined);
  }

  async function handleMonthChange(month: { year: number; month: number }) {
    setCalendarYear(month.year);
    setCalendarMonth(month.month);
    const ind = await getMonthIndicators(month.year, month.month);
    setIndicators(ind);
  }

  // Tapping a date sets it as a custom single-day range and updates summary.
  // It also becomes the anchor for "This Week"/"This Month" if picked next.
  function handleDayPress(day: { dateString: string }) {
    const date = day.dateString;
    setSelectedDate(date);
    setReferenceDate(date);
    setPeriod('custom');
    setCustomStart(date);
    setCustomEnd(date);
    loadPeriodData('custom', date, date);
  }

  function handleCustomEndEditing() {
    if (customStart && customEnd) {
      loadPeriodData('custom', customStart, customEnd);
    }
  }

  // markingType="custom" means react-native-calendars renders nothing on
  // its own — ReportsCalendarDay reads these fields directly per date.
  const markedDates: Record<string, ReportsDayMarking> = {};

  Object.entries(indicators).forEach(([date, ind]) => {
    const dots: ReportsDayMarking['dots'] = [];
    if (ind.hasProfit) dots.push({ key: 'profit', color: Colors.success });
    if (ind.hasLoss) dots.push({ key: 'loss', color: Colors.error });
    if (ind.hasDeliveries) dots.push({ key: 'delivery', color: Colors.info });
    if (dots.length > 0) markedDates[date] = { dots };
  });

  weekBandDates.forEach((date, idx) => {
    markedDates[date] = {
      ...(markedDates[date] ?? {}),
      weekBand: idx === 0 ? 'start' : idx === weekBandDates.length - 1 ? 'end' : 'middle',
    };
  });

  // In week mode, the band already shows the active range — a filled
  // "selected" circle on top of it would be redundant, so skip it.
  if (selectedDate && period !== 'week') {
    markedDates[selectedDate] = {
      ...(markedDates[selectedDate] ?? {}),
      selected: true,
    };
  }

  const fmt = (n: number) =>
    n.toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  

  // Label shown above the summary section
  function periodLabel(): string {
    const shortDate = (d: string) =>
      new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    if (period === 'today') return 'Today';
    if (period === 'week') {
      if (referenceDate) {
        const { startDate, endDate } = getDateRange('week', undefined, undefined, referenceDate);
        return `Week of ${shortDate(startDate)} – ${shortDate(endDate)}`;
      }
      return 'This Week';
    }
    if (period === 'month') {
      if (referenceDate) {
        return new Date(referenceDate + 'T00:00:00').toLocaleDateString('en-US', {
          month: 'long',
          year: 'numeric',
        });
      }
      return 'This Month';
    }
    if (period === 'all') return 'All Time';
    if (selectedDate) {
      return new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      });
    }
    if (customStart && customEnd) return `${customStart} → ${customEnd}`;
    return 'Custom Range';
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <X size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reports</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Calendar */}
        <View style={styles.calendarCard}>
          <Calendar
            key={Colors.background}
            current={`${calendarYear}-${String(calendarMonth).padStart(2, '0')}-01`}
            onMonthChange={handleMonthChange}
            onDayPress={handleDayPress}
            markingType="custom"
            markedDates={markedDates}
            dayComponent={(props: any) => (
              <ReportsCalendarDay
                {...props}
                isToday={props.date?.dateString === todayDateStr}
                otherMonth={props.date?.month !== calendarMonth}
                onPress={(d) => d && handleDayPress({ dateString: d.dateString })}
              />
            )}
            style={{ backgroundColor: Colors.card }}
            theme={{
              backgroundColor: Colors.card,
              calendarBackground: Colors.card,
              textSectionTitleColor: Colors.textMuted,
              selectedDayBackgroundColor: Colors.primary,
              selectedDayTextColor: '#fff',
              todayBackgroundColor: 'transparent',
              todayTextColor: Colors.primary,
              dayTextColor: Colors.textPrimary,
              monthTextColor: Colors.textPrimary,
              arrowColor: Colors.primary,
              textDayFontWeight: '500',
              textMonthFontWeight: '700',
              textDayHeaderFontWeight: '600',
              'stylesheet.day.multi-dot': {
                dot: {
                  width: 6,
                  height: 6,
                  marginTop: 1,
                  marginHorizontal: 1.5,
                  borderRadius: 3,
                },
              },
            } as any}
          />
          {/* Legend */}
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: Colors.success }]} />
              <Text style={styles.legendText}>Profit</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: Colors.error }]} />
              <Text style={styles.legendText}>Loss</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: Colors.info }]} />
              <Text style={styles.legendText}>Deliveries</Text>
            </View>
          </View>
        </View>

        {/* Period Tabs */}
        <View style={styles.periodCard}>
          <View style={styles.periodTabs}>
            {(['today', 'week', 'month', 'all'] as PeriodTab[]).map((p) => (
              <TouchableOpacity
                key={p}
                style={[
                  styles.periodTab,
                  period === p && styles.periodTabActive,
                ]}
                onPress={() => handlePeriodChange(p)}
              >
                <Text style={[
                  styles.periodTabText,
                  period === p && styles.periodTabTextActive,
                ]}>
                  {p === 'today' ? 'Today' : p === 'week' ? 'This Week' : p === 'month' ? 'This Month' : 'All Time'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Custom Range */}
          <TouchableOpacity
            style={[
              styles.customRangeBtn,
              period === 'custom' && styles.customRangeBtnActive,
            ]}
            onPress={() => {
              setSelectedDate(null);
              handlePeriodChange('custom');
            }}
          >
            <CalendarIcon
              size={14}
              color={period === 'custom' ? Colors.primary : Colors.textMuted}
            />
            <Text style={[
              styles.customRangeBtnText,
              period === 'custom' && { color: Colors.primary },
            ]}>
              {selectedDate ? `Viewing: ${periodLabel()}` : 'Custom Range'}
            </Text>
          </TouchableOpacity>

          {period === 'custom' && !selectedDate && (
            <View style={styles.customInputRow}>
              <View style={styles.customInputGroup}>
                <Text style={styles.customInputLabel}>From</Text>
                <TextInput
                  style={styles.customInput}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={Colors.textMuted}
                  value={customStart}
                  onChangeText={setCustomStart}
                  onEndEditing={handleCustomEndEditing}
                />
              </View>
              <View style={styles.customInputGroup}>
                <Text style={styles.customInputLabel}>To</Text>
                <TextInput
                  style={styles.customInput}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={Colors.textMuted}
                  value={customEnd}
                  onChangeText={setCustomEnd}
                  onEndEditing={handleCustomEndEditing}
                />
              </View>
            </View>
          )}
        </View>

        {/* Summary */}
        {loading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: 32 }} />
        ) : (
          <>
            <View style={styles.sectionCard}>
              <View style={styles.sectionTitleRow}>
                <Text style={styles.sectionTitle}>Summary</Text>
                <Text style={styles.periodLabelText}>{periodLabel()}</Text>
              </View>

              {summaryLoading ? (
                <ActivityIndicator color={Colors.primary} style={{ marginVertical: 16 }} />
              ) : (
                <>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Revenue</Text>
                    <Text style={styles.summaryValue}>
                      {currency} {fmt(summary?.revenue ?? 0)}
                    </Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Expenses</Text>
                    <Text style={[styles.summaryValue, { color: Colors.error }]}>
                      {currency} {fmt(summary?.expenses ?? 0)}
                    </Text>
                  </View>
                  <View style={[styles.summaryRow, styles.profitRow]}>
                    <Text style={styles.profitLabel}>Net Profit</Text>
                    <Text style={[
                      styles.profitValue,
                      {
                        color: (summary?.netProfit ?? 0) >= 0
                          ? Colors.success
                          : Colors.error,
                      },
                    ]}>
                      {currency} {fmt(summary?.netProfit ?? 0)}
                    </Text>
                  </View>
                  <View style={styles.divider} />
                  <View style={styles.statsGrid}>
                    <View style={styles.statItem}>
                      <Text style={styles.statNumber}>
                        {summary?.ordersDelivered ?? 0}
                      </Text>
                      <Text style={styles.statLabel}>Orders{'\n'}Delivered</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={styles.statNumber}>
                        {summary?.productsSold ?? 0}
                      </Text>
                      <Text style={styles.statLabel}>Products{'\n'}Sold</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={styles.statNumber}>
                        {currency} {fmt(summary?.averageOrderValue ?? 0)}
                      </Text>
                      <Text style={styles.statLabel}>Avg Order{'\n'}Value</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={styles.statNumber}>
                        {formatDistance(summary?.totalDeliveryDistanceKm ?? 0, distanceUnit)}
                      </Text>
                      <Text style={styles.statLabel}>Delivery{'\n'}Distance</Text>
                    </View>
                  </View>
                </>
              )}
            </View>

            {/* Best Selling Products */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Best Selling Products</Text>
              {summaryLoading ? (
                <ActivityIndicator color={Colors.primary} style={{ marginVertical: 16 }} />
              ) : products.length === 0 ? (
                <Text style={styles.emptyText}>No sales data for this period.</Text>
              ) : (
                products.map((p, index) => (
                  <View
                    key={`${p.productId}-${p.variantName}`}
                    style={[
                      styles.productRow,
                      index === products.length - 1 && { borderBottomWidth: 0 },
                    ]}
                  >
                    <View style={styles.productRank}>
                      <Text style={styles.productRankText}>{index + 1}</Text>
                    </View>
                    <View style={styles.productInfo}>
                      <Text style={styles.productName}>{p.productName}</Text>
                      {p.variantName ? (
                        <Text style={styles.variantName}>{p.variantName}</Text>
                      ) : null}
                    </View>
                    <View style={styles.productStats}>
                      <Text style={styles.productQty}>{p.totalQuantity} sold</Text>
                      <Text style={styles.productRevenue}>
                        {currency} {fmt(p.totalRevenue)}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const getStyles = (Colors: ReturnType<typeof useTheme>) => StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.card,
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: { width: 40, alignItems: 'flex-start' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  scroll: { flex: 1 },
  calendarCard: {
    backgroundColor: Colors.card,
    margin: 16,
    borderRadius: 14,
    overflow: 'hidden',
    paddingBottom: 12,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    paddingTop: 8,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 12, color: Colors.textMuted },
  periodCard: {
    backgroundColor: Colors.card,
    marginHorizontal: 16,
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },
  periodTabs: {
    flexDirection: 'row',
    backgroundColor: Colors.background,
    borderRadius: 10,
    padding: 4,
    gap: 4,
    marginBottom: 10,
  },
  periodTab: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: 'center',
  },
  periodTabActive: { backgroundColor: Colors.primary },
  periodTabText: { fontSize: 12, fontWeight: '600', color: Colors.textMuted },
  periodTabTextActive: { color: '#fff' },
  customRangeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  customRangeBtnActive: { borderColor: Colors.primary, backgroundColor: Colors.lowStockBackground },
  customRangeBtnText: { fontSize: 13, fontWeight: '500', color: Colors.textMuted },
  customInputRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  customInputGroup: { flex: 1 },
  customInputLabel: { fontSize: 12, color: Colors.textMuted, marginBottom: 4 },
  customInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  sectionCard: {
    backgroundColor: Colors.card,
    marginHorizontal: 16,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  periodLabelText: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  summaryLabel: { fontSize: 14, color: Colors.textSecondary },
  summaryValue: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  profitRow: { borderBottomWidth: 0, paddingTop: 12 },
  profitLabel: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  profitValue: { fontSize: 16, fontWeight: '700' },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: 14 },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  statItem: { flex: 1, alignItems: 'center' },
  statNumber: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 3,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingVertical: 16,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  productRank: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productRankText: { fontSize: 13, fontWeight: '700', color: Colors.textMuted },
  productInfo: { flex: 1 },
  productName: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  variantName: { fontSize: 12, color: Colors.textMuted, marginTop: 1 },
  productStats: { alignItems: 'flex-end' },
  productQty: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  productRevenue: { fontSize: 12, color: Colors.textMuted, marginTop: 1 },
});