import { router, useFocusEffect } from 'expo-router';
import { AlertCircle, AlertTriangle, CheckCircle2, ChevronRight, Flame, Layers, Menu, Package, ShoppingCart } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Spacing } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import {
  completeProduction,
  getProductionSummary,
  ProductionSummary,
} from '../../services/production';
import { getProducts, getVariantsByProduct } from '../../services/products';
import { eventBus } from '../../utils/eventBus';

export default function ProductionScreen() {
  const Colors = useTheme();
  const styles = useMemo(() => getStyles(Colors), [Colors]);
  const insets = useSafeAreaInsets();
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
        message: `You are short on ${missingItems.length} ingredient(s). Proceed anyway? Available stock will be fully deducted, and these orders will be marked as produced.`,
        actionLabel: 'Proceed',
        destructive: true,
        onConfirm: () => { setConfirm(null); confirmComplete(); },
      });
    } else {
      setConfirm({
        title: 'Complete Batch',
        message: 'This will deduct all required ingredients from inventory and mark these orders as produced. Continue?',
        actionLabel: 'Complete',
        onConfirm: () => { setConfirm(null); confirmComplete(); },
      });
    }
  }

  async function confirmComplete() {
    if (!summary) return;

    // Capture what's actually about to be deducted BEFORE load() runs again
    // and replaces `summary` with the post-production numbers — otherwise
    // there'd be nothing left to describe in the success message.
    const deducted = summary.ingredientRequirements
      .map((r) => ({
        name: r.ingredient_name,
        amount: Math.min(r.required, r.available),
        unit: r.unit,
      }))
      .filter((d) => d.amount > 0);

    setCompleting(true);
    const success = await completeProduction(
      summary.ingredientRequirements,
      summary.orderIds
    );
    setCompleting(false);

    if (success) {
      setSuccessMsg(buildSuccessMessage(deducted));
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
        contentContainerStyle={hasNoOrders ? { flexGrow: 1 } : undefined}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={[styles.header, { paddingTop: insets.top + Spacing.two }]}>
          <TouchableOpacity onPress={() => eventBus.emit('sidebar:open')} hitSlop={12}>
            <Menu size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>
        {hasNoOrders ? (
          <View style={styles.centered}>
            <Flame size={48} color="#ddd" />
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
                <View style={[styles.summaryIconWrap, { backgroundColor: Colors.primary + '18' }]}>
                  <Package size={16} color={Colors.primary} />
                </View>
                <Text style={styles.summaryNumber}>{summary.totalProducts}</Text>
                <Text style={styles.summaryLabel}>Products</Text>
              </View>
              <View style={styles.summaryItem}>
                <View style={[styles.summaryIconWrap, { backgroundColor: Colors.info + '18' }]}>
                  <Layers size={16} color={Colors.info} />
                </View>
                <Text style={styles.summaryNumber}>{summary.totalItems}</Text>
                <Text style={styles.summaryLabel}>Total Items</Text>
              </View>
              {/* This card visually reacts once there's actually something
                  missing — tinted background + border — instead of the
                  number just changing color inside an otherwise identical
                  box, so it reads as an alert rather than a stat. */}
              <View style={[
                styles.summaryItem,
                summary.missingIngredients > 0 && styles.summaryItemAlert,
              ]}>
                <View style={[
                  styles.summaryIconWrap,
                  {
                    backgroundColor: summary.missingIngredients > 0
                      ? Colors.error + '18'
                      : Colors.textMuted + '18',
                  },
                ]}>
                  <AlertCircle
                    size={16}
                    color={summary.missingIngredients > 0 ? Colors.error : Colors.textMuted}
                  />
                </View>
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
                  <AlertTriangle size={20} color={Colors.error} />
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
                      {/* Name + detail live in one block so the action on
                          the right can center against the block as a whole,
                          not just the first line. */}
                      <View style={styles.alertItemLeft}>
                        <Text style={styles.alertItemName}>{r.ingredient_name}</Text>
                        <Text style={styles.alertItemDetail}>
                          Need {formatQty(r.required)} {r.unit} · Have {formatQty(r.available)} {r.unit} · Short by {formatQty(r.shortage)} {r.unit}
                        </Text>
                      </View>
                      <View style={styles.alertItemAction}>
                        <ShoppingCart size={14} color={Colors.primary} />
                        <Text style={styles.alertItemActionText}>Restock</Text>
                      </View>
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
              summary.ingredientRequirements.map((req) => {
                // "Low" (some stock, not enough) and "Out" (zero stock) are
                // both "insufficient", but they're very different situations
                // for the baker — Out means this ingredient alone blocks
                // production entirely, so it gets the stronger (red) badge.
                const isOut = req.sufficient ? false : req.available <= 0;
                const badgeLabel = req.sufficient ? 'OK' : isOut ? 'Out' : 'Low';
                const badgeStyle = req.sufficient
                  ? styles.statusSufficient
                  : isOut
                  ? styles.statusOut
                  : styles.statusLow;
                const badgeTextStyle = req.sufficient
                  ? styles.statusSufficientText
                  : isOut
                  ? styles.statusOutText
                  : styles.statusLowText;
                // A plain colored dot instead of an Ionicons glyph — icon
                // fonts carry their own (inconsistent) vertical metrics, so
                // they never quite center against text no matter the
                // flexbox alignment. A solid circle has no baseline to
                // fight, so it centers correctly every time.
                const dotColor = req.sufficient
                  ? Colors.success
                  : isOut
                  ? Colors.error
                  : Colors.warning;

                return (
                  <TouchableOpacity
                    key={req.ingredient_id}
                    style={styles.ingredientCard}
                    activeOpacity={0.7}
                    onPress={() => router.push('/(tabs)/inventory' as any)}
                  >
                    <View style={styles.ingredientTopRow}>
                      <Text style={styles.ingredientName}>{req.ingredient_name}</Text>
                      <View style={styles.ingredientRightGroup}>
                        <View style={[styles.statusBadge, badgeStyle]}>
                          <View style={[styles.statusDot, { backgroundColor: dotColor }]} />
                          <Text style={badgeTextStyle}>{badgeLabel}</Text>
                        </View>
                        <ChevronRight size={18} color={Colors.textMuted} />
                      </View>
                    </View>
                    <Text style={styles.ingredientDetail}>
                      Need {formatQty(req.required)} {req.unit}
                      {' · '}
                      Have {formatQty(req.available)} {req.unit}
                    </Text>
                  </TouchableOpacity>
                );
              })
            )}

            {/* Complete Batch Button */}
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
                  <CheckCircle2 size={20} color="#fff" />
                  <Text style={styles.completeButtonText}>
                    Complete Batch
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

// Builds the "Used 300g Butter, 3kg Flour" success line. Capped at 3 named
// ingredients so a big batch with many ingredients doesn't turn the modal
// into a wall of text — anything beyond that collapses into "and N more".
function buildSuccessMessage(
  deducted: { name: string; amount: number; unit: string }[]
): string {
  if (deducted.length === 0) {
    return 'Ingredients have been deducted from inventory.';
  }
  const shown = deducted.slice(0, 3);
  const rest = deducted.length - shown.length;
  const parts = shown.map((d) => `${formatQty(d.amount)}${d.unit} ${d.name}`);
  const list = rest > 0 ? `${parts.join(', ')}, and ${rest} more` : parts.join(', ');
  return `Used ${list}.`;
}

const getStyles = (Colors: Record<string, string>) => StyleSheet.create({
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
    borderWidth: 1,
    borderColor: 'transparent',
  },
  summaryItemAlert: {
    backgroundColor: Colors.error + '10',
    borderColor: Colors.error + '35',
  },
  summaryIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  summaryNumber: { fontSize: 24, fontWeight: 'bold', color: Colors.textPrimary },
  summaryLabel: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  alertCard: {
    backgroundColor: Colors.error + '15',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.error + '40',
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 10,
    padding: 10,
    backgroundColor: Colors.card,
    borderRadius: 8,
  },
  alertItemLeft: { flex: 1 },
  alertItemName: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary, marginBottom: 2 },
  alertItemDetail: { fontSize: 12, color: Colors.textSecondary },
  alertItemAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primary + '15',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 20,
  },
  alertItemActionText: { fontSize: 12, fontWeight: '700', color: Colors.primary },
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
  },
  ingredientTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 3,
  },
  ingredientRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ingredientLeft: { flex: 1 },
  ingredientName: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary, flexShrink: 1 },
  ingredientDetail: { fontSize: 12, color: Colors.textMuted },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusSufficient: { backgroundColor: Colors.success + '22' },
  statusSufficientText: { fontSize: 11, fontWeight: '700', color: Colors.success },
  statusLow: { backgroundColor: Colors.warning + '22' },
  statusLowText: { fontSize: 11, fontWeight: '700', color: Colors.warning },
  statusOut: { backgroundColor: Colors.error + '22' },
  statusOutText: { fontSize: 11, fontWeight: '700', color: Colors.error },
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

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginHorizontal: Spacing.three,
    marginBottom: Spacing.two,
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