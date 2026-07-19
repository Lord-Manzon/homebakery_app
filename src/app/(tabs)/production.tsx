import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Colors } from '../../constants/theme';
import {
  completeProduction,
  getProductionSummary,
  ProductionSummary,
} from '../../services/production';
import { getProducts, getVariantsByProduct } from '../../services/products';

export default function ProductionScreen() {
  const [summary, setSummary] = useState<ProductionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [confirm, setConfirm] = useState<{
    title: string;
    message: string;
    actionLabel: string;
    destructive?: boolean;
    onConfirm: () => void;
  } | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  async function load() {
    const products = await getProducts();
    const allVariants = await Promise.all(
      products.map((p) => getVariantsByProduct(p.id))
    );
    const flatVariants = allVariants.flat();

    const productList = products.map((p) => ({ id: p.id, name: p.name }));
    const variantList = flatVariants.map((v) => ({
      id: v.id,
      name: v.name,
      product_id: v.product_id,
    }));

    const data = await getProductionSummary(productList, variantList);
    setSummary(data);
    setLoading(false);
  }

  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, []);

  function handleCompleteProduction() {
    if (!summary) return;

    const missingItems = summary.ingredientRequirements.filter(
      (r) => !r.sufficient
    );

    if (missingItems.length > 0) {
      setConfirm({
        title: 'Missing Ingredients',
        message: `You are short on ${missingItems.length} ingredient(s). Proceed anyway? Available stock will be fully deducted.`,
        actionLabel: 'Proceed',
        destructive: true,
        onConfirm: () => { setConfirm(null); confirmComplete(); },
      });
    } else {
      setConfirm({
        title: 'Complete Production',
        message: 'This will deduct all required ingredients from inventory. Continue?',
        actionLabel: 'Complete',
        onConfirm: () => { setConfirm(null); confirmComplete(); },
      });
    }
  }

  async function confirmComplete() {
    if (!summary) return;
    setCompleting(true);
    const success = await completeProduction(summary.ingredientRequirements);
    setCompleting(false);

    if (success) {
      setSuccessMsg('Ingredients have been deducted from inventory.');
      await load();
    } else {
      setConfirm({
        title: 'Error',
        message: 'Failed to complete production. Please try again.',
        actionLabel: 'OK',
        onConfirm: () => setConfirm(null),
      });
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  const hasNoOrders = !summary || summary.productionItems.length === 0;

  return (
    <View style={styles.container}>
      <ScrollView
  contentContainerStyle={
    hasNoOrders ? { flexGrow: 1 } : undefined
  }
  refreshControl={
    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
  }
>
        {hasNoOrders ? (
          <View style={styles.centered}>
            <Ionicons name="flame-outline" size={48} color="#ddd" />
            <Text style={styles.emptyText}>No active orders</Text>
            <Text style={styles.emptySubtext}>
              Production summary will appear when you have active orders
            </Text>
          </View>
        ) : (
          <>
            {/* Summary Cards */}
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryNumber}>{summary.totalProducts}</Text>
                <Text style={styles.summaryLabel}>Products</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryNumber}>{summary.totalItems}</Text>
                <Text style={styles.summaryLabel}>Total Items</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={[
                  styles.summaryNumber,
                  summary.missingIngredients > 0 && { color: Colors.error },
                ]}>
                  {summary.missingIngredients}
                </Text>
                <Text style={styles.summaryLabel}>Missing</Text>
              </View>
            </View>

            {/* Missing Ingredients Alert */}
            {summary.missingIngredients > 0 && (
              <View style={styles.alertCard}>
                <View style={styles.alertHeader}>
                  <Ionicons name="warning-outline" size={20} color={Colors.error} />
                  <Text style={styles.alertTitle}>Missing Ingredients</Text>
                </View>
                <Text style={styles.alertSubtitle}>
                  You don't have enough stock for production:
                </Text>
                {summary.ingredientRequirements
                  .filter((r) => !r.sufficient)
                  .map((r) => (
                    <TouchableOpacity
                      key={r.ingredient_id}
                      style={styles.alertItem}
                      onPress={() => router.push({
                        pathname: '/modals/add-expense',
                        params: {
                          prefill_ingredient_id: r.ingredient_id,
                          prefill_ingredient_name: r.ingredient_name,
                          prefill_unit: r.unit,
                        },
                      })}
                    >
                      <View style={styles.alertItemRow}>
                        <Text style={styles.alertItemName}>• {r.ingredient_name}</Text>
                        <Ionicons name="cart-outline" size={14} color={Colors.primary} />
                      </View>
                      <Text style={styles.alertItemDetail}>
                        Need {formatQty(r.required)} {r.unit} · Have {formatQty(r.available)} {r.unit} · Short by {formatQty(r.shortage)} {r.unit}
                      </Text>
                    </TouchableOpacity>
                  ))}
              </View>
            )}

            {/* Products to Produce */}
            <Text style={styles.sectionTitle}>Products to Produce</Text>
            {summary.productionItems.map((item) => (
              <TouchableOpacity
                key={item.product_id}
                style={styles.productCard}
                activeOpacity={0.7}
                onPress={() =>
                  router.push({
                    pathname: '/modals/product-detail',
                    params: { id: item.product_id },
                  })
                }
              >
                <View style={styles.productCardHeader}>
                  <Text style={styles.productName}>{item.product_name}</Text>
                  <Text style={styles.productTotal}>
                    {item.total_quantity} pcs total
                  </Text>
                </View>
                {item.variants.map((variant) => (
                  <View key={variant.variant_id} style={styles.variantRow}>
                    <Text style={styles.variantName}>{variant.variant_name}</Text>
                    <Text style={styles.variantQty}>× {variant.quantity}</Text>
                  </View>
                ))}
              </TouchableOpacity>
            ))}

            {/* Ingredients Required */}
            <Text style={styles.sectionTitle}>Ingredients Required</Text>
            {summary.ingredientRequirements.length === 0 ? (
              <TouchableOpacity
                style={styles.card}
                onPress={() => router.push('/(tabs)/products' as any)}
              >
                <Text style={styles.noRecipeText}>
                  No recipe ingredients found for active orders.
                </Text>
                <Text style={styles.noRecipeLink}>
                  Tap here to add ingredients to your product recipes →
                </Text>
              </TouchableOpacity>
            ) : (
              summary.ingredientRequirements.map((req) => (
                <TouchableOpacity
                  key={req.ingredient_id}
                  style={styles.ingredientCard}
                  activeOpacity={0.7}
                  onPress={() => router.push('/(tabs)/inventory' as any)}
                >
                  <View style={styles.ingredientLeft}>
                    <Text style={styles.ingredientName}>{req.ingredient_name}</Text>
                    <Text style={styles.ingredientDetail}>
                      Need {formatQty(req.required)} {req.unit}
                      {' · '}
                      Have {formatQty(req.available)} {req.unit}
                    </Text>
                  </View>
                  <View style={[
                    styles.statusBadge,
                    req.sufficient ? styles.statusSufficient : styles.statusInsufficient,
                  ]}>
                    <Text style={styles.statusText}>
                      {req.sufficient ? '✓ OK' : '⚠️ Low'}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))
            )}

            {/* Complete Production Button */}
            <TouchableOpacity
              style={[
                styles.completeButton,
                completing && styles.completeButtonDisabled,
              ]}
              onPress={handleCompleteProduction}
              disabled={completing}
            >
              {completing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                  <Text style={styles.completeButtonText}>
                    Mark Production Complete
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <View style={{ height: 40 }} />
          </>
        )}
      </ScrollView>

      {/* Success Modal */}
      <Modal
        visible={!!successMsg}
        transparent
        animationType="fade"
        onRequestClose={() => setSuccessMsg(null)}
      >
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmBox}>
            <Text style={styles.successIcon}>✅</Text>
            <Text style={styles.confirmTitle}>Production Complete</Text>
            <Text style={styles.confirmMessage}>{successMsg}</Text>
            <TouchableOpacity
              style={styles.confirmActionFull}
              onPress={() => setSuccessMsg(null)}
            >
              <Text style={styles.confirmActionText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Confirm Dialog */}
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

// Formats numbers cleanly: 251.0 → 251, 1.5 → 1.5
function formatQty(n: number): string {
  return n % 1 === 0 ? n.toString() : n.toFixed(1);
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    
    paddingHorizontal: 32,
  },
  summaryRow: { flexDirection: 'row', margin: 16, gap: 10 },
  summaryItem: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  summaryNumber: { fontSize: 24, fontWeight: 'bold', color: Colors.textPrimary },
  summaryLabel: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  alertCard: {
    backgroundColor: '#FDEDEC',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FADBD8',
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  alertTitle: { fontSize: 16, fontWeight: '700', color: Colors.error },
  alertSubtitle: { fontSize: 13, color: Colors.textSecondary, marginBottom: 10 },
  alertItem: {
    marginBottom: 10,
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: 8,
  },
  alertItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  alertItemName: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  alertItemDetail: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginHorizontal: 16,
    marginBottom: 8,
    marginTop: 4,
  },
  productCard: {
    backgroundColor: Colors.card,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    padding: 14,
  },
  productCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  productName: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  productTotal: { fontSize: 13, color: Colors.textMuted, fontWeight: '600' },
  variantRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    paddingLeft: 8,
    borderLeftWidth: 2,
    borderLeftColor: Colors.primary,
    marginBottom: 4,
  },
  variantName: { fontSize: 14, color: Colors.textSecondary },
  variantQty: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  ingredientCard: {
    backgroundColor: Colors.card,
    marginHorizontal: 16,
    marginBottom: 6,
    borderRadius: 10,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ingredientLeft: { flex: 1 },
  ingredientName: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  ingredientDetail: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusSufficient: { backgroundColor: '#EAFAF1' },
  statusInsufficient: { backgroundColor: '#FDEDEC' },
  statusText: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.success,
    borderRadius: 12,
    paddingVertical: 16,
    marginHorizontal: 16,
    marginTop: 16,
  },
  completeButtonDisabled: { opacity: 0.6 },
  completeButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  card: {
    backgroundColor: Colors.card,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 10,
    padding: 16,
  },
  noRecipeText: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  noRecipeLink: {
    fontSize: 13,
    color: Colors.primary,
    textAlign: 'center',
    marginTop: 6,
    fontWeight: '600',
  },
  emptyText: { fontSize: 16, fontWeight: '600', color: Colors.textMuted, marginTop: 12 },
  emptySubtext: { fontSize: 13, color: '#bbb', marginTop: 4, textAlign: 'center' },
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
    alignItems: 'center',
  },
  successIcon: { fontSize: 36, marginBottom: 8 },
  confirmTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  confirmMessage: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 20,
    textAlign: 'center',
  },
  confirmButtons: { flexDirection: 'row', gap: 10, width: '100%' },
  confirmCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: Colors.background,
    alignItems: 'center',
  },
  confirmCancelText: { fontSize: 15, fontWeight: '600', color: Colors.textSecondary },
  confirmAction: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  confirmActionDestructive: { backgroundColor: Colors.error },
  confirmActionFull: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: Colors.success,
    alignItems: 'center',
  },
  confirmActionText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});