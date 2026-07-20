import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  Modal,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import FAB from '../../components/common/FAB';
import { useTheme } from '../../contexts/ThemeContext';
import { deleteOrder, getOrderItemsSummary, getOrders, groupOrdersByDate, markDelivered, updatePaymentStatus } from '../../services/orders';
import { Order } from '../../types';

type TabType = 'active' | 'completed';

export default function OrdersScreen() {
  const Colors = useTheme();
  const styles = useMemo(() => getStyles(Colors), [Colors]);
  const [activeTab, setActiveTab] = useState<TabType>('active');
  const [orders, setOrders] = useState<Order[]>([]);
  const [itemSummaries, setItemSummaries] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
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
    setLoading(true);
    await load(tab);
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

  function handleDelete(order: Order) {
    setConfirm({
      title: 'Delete Order',
      message: `Permanently delete ${order.customer_name}'s order? This cannot be undone.`,
      actionLabel: 'Delete',
      destructive: true,
      onConfirm: async () => {
        await deleteOrder(order.id);
        setConfirm(null);
        await load(activeTab);
      },
    });
  }

  const grouped = groupOrdersByDate(orders);

  const sections = grouped.map((group) => ({
    title: group.label,
    count: group.orders.length,
    data: group.orders,
  }));

  const totalRevenue = orders.reduce((sum, o) => sum + o.total_amount, 0);
  const paidCount = orders.filter((o) => o.payment_status === 'paid').length;
  const unpaidCount = orders.filter((o) => o.payment_status === 'unpaid').length;

  return (
    <View style={styles.container}>
      

      {/* Summary */}
      {activeTab === 'active' && (
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNumber}>{orders.length}</Text>
            <Text style={styles.summaryLabel}>Active</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNumber}>
              ₱{totalRevenue.toFixed(0)}
            </Text>
            <Text style={styles.summaryLabel}>Expected</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryNumber, { color: Colors.success }]}>
              {paidCount}
            </Text>
            <Text style={styles.summaryLabel}>Paid</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryNumber, { color: Colors.error }]}>
              {unpaidCount}
            </Text>
            <Text style={styles.summaryLabel}>Unpaid</Text>
          </View>
        </View>
      )}

      {/* Tabs */}
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

      {/* Orders List */}
      {loading ? (
        <View style={styles.centered}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      ) : sections.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="receipt-outline" size={48} color="#ddd" />
          <Text style={styles.emptyText}>No {activeTab} orders</Text>
          {activeTab === 'active' && (
            <Text style={styles.emptySubtext}>
              Tap + to create your first order
            </Text>
          )}
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <View style={styles.sectionDot} />
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <Text style={styles.sectionCount}>
                · {section.count} {section.count === 1 ? 'order' : 'orders'}
              </Text>
            </View>
          )}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() =>
                router.push({
                  pathname: '/modals/order-detail',
                  params: { id: item.id },
                })
              }
            >
              {/* Customer & Type */}
              <View style={styles.cardTop}>
                <Text style={styles.customerName}>{item.customer_name}</Text>
                <View style={styles.badges}>
                  <View
                    style={[
                      styles.badge,
                      item.order_type === 'delivery'
                        ? styles.badgeDelivery
                        : styles.badgePickup,
                    ]}
                  >
                    <Text style={item.order_type === 'delivery' ? styles.badgeDeliveryText : styles.badgePickupText}>
                      {item.order_type === 'delivery' ? '🛵 Delivery' : '🏠 Pickup'}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.badge,
                      item.payment_status === 'paid'
                        ? styles.badgePaid
                        : styles.badgeUnpaid,
                    ]}
                  >
                    <Text style={item.payment_status === 'paid' ? styles.badgePaidText : styles.badgeUnpaidText}>
                      {item.payment_status === 'paid' ? '✓ Paid' : 'Unpaid'}
                    </Text>
                  </View>
                  {item.is_delivered && (
                    <View style={[styles.badge, styles.badgeDelivered]}>
                      <Text style={styles.badgeDeliveredText}>🚚 Delivered</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Item Summary */}
              {itemSummaries[item.id] && (
                <Text style={styles.itemSummary} numberOfLines={1}>
                  {itemSummaries[item.id]}
                </Text>
              )}

              {/* Time & Amount */}
              <View style={styles.cardBottom}>
                <View style={styles.cardBottomLeft}>
                  {item.delivery_time && (
                    <Text style={styles.deliveryTime}>
                      <Ionicons name="time-outline" size={12} color={Colors.textMuted} />
                      {' '}{item.delivery_time.slice(0, 5)}
                    </Text>
                  )}
                  {item.delivery_address && (
                    <Text style={styles.address} numberOfLines={1}>
                      <Ionicons name="location-outline" size={12} color={Colors.textMuted} />
                      {' '}{item.delivery_address}
                    </Text>
                  )}
                </View>
                <Text style={styles.totalAmount}>
                  ₱{item.total_amount.toFixed(2)}
                </Text>
              </View>

              {/* Actions */}
              {activeTab === 'active' && (
                <View style={styles.cardActions}>
                  {item.payment_status === 'unpaid' && (
                    <TouchableOpacity
                      style={[styles.actionButton, styles.actionPaid]}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleMarkPaid(item);
                      }}
                    >
                      <Text style={styles.actionPaidText}>Mark Paid</Text>
                    </TouchableOpacity>
                  )}
                  {!item.is_delivered && (
                    <TouchableOpacity
                      style={[styles.actionButton, styles.actionDelivered]}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleMarkDelivered(item);
                      }}
                    >
                      <Text style={styles.actionDeliveredText}>Mark Delivered</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[styles.actionButton, styles.actionCancel]}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleDelete(item);
                    }}
                  >
                    <Text style={styles.actionCancelText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              )}

              {activeTab === 'completed' && (
                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.actionCancel]}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleDelete(item);
                    }}
                  >
                    <Text style={styles.actionCancelText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              )}
            </TouchableOpacity>
          )}
        />
      )}
    <FAB onPress={() => router.push('/modals/add-order')} />

    {/* Confirmation Dialog */}
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
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: Colors.card,
  },
  
  summaryRow: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 10,
    paddingVertical: 8,
  },
  summaryNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  summaryLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  tabActive: {
    backgroundColor: Colors.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  tabTextActive: {
    color: '#fff',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
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
  card: {
    backgroundColor: Colors.card,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    padding: 14,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    flex: 1,
  },
  itemSummary: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  badges: {
    flexDirection: 'row',
    gap: 6,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeDelivery: {
    backgroundColor: Colors.info + '22',
  },
  badgeDeliveryText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.info,
  },
  badgePickup: {
    backgroundColor: Colors.success + '22',
  },
  badgePickupText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.success,
  },
  badgePaid: {
    backgroundColor: Colors.success + '22',
  },
  badgePaidText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.success,
  },
  badgeUnpaid: {
    backgroundColor: Colors.error + '22',
  },
  badgeUnpaidText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.error,
  },
  badgeDelivered: {
    backgroundColor: Colors.primary + '22',
  },
  badgeDeliveredText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.primary,
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
  actionButton: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionPaid: {
    backgroundColor: Colors.success + '22',
  },
  actionPaidText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.success,
  },
  actionDelivered: {
    backgroundColor: Colors.info + '22',
  },
  actionDeliveredText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.info,
  },
  actionCancel: {
    backgroundColor: Colors.error + '22',
  },
  actionCancelText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.error,
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
    color: '#bbb',
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
    borderRadius: 16,
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
    borderRadius: 10,
    backgroundColor: Colors.background,
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
    borderRadius: 10,
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