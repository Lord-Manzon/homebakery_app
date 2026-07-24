import { router, useFocusEffect } from 'expo-router';
import { AlertCircle, Bike, Clock, MapPin, Receipt, Store, type LucideIcon } from 'lucide-react-native';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import FAB from '../../components/common/FAB';
import { PressableScale } from '../../components/motion/PressableScale';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { Radius } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { getOrderItemsSummary, getOrders, groupOrdersByDate, markDelivered, updatePaymentStatus } from '../../services/orders';
import { Order } from '../../types';

type TabType = 'active' | 'completed';
type FilterType = 'delivery' | 'pickup' | 'unpaid';

// Converts a "HH:MM:SS" (24-hour) time string into "h:mm AM/PM".
function formatTime(time: string): string {
  const [hourStr, minuteStr] = time.split(':');
  const hour = parseInt(hourStr, 10);
  const period = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:${minuteStr} ${period}`;
}

export default function OrdersScreen() {
  const Colors = useTheme();
  const styles = useMemo(() => getStyles(Colors), [Colors]);
  const [activeTab, setActiveTab] = useState<TabType>('active');
  const [orders, setOrders] = useState<Order[]>([]);
  const [itemSummaries, setItemSummaries] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilters, setActiveFilters] = useState<Set<FilterType>>(new Set());
  const [collapsibleHeight, setCollapsibleHeight] = useState(0);
  const [measured, setMeasured] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;
  const listRef = useRef<any>(null);
  const [confirm, setConfirm] = useState<{
    title: string;
    message: string;
    actionLabel: string;
    destructive?: boolean;
    onConfirm: () => void;
  } | null>(null);

  async function load(tab: TabType = activeTab) {
    const data = await getOrders(tab);
    setOrders(data);
    const summaries = await getOrderItemsSummary(data.map((o) => o.id));
    setItemSummaries(summaries);
    setLoading(false);
  }

  useFocusEffect(
    useCallback(() => {
      load(activeTab);
    }, [activeTab])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [activeTab]);

  async function handleTabChange(tab: TabType) {
    setActiveTab(tab);
    setMeasured(false);
    scrollY.setValue(0);
    listRef.current?.scrollToLocation?.({
      sectionIndex: 0,
      itemIndex: 0,
      animated: false,
      viewOffset: 0,
    });
    setLoading(true);
    await load(tab);
  }

  function toggleFilter(filter: FilterType) {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(filter)) {
        next.delete(filter);
      } else {
        next.add(filter);
      }
      return next;
    });
  }

  function handleMarkPaid(order: Order) {
    setConfirm({
      title: 'Mark as Paid',
      message: `Mark ${order.customer_name}'s order as paid?`,
      actionLabel: 'Mark Paid',
      onConfirm: async () => {
        await updatePaymentStatus(order.id, 'paid');
        setConfirm(null);
        await load();
      },
    });
  }

  function handleMarkDelivered(order: Order) {
    setConfirm({
      title: 'Mark as Delivered',
      message: `Mark ${order.customer_name}'s order as delivered?`,
      actionLabel: 'Mark Delivered',
      onConfirm: async () => {
        await markDelivered(order.id);
        setConfirm(null);
        await load(activeTab);
      },
    });
  }

  

  const filteredOrders = orders.filter((o) => {
    const wantsDelivery = activeFilters.has('delivery');
    const wantsPickup = activeFilters.has('pickup');
    const wantsUnpaid = activeFilters.has('unpaid');

    if (wantsDelivery || wantsPickup) {
      const matchesType =
        (wantsDelivery && o.order_type === 'delivery') ||
        (wantsPickup && o.order_type === 'pickup');
      if (!matchesType) return false;
    }
    if (wantsUnpaid && o.payment_status !== 'unpaid') return false;

    return true;
  });

  const grouped = groupOrdersByDate(filteredOrders);

  const sections = grouped.map((group) => ({
    title: group.label,
    count: group.orders.length,
    data: group.orders,
  }));

  const totalRevenue = orders.reduce((sum, o) => sum + o.total_amount, 0);
  const paidCount = orders.filter((o) => o.payment_status === 'paid').length;
  const unpaidCount = orders.filter((o) => o.payment_status === 'unpaid').length;

  const FILTER_CHIPS: { key: FilterType; label: string; icon: LucideIcon }[] = [
    { key: 'delivery', label: 'Delivery', icon: Bike },
    { key: 'pickup', label: 'Pickup', icon: Store },
    { key: 'unpaid', label: 'Unpaid', icon: AlertCircle },
  ];

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    { useNativeDriver: true }
  );

  const headerTranslateY = collapsibleHeight > 0
    ? scrollY.interpolate({
        inputRange: [0, collapsibleHeight],
        outputRange: [0, -collapsibleHeight],
        extrapolate: 'clamp',
      })
    : 0;
  const headerOpacity = collapsibleHeight > 0
    ? scrollY.interpolate({
        inputRange: [0, collapsibleHeight * 0.7],
        outputRange: [1, 0],
        extrapolate: 'clamp',
      })
    : 1;

  // The header content (hero + tabs + filters) — rendered once here so the
  // measuring pass and the real floating version stay perfectly in sync.
  function renderHeaderContent() {
    return (
      <>
        {activeTab === 'active' && (
          <View style={styles.heroCard}>
            <Text style={styles.heroLabel}>Expected</Text>
            <Text style={styles.heroValue}>₱{totalRevenue.toFixed(2)}</Text>
            <View style={styles.heroDivider} />
            <View style={styles.heroSplitRow}>
              <View style={styles.heroSplitItem}>
                <Text style={styles.heroSplitValue}>{orders.length}</Text>
                <Text style={styles.heroSplitLabel}>Active</Text>
              </View>
              <View style={styles.heroSplitDivider} />
              <View style={styles.heroSplitItem}>
                <Text style={[styles.heroSplitValue, { color: Colors.success }]}>{paidCount}</Text>
                <Text style={styles.heroSplitLabel}>Paid</Text>
              </View>
              <View style={styles.heroSplitDivider} />
              <View style={styles.heroSplitItem}>
                <Text style={[styles.heroSplitValue, { color: Colors.error }]}>{unpaidCount}</Text>
                <Text style={styles.heroSplitLabel}>Unpaid</Text>
              </View>
            </View>
          </View>
        )}

        <View style={styles.tabs}>
          {(['active', 'completed'] as TabType[]).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => handleTabChange(tab)}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab && styles.tabTextActive,
                ]}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.filterRow}>
          {FILTER_CHIPS.map((chip) => {
            const active = activeFilters.has(chip.key);
            return (
              <TouchableOpacity
                key={chip.key}
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => toggleFilter(chip.key)}
              >
                <chip.icon
                  size={14}
                  color={active ? '#fff' : Colors.textSecondary}
                />
                <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                  {chip.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </>
    );
  }

  return (
    <View style={styles.container}>

      {/* Invisible measuring pass — renders once to learn the header's
          real height, then never shows again (measured stays true). */}
      {!measured && (
        <View
          key={activeTab}
          style={styles.measureWrap}
          onLayout={(e) => {
            setCollapsibleHeight(e.nativeEvent.layout.height);
            setMeasured(true);
          }}
        >
          {renderHeaderContent()}
        </View>
      )}

      {/* Floating header — slides up and fades as the list scrolls beneath it */}
      {measured && (
        <Animated.View
          style={[
            styles.collapsibleHeader,
            {
              transform: [{ translateY: headerTranslateY }],
              opacity: headerOpacity,
            },
          ]}
        >
          {renderHeaderContent()}
        </Animated.View>
      )}

      {/* Orders List */}
      {loading ? (
        <View style={[styles.centered, { paddingTop: collapsibleHeight }]}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      ) : sections.length === 0 ? (
        <View style={[styles.centered, { paddingTop: collapsibleHeight }]}>
          <Receipt size={48} color={Colors.border} />
          <Text style={styles.emptyText}>
            {orders.length === 0 ? `No ${activeTab} orders` : 'No orders match these filters'}
          </Text>
          {activeTab === 'active' && orders.length === 0 && (
            <Text style={styles.emptySubtext}>
              Tap + to create your first order
            </Text>
          )}
        </View>
      ) : (
        <Animated.SectionList
          ref={listRef}
          sections={sections}
          keyExtractor={(item: Order) => item.id}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          contentContainerStyle={{ paddingTop: collapsibleHeight }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          renderSectionHeader={({ section }: { section: { title: string; count: number } }) => (
            <View style={styles.sectionHeader}>
              <View style={styles.sectionDot} />
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <Text style={styles.sectionCount}>
                · {section.count} {section.count === 1 ? 'order' : 'orders'}
              </Text>
            </View>
          )}
          renderItem={({ item }: { item: Order }) => (
            <PressableScale
              style={styles.cardWrap}
              onPress={() =>
                router.push({
                  pathname: '/modals/order-detail',
                  params: { id: item.id },
                })
              }
            >
              <Card>
              <View style={styles.cardTop}>
                <Text style={styles.customerName} numberOfLines={1}>{item.customer_name}</Text>
                <View style={styles.badges}>
                  <Badge
                    label={item.order_type === 'delivery' ? '🛵 Delivery' : '🏠 Pickup'}
                    tone={item.order_type === 'delivery' ? 'info' : 'success'}
                  />
                  <Badge
                    label={item.payment_status === 'paid' ? '✓ Paid' : 'Unpaid'}
                    tone={item.payment_status === 'paid' ? 'success' : 'error'}
                  />
                  {item.is_delivered && (
                    <Badge
                      label="🚚 Delivered"
                      color={{ bg: Colors.primarySoft + '33', text: Colors.primary }}
                    />
                  )}
                </View>
              </View>

              {itemSummaries[item.id] && (
                <Text style={styles.itemSummary} numberOfLines={1}>
                  {itemSummaries[item.id]}
                </Text>
              )}

              <View style={styles.cardBottom}>
                <View style={styles.cardBottomLeft}>
                  {item.delivery_time && (
                    <Text style={styles.deliveryTime}>
                      <Clock size={12} color={Colors.textMuted} />
                      {' '}{formatTime(item.delivery_time)}
                    </Text>
                  )}
                  {item.delivery_address && (
                    <Text style={styles.address} numberOfLines={1}>
                      <MapPin size={12} color={Colors.textMuted} />
                      {' '}{item.delivery_address}
                    </Text>
                  )}
                </View>
                <Text style={styles.totalAmount}>
                  ₱{item.total_amount.toFixed(2)}
                </Text>
              </View>

              {activeTab === 'active' && (item.payment_status === 'unpaid' || !item.is_delivered) && (
                <View style={styles.cardActions}>
                  {item.payment_status === 'unpaid' && (
                    <TouchableOpacity
                      style={[styles.pillButton, styles.pillPaid]}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleMarkPaid(item);
                      }}
                    >
                      <Text style={styles.pillPaidText}>Mark Paid</Text>
                    </TouchableOpacity>
                  )}
                  {!item.is_delivered && (
                    <TouchableOpacity
                      style={[styles.pillButton, styles.pillDelivered]}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleMarkDelivered(item);
                      }}
                    >
                      <Text style={styles.pillDeliveredText}>Mark Delivered</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </Card>
            </PressableScale>
          )}
        />
      )}

      <FAB onPress={() => router.push('/modals/add-order')} />

      <Modal
        visible={!!confirm}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirm(null)}
      >
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmBox}>
            <Text style={styles.confirmTitle}>{confirm?.title}</Text>
            <Text style={styles.confirmMessage}>{confirm?.message}</Text>
            <View style={styles.confirmButtons}>
              <TouchableOpacity
                style={styles.confirmCancel}
                onPress={() => setConfirm(null)}
              >
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.confirmAction,
                  confirm?.destructive && styles.confirmActionDestructive,
                ]}
                onPress={confirm?.onConfirm}
              >
                <Text style={styles.confirmActionText}>{confirm?.actionLabel}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const getStyles = (Colors: Record<string, string>) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    position: 'relative',
  },
  measureWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    opacity: 0,
  },
  collapsibleHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: Colors.background,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  heroCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
    padding: 18,
  },
  heroLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 2,
  },
  heroValue: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 14,
  },
  heroDivider: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  heroSplitRow: {
    flexDirection: 'row',
    paddingTop: 12,
  },
  heroSplitItem: {
    flex: 1,
    alignItems: 'center',
  },
  heroSplitDivider: {
    width: 1,
    backgroundColor: Colors.border,
  },
  heroSplitValue: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  heroSplitLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },

  tabs: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: Radius.md,
    padding: 4,
    gap: 4,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: Radius.sm,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: Colors.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  tabTextActive: {
    color: '#fff',
  },

  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.textMuted + '55',
    backgroundColor: Colors.card,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  filterChipTextActive: {
    color: '#fff',
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    backgroundColor: Colors.background,
  },
  sectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  sectionCount: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  cardWrap: {
    marginHorizontal: 16,
    marginBottom: 8,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 8,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    flexShrink: 1,
  },
  itemSummary: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: 6,
    flexShrink: 0,
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  cardBottomLeft: {
    flex: 1,
    gap: 2,
  },
  deliveryTime: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  address: {
    fontSize: 12,
    color: Colors.textMuted,
    maxWidth: 200,
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },

  cardActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  pillButton: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pillPaid: {},
  pillPaidText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.success,
  },
  pillDelivered: {},
  pillDeliveredText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.info,
  },

  loadingText: {
    fontSize: 16,
    color: Colors.textMuted,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textMuted,
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 4,
  },
  confirmOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  confirmBox: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: 24,
    width: '100%',
  },
  confirmTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  confirmMessage: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 20,
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  confirmCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    alignItems: 'center',
  },
  confirmCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  confirmAction: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  confirmActionDestructive: {
    backgroundColor: Colors.error,
  },
  confirmActionText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});