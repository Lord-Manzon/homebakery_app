import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { Colors } from '../../constants/theme';
import {
  deleteOrder,
  getOrderById,
  getOrderItems,
  updateOrderStatus,
  updatePaymentStatus,
} from '../../services/orders';
import { getProducts, getVariantsByProduct } from '../../services/products';
import { Order, OrderItem, Product, ProductVariant } from '../../types';

export default function OrderDetailModal() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [order, setOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [confirm, setConfirm] = useState<{
    title: string;
    message: string;
    actionLabel: string;
    destructive?: boolean;
    onConfirm: () => void;
  } | null>(null);

  async function load() {
    const [orderData, itemsData, productsData] = await Promise.all([
      getOrderById(id),
      getOrderItems(id),
      getProducts(),
    ]);

    setOrder(orderData);
    console.log('order data:', JSON.stringify(orderData));
    setOrderItems(itemsData);
    setProducts(productsData);

    if (productsData.length > 0) {
      const allVariants: ProductVariant[] = [];
      for (const item of itemsData) {
        const productVariants = await getVariantsByProduct(item.product_id);
        allVariants.push(...productVariants);
      }
      setVariants(allVariants);
    }

    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [id]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [id]);

  function getProductName(productId: string): string {
    return products.find((p) => p.id === productId)?.name ?? 'Unknown';
  }

  function getVariantName(variantId: string): string {
    return variants.find((v) => v.id === variantId)?.name ?? 'Unknown';
  }

  function formatDate(dateStr: string | null): string {
    if (!dateStr) return 'No date set';
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }

  function formatTime(timeStr: string | null): string {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':');
    const date = new Date();
    date.setHours(parseInt(hours));
    date.setMinutes(parseInt(minutes));
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function handleMarkPaid() {
    setConfirm({
      title: 'Mark as Paid',
      message: 'Mark this order as paid?',
      actionLabel: 'Mark Paid',
      onConfirm: async () => {
        await updatePaymentStatus(id, 'paid');
        setConfirm(null);
        await load();
      },
    });
  }

  function handleComplete() {
    setConfirm({
      title: 'Complete Order',
      message: 'Mark this order as completed? This cannot be undone.',
      actionLabel: 'Complete',
      onConfirm: async () => {
        await updateOrderStatus(id, 'completed');
        setConfirm(null);
        router.dismiss();
      },
    });
  }

  function handleCancel() {
    setConfirm({
      title: 'Cancel Order',
      message: 'Are you sure you want to cancel this order?',
      actionLabel: 'Cancel Order',
      destructive: true,
      onConfirm: async () => {
        await updateOrderStatus(id, 'cancelled');
        setConfirm(null);
        router.dismiss();
      },
    });
  }

  function handleDelete() {
    setConfirm({
      title: 'Delete Order',
      message: 'Permanently delete this order? This cannot be undone.',
      actionLabel: 'Delete',
      destructive: true,
      onConfirm: async () => {
        await deleteOrder(id);
        setConfirm(null);
        router.dismiss();
      },
    });
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Order not found.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
    <ScrollView
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Customer Info */}
      <View style={styles.card}>
        <Text style={styles.customerName}>{order.customer_name}</Text>
        <View style={styles.badgeRow}>
          <View style={[
            styles.badge,
            order.order_type === 'delivery' ? styles.badgeDelivery : styles.badgePickup,
          ]}>
            <Text style={styles.badgeText}>
              {order.order_type === 'delivery' ? '🛵 Delivery' : '🏠 Pickup'}
            </Text>
          </View>
          <View style={[
            styles.badge,
            order.payment_status === 'paid' ? styles.badgePaid : styles.badgeUnpaid,
          ]}>
            <Text style={styles.badgeText}>
              {order.payment_status === 'paid' ? '✓ Paid' : 'Unpaid'}
            </Text>
          </View>
          <View style={[
            styles.badge,
            order.order_status === 'active' ? styles.badgeActive : styles.badgeInactive,
          ]}>
            <Text style={styles.badgeText}>
              {order.order_status.charAt(0).toUpperCase() + order.order_status.slice(1)}
            </Text>
          </View>
        </View>
      </View>

      {/* Delivery Info */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>
          {order.order_type === 'delivery' ? 'Delivery Details' : 'Pickup Details'}
        </Text>
        <View style={styles.infoRow}>
          <Ionicons name="calendar-outline" size={16} color={Colors.textMuted} />
          <Text style={styles.infoText}>{formatDate(order.delivery_date)}</Text>
        </View>
        {order.delivery_time && (
          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={16} color={Colors.textMuted} />
            <Text style={styles.infoText}>{formatTime(order.delivery_time)}</Text>
          </View>
        )}
        {order.delivery_address && (
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={16} color={Colors.textMuted} />
            <Text style={styles.infoText}>{order.delivery_address}</Text>
          </View>
        )}
        {order.customer_notes && (
          <View style={styles.infoRow}>
            <Ionicons name="chatbubble-outline" size={16} color={Colors.textMuted} />
            <Text style={styles.infoText}>{order.customer_notes}</Text>
          </View>
        )}
      </View>

      {/* Order Items */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Order Items</Text>
        {orderItems.map((item) => (
          <View key={item.id} style={styles.orderItem}>
            <View style={styles.orderItemLeft}>
              <Text style={styles.orderItemName}>
                {getProductName(item.product_id)}
              </Text>
              <Text style={styles.orderItemVariant}>
                {getVariantName(item.variant_id)} × {item.quantity}
              </Text>
            </View>
            <Text style={styles.orderItemPrice}>
              ₱{item.subtotal.toFixed(2)}
            </Text>
          </View>
        ))}

        {/* Totals */}
        <View style={styles.divider} />
        {order.delivery_fee > 0 && (
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Delivery Fee</Text>
            <Text style={styles.totalValue}>
              ₱{order.delivery_fee.toFixed(2)}
            </Text>
          </View>
        )}
        <View style={styles.totalRow}>
          <Text style={styles.totalFinalLabel}>Total</Text>
          <Text style={styles.totalFinalValue}>
            ₱{order.total_amount.toFixed(2)}
          </Text>
        </View>
      </View>

      {/* Actions */}
      {order.order_status === 'active' && (
        <View style={styles.actionsCard}>
          <Text style={styles.sectionTitle}>Actions</Text>

          <TouchableOpacity
            style={styles.editOrderButton}
            onPress={() => router.push({ pathname: '/modals/edit-order', params: { id } })}
          >
            <Ionicons name="create-outline" size={18} color={Colors.primary} />
            <Text style={styles.editOrderButtonText}>Edit Order</Text>
          </TouchableOpacity>

          <View style={styles.actionButtons}>
            {order.payment_status === 'unpaid' && (
              <TouchableOpacity
                style={[styles.actionButton, styles.actionPaid]}
                onPress={handleMarkPaid}
              >
                <Ionicons name="checkmark-circle-outline" size={18} color={Colors.success} />
                <Text style={[styles.actionText, { color: Colors.success }]}>
                  Mark Paid
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.actionButton, styles.actionComplete]}
              onPress={handleComplete}
            >
              <Ionicons name="bag-check-outline" size={18} color={Colors.info} />
              <Text style={[styles.actionText, { color: Colors.info }]}>
                Complete
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.actionCancel]}
              onPress={handleCancel}
            >
              <Ionicons name="close-circle-outline" size={18} color={Colors.error} />
              <Text style={[styles.actionText, { color: Colors.error }]}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {order.order_status !== 'active' && (
        <View style={styles.actionsCard}>
          <Text style={styles.sectionTitle}>Actions</Text>
          <TouchableOpacity
            style={[styles.actionButton, styles.actionCancel]}
            onPress={handleDelete}
          >
            <Ionicons name="trash-outline" size={18} color={Colors.error} />
            <Text style={[styles.actionText, { color: Colors.error }]}>
              Delete Order
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 16,
    color: Colors.error,
  },
  card: {
    backgroundColor: Colors.card,
    margin: 16,
    marginBottom: 0,
    borderRadius: 12,
    padding: 16,
  },
  actionsCard: {
    backgroundColor: Colors.card,
    margin: 16,
    marginBottom: 0,
    borderRadius: 12,
    padding: 16,
  },
  customerName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: 10,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeDelivery: { backgroundColor: '#EBF5FB' },
  badgePickup: { backgroundColor: '#EAFAF1' },
  badgePaid: { backgroundColor: '#EAFAF1' },
  badgeUnpaid: { backgroundColor: '#FDEDEC' },
  badgeActive: { backgroundColor: '#FFF3E0' },
  badgeInactive: { backgroundColor: Colors.background },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: Colors.textSecondary,
    flex: 1,
    lineHeight: 20,
  },
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  orderItemLeft: {
    flex: 1,
  },
  orderItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  orderItemVariant: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  orderItemPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 10,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  totalLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  totalValue: {
    fontSize: 14,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  totalFinalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  totalFinalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
  },
  editOrderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.primary,
    marginBottom: 10,
  },
  editOrderButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.primary,
  },
  actionButtons: {
    gap: 10,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 10,
  },
  actionPaid: { backgroundColor: '#EAFAF1' },
  actionComplete: { backgroundColor: '#EBF5FB' },
  actionCancel: { backgroundColor: '#FDEDEC' },
  actionText: {
    fontSize: 15,
    fontWeight: '600',
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