import { Image } from 'expo-image';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import {
  ChefHat,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  Image as ImageIcon,
  Info,
  MoreVertical,
  Pencil,
  Plus,
  Trash2
} from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { FadeInView } from '../../components/motion/FadeInView';
import { PressableScale } from '../../components/motion/PressableScale';
import { VariantFormModal } from '../../components/products/VariantFormModal';
import { Accordion } from '../../components/ui/Accordion';
import { InfoModal } from '../../components/ui/InfoModal';
import { useTheme } from '../../contexts/ThemeContext';
import { getIngredients } from '../../services/ingredients';
import {
  archiveProduct,
  archiveVariant,
  getProductById,
  getRecipeIngredients,
  getVariantSalesStats,
  getVariantsByProduct,
  VariantSalesStats
} from '../../services/products';
import { getSettings } from '../../services/settings';
import { Ingredient, Product, ProductVariant, RecipeIngredient, Settings } from '../../types';
import {
  calculateBufferAmount,
  calculateCostPerPiece,
  calculateIngredientCost,
  calculateMarginPercent,
  calculateRecipeCost,
  calculateSuggestedPrice,
  calculateVariantProfit,
  calculateVariantTotalCost,
} from '../../utils/costing';
import { getCurrencyPrefix } from '../../utils/currency';

export default function ProductDetailModal() {
  const Colors = useTheme();
  const styles = useMemo(() => getStyles(Colors), [Colors]);
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [product, setProduct] = useState<Product | null>(null);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [recipeIngredients, setRecipeIngredients] = useState<RecipeIngredient[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [salesStats, setSalesStats] = useState<Record<string, VariantSalesStats>>({});
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [confirm, setConfirm] = useState<{
    title: string;
    message: string;
    actionLabel: string;
    onConfirm: () => void;
  } | null>(null);
  const [showCostingInfo, setShowCostingInfo] = useState(false);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [variantModal, setVariantModal] = useState<'add' | 'edit' | null>(null);
  const [editingVariant, setEditingVariant] = useState<ProductVariant | null>(null);

  async function load() {
    const [productData, variantsData, recipeData, ingredientsData, settingsData] =
      await Promise.all([
        getProductById(id),
        getVariantsByProduct(id),
        getRecipeIngredients(id),
        getIngredients(),
        getSettings(),
      ]);

    setProduct(productData);
    setVariants(variantsData);
    setRecipeIngredients(recipeData);
    setIngredients(ingredientsData);
    setSettings(settingsData);

    if (variantsData.length > 0) {
      const stats = await getVariantSalesStats(variantsData.map((v) => v.id));
      setSalesStats(stats);
    } else {
      setSalesStats({});
    }

    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [id])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [id]);

  function getIngredient(ingredientId: string): Ingredient | undefined {
    return ingredients.find((i) => i.id === ingredientId);
  }

  function getIngredientName(ingredientId: string): string {
    return getIngredient(ingredientId)?.name ?? 'Unknown';
  }

  function handleDeleteVariant(variant: ProductVariant) {
    setConfirm({
      title: 'Archive Variant',
      message: `Archive "${variant.name}"? It will be hidden but existing orders using this variant are preserved.`,
      actionLabel: 'Archive',
      onConfirm: async () => {
        const success = await archiveVariant(variant.id);
        setConfirm(null);
        if (success) await load();
      },
    });
  }


  function handleArchiveProduct() {
    if (!product) return;
    setConfirm({
      title: 'Archive Product',
      message: `Archive "${product.name}"? It will be hidden from your product list but existing orders referencing it are preserved.`,
      actionLabel: 'Archive',
      onConfirm: async () => {
        const success = await archiveProduct(product.id);
        setConfirm(null);
        if (success) router.back();
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

  if (!product) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Product not found.</Text>
      </View>
    );
  }

  const cur = getCurrencyPrefix(settings?.currency);
  const recipeCost = calculateRecipeCost(recipeIngredients, ingredients);
  const costPerPiece = calculateCostPerPiece(recipeCost, product.yield);

  const variantMetrics = variants.map((v) => {
    const totalCost = calculateVariantTotalCost(costPerPiece, v.packaging_cost, product.buffer_percent);
    const profit = calculateVariantProfit(v.selling_price, totalCost);
    const margin = calculateMarginPercent(v.selling_price, profit);
    return { variant: v, totalCost, profit, margin };
  });

  const rankedByProfit = [...variantMetrics].sort((a, b) => b.profit - a.profit);
  const best = rankedByProfit[0] ?? null;
  const bestRank = best ? rankedByProfit.findIndex((m) => m.variant.id === best.variant.id) + 1 : 0;

  // Costing breakdown reflects whichever variant was last tapped, defaulting
  // to the highest-profit one until the person picks a different variant.
  const selectedMetric =
    variantMetrics.find((m) => m.variant.id === selectedVariantId) ?? best;

  const selectedSales = selectedMetric ? salesStats[selectedMetric.variant.id] : undefined;
  const soldLast30 = selectedSales?.last30Days ?? 0;
  const soldAllTime = selectedSales?.allTime ?? 0;
  const soldDisplay = soldLast30 > 0 ? soldLast30 : soldAllTime;
  const soldLabel = soldLast30 > 0 ? 'Sold (last 30 days)' : 'Sold (all-time)';
  const profitContribution = selectedMetric ? selectedMetric.profit * soldAllTime : 0;
  const selectedRank = selectedMetric
    ? rankedByProfit.findIndex((m) => m.variant.id === selectedMetric.variant.id) + 1
    : 0;
  const isSelectedBest = !!(selectedMetric && best && selectedMetric.variant.id === best.variant.id);

  const breakdownBuffer = calculateBufferAmount(costPerPiece, product.buffer_percent);
  const breakdownPackaging = selectedMetric?.variant.packaging_cost ?? 0;
  const breakdownTotal = selectedMetric?.totalCost ?? costPerPiece + breakdownBuffer;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <ChevronLeft size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() =>
              router.push({ pathname: '/modals/edit-product', params: { id: product.id } })
            }
          >
            <Pencil size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerBtn} onPress={handleArchiveProduct}>
            <MoreVertical size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <FadeInView delay={0}>
          <View style={styles.hero}>
            {product.image_url ? (
              <>
                <Image source={{ uri: product.image_url }} style={styles.heroImage} contentFit="cover" />
                {product.category && (
                  <View style={styles.heroCategoryBadge}>
                    <Text style={styles.heroCategoryText}>{product.category}</Text>
                  </View>
                )}
                <View style={styles.heroScrim}>
                  <Text style={styles.heroName}>{product.name}</Text>
                  <Text style={styles.heroMeta}>
                    {variants.length} variant{variants.length === 1 ? '' : 's'} · yields {product.yield}
                  </Text>
                </View>
              </>
            ) : (
              <View style={styles.heroPlaceholder}>
                <ImageIcon size={30} color={Colors.textMuted} />
                {product.category && (
                  <Text style={styles.heroCategoryLabelPlain}>{product.category}</Text>
                )}
                <Text style={styles.heroNamePlain}>{product.name}</Text>
                <Text style={styles.heroMetaPlain}>
                  {variants.length} variant{variants.length === 1 ? '' : 's'} · yields {product.yield}
                </Text>
              </View>
            )}
          </View>
          {product.description ? (
            <Text style={styles.description}>{product.description}</Text>
          ) : null}
        </FadeInView>

        {/* Selected Variant accordion */}
        {selectedMetric && (
          <FadeInView delay={60}>
            <View style={styles.profitCard}>
              <Accordion
                header={(open) => (
                  <View style={styles.profitHeaderRow}>
                    <View style={{ flex: 1 }}>
                      <View style={styles.profitLabelRow}>
                        <Text style={styles.profitLabel}>Profit — {selectedMetric.variant.name}</Text>
                        {isSelectedBest && (
                          <View style={styles.bestBadge}>
                            <Text style={styles.bestBadgeText}>★ Highest Profit</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.profitValue}>
                        {cur}{selectedMetric.profit.toFixed(2)}
                      </Text>
                    </View>
                    {open ? (
                      <ChevronUp size={18} color={Colors.success} />
                    ) : (
                      <ChevronDown size={18} color={Colors.success} />
                    )}
                  </View>
                )}
              >
                <View style={styles.profitDetail}>
                  <View style={styles.profitDetailRow}>
                    <Text style={styles.profitDetailLabel}>Margin</Text>
                    <Text style={styles.profitDetailValue}>
                      {selectedMetric.margin !== null ? `${selectedMetric.margin.toFixed(0)}%` : '—'}
                    </Text>
                  </View>
                  <View style={styles.profitDetailRow}>
                    <Text style={styles.profitDetailLabel}>{soldLabel}</Text>
                    <Text style={styles.profitDetailValue}>{soldDisplay}</Text>
                  </View>
                  <View style={styles.profitDetailRow}>
                    <Text style={styles.profitDetailLabel}>Profit contribution (all-time)</Text>
                    <Text style={styles.profitDetailValue}>{cur}{profitContribution.toFixed(2)}</Text>
                  </View>
                  <View style={styles.profitDetailRow}>
                    <Text style={styles.profitDetailLabel}>Rank</Text>
                    <Text style={styles.profitDetailValue}>#{selectedRank} of {variants.length}</Text>
                  </View>
                </View>
              </Accordion>
            </View>
          </FadeInView>
        )}

        {/* Costing breakdown */}
        <FadeInView delay={120}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Costing breakdown</Text>
            <TouchableOpacity onPress={() => setShowCostingInfo(true)} hitSlop={8}>
              <Info size={14} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>
          {selectedMetric && (
            <Text style={styles.costingSubtitle}>For {selectedMetric.variant.name}</Text>
          )}
          <View style={styles.costingCard}>
            <Accordion
              header={(open) => (
                <View style={styles.costingRow}>
                  <View style={styles.costingRowLabel}>
                    <Text style={styles.costingLabel}>Recipe cost</Text>
                    {open ? (
                      <ChevronUp size={13} color={Colors.textMuted} />
                    ) : (
                      <ChevronDown size={13} color={Colors.textMuted} />
                    )}
                  </View>
                  <Text style={styles.costingValue}>{cur}{costPerPiece.toFixed(2)}</Text>
                </View>
              )}
            >
              <View style={styles.ingredientBreakdown}>
                {recipeIngredients.map((item) => (
                  <View key={item.id} style={styles.ingredientBreakdownRow}>
                    <Text style={styles.ingredientBreakdownName}>
                      {getIngredientName(item.ingredient_id)} · {item.quantity_used} {item.unit_used}
                    </Text>
                    <Text style={styles.ingredientBreakdownCost}>
                      {cur}{calculateIngredientCost(item, getIngredient(item.ingredient_id)).toFixed(2)}
                    </Text>
                  </View>
                ))}
                {recipeIngredients.length === 0 && (
                  <Text style={styles.ingredientBreakdownEmpty}>No ingredients added yet.</Text>
                )}
              </View>
            </Accordion>

            <View style={styles.costingDivider} />
            <View style={styles.costingRow}>
              <Text style={styles.costingLabel}>Packaging{best ? ` (${best.variant.name})` : ''}</Text>
              <Text style={styles.costingValue}>{cur}{breakdownPackaging.toFixed(2)}</Text>
            </View>
            <View style={styles.costingDivider} />
            <View style={styles.costingRow}>
              <Text style={styles.costingLabel}>Buffer ({product.buffer_percent}%)</Text>
              <Text style={styles.costingValue}>{cur}{breakdownBuffer.toFixed(2)}</Text>
            </View>
            <View style={styles.costingDivider} />
            <View style={styles.costingRow}>
              <Text style={styles.costingTotalLabel}>Total cost</Text>
              <Text style={styles.costingTotalValue}>{cur}{breakdownTotal.toFixed(2)}</Text>
            </View>
          </View>
        </FadeInView>

        {/* Variants */}
        <FadeInView delay={180}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Variants</Text>
            <TouchableOpacity
              style={styles.sectionAddButton}
              onPress={() => setVariantModal('add')}
            >
              <Plus size={20} color={Colors.primary} />
              <Text style={styles.sectionAddText}>Add Variant</Text>
            </TouchableOpacity>
          </View>

          {variantMetrics.length === 0 ? (
            <View style={styles.emptySection}>
              <Text style={styles.emptyText}>No variants yet</Text>
              <Text style={styles.emptySubtext}>
                Add variants like Small, Medium, Large or Box of 4
              </Text>
            </View>
          ) : (
            variantMetrics.map((m) => {
              const isBest = best?.variant.id === m.variant.id;
              const isSelected = selectedMetric?.variant.id === m.variant.id;
              return (
                <PressableScale
                  key={m.variant.id}
                  onPress={() => setSelectedVariantId(m.variant.id)}
                >
                  <View style={[
                    styles.variantRow,
                    isBest && styles.variantRowBest,
                    isSelected && styles.variantRowSelected,
                  ]}>
                    <View style={styles.variantLeft}>
                      <Text style={styles.variantName}>{m.variant.name}</Text>
                      <Text style={styles.variantProfit}>
                        Suggested {cur}{calculateSuggestedPrice(m.totalCost, product.markup_percent).toFixed(2)}
                      </Text>
                    </View>
                    <View style={styles.variantRight}>
                      <Text style={styles.variantPrice}>{cur}{m.variant.selling_price.toFixed(2)}</Text>
                      <TouchableOpacity
                        style={styles.deleteIcon}
                        onPress={() => { setEditingVariant(m.variant); setVariantModal('edit'); }}
                      >
                        <Pencil size={17} color={Colors.textSecondary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.deleteIcon}
                        onPress={() => handleDeleteVariant(m.variant)}
                      >
                        <Trash2 size={18} color={Colors.error} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </PressableScale>
              );
            })
          )}
        </FadeInView>

        <View style={{ height: 100 }} />
      </ScrollView>

      <View
        style={[styles.floatingBar, { paddingBottom: insets.bottom + 12 }]}
        pointerEvents="box-none"
      >
        <PressableScale
          onPress={() => router.push({ pathname: '/modals/recipe', params: { product_id: id } })}
        >
          <View style={styles.manageRecipeButton}>
            <ChefHat size={16} color="#fff" />
            <Text style={styles.manageRecipeText}>Manage recipe</Text>
          </View>
        </PressableScale>
      </View>

      <InfoModal
        visible={showCostingInfo}
        title="Costing breakdown"
        message="Total cost = Recipe cost (your ingredients, from the recipe) + Packaging (specific to the highlighted variant) + Buffer (the safety margin percentage set on this product, for waste or estimation error). Tap Recipe cost to see the ingredient-by-ingredient math."
        onClose={() => setShowCostingInfo(false)}
      />

      <VariantFormModal
        visible={variantModal !== null}
        productId={id}
        variant={variantModal === 'edit' ? editingVariant : null}
        costPerPiece={costPerPiece}
        bufferPercent={product.buffer_percent}
        markupPercent={product.markup_percent}
        currencyPrefix={cur}
        onClose={() => { setVariantModal(null); setEditingVariant(null); }}
        onSaved={load}
        onArchive={handleDeleteVariant}
      />

      <Modal visible={!!confirm} transparent animationType="fade" onRequestClose={() => setConfirm(null)}>
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmBox}>
            <Text style={styles.confirmTitle}>{confirm?.title}</Text>
            <Text style={styles.confirmMessage}>{confirm?.message}</Text>
            <View style={styles.confirmButtons}>
              <TouchableOpacity style={styles.confirmCancel} onPress={() => setConfirm(null)}>
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmAction} onPress={confirm?.onConfirm}>
                <Text style={styles.confirmActionText}>{confirm?.actionLabel}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const getStyles = (Colors: ReturnType<typeof useTheme>) => StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { fontSize: 16, color: Colors.error },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  headerBtn: { padding: 6 },
  headerActions: { flexDirection: 'row', gap: 4 },

  hero: {
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 16,
    overflow: 'hidden',
  },
  heroImage: { width: '100%', height: 190, backgroundColor: Colors.card },
  heroCategoryBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  heroCategoryText: { fontSize: 11, fontWeight: '600', color: '#fff' },
  heroScrim: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  heroName: { fontSize: 19, fontWeight: '700', color: '#fff' },
  heroMeta: { fontSize: 12, color: '#eee', marginTop: 2 },
  heroPlaceholder: {
    width: '100%',
    minHeight: 160,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 4,
  },
  heroCategoryLabelPlain: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginTop: 8,
  },
  heroNamePlain: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary, marginTop: 2 },
  heroMetaPlain: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },

  description: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginHorizontal: 16,
    marginTop: 10,
    lineHeight: 19,
  },

  profitCard: {
    backgroundColor: Colors.successBackground,
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 14,
    overflow: 'hidden',
  },
  profitHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 14,
  },
  profitLabel: { fontSize: 12, fontWeight: '600', color: Colors.success },
  profitValue: { fontSize: 22, fontWeight: '700', color: Colors.success, marginTop: 2 },
  profitSub: { fontSize: 12, color: Colors.success, marginTop: 2 },
  profitDetail: { paddingHorizontal: 14, paddingBottom: 14, gap: 8 },
  profitDetailRow: { flexDirection: 'row', justifyContent: 'space-between' },
  profitDetailLabel: { fontSize: 12, color: Colors.success },
  profitDetailValue: { fontSize: 12, fontWeight: '700', color: Colors.success },

  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginHorizontal: 16,
    marginTop: 18,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },

  costingCard: {
    backgroundColor: Colors.card,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  costingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  costingRowLabel: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  costingLabel: { fontSize: 13, color: Colors.textSecondary },
  costingValue: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  costingTotalLabel: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
  costingTotalValue: { fontSize: 14, fontWeight: '700', color: Colors.primary },
  costingDivider: { height: 1, backgroundColor: Colors.border },
  ingredientBreakdown: { backgroundColor: Colors.background, paddingHorizontal: 14, paddingVertical: 8 },
  ingredientBreakdownRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  ingredientBreakdownName: { fontSize: 12, color: Colors.textMuted, flex: 1, marginRight: 8 },
  ingredientBreakdownCost: { fontSize: 12, color: Colors.textSecondary, fontWeight: '600' },
  ingredientBreakdownEmpty: { fontSize: 12, color: Colors.textMuted, paddingVertical: 4 },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 8,
  },
  sectionAddButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sectionAddText: { fontSize: 14, color: Colors.primary, fontWeight: '600' },

  emptySection: {
    backgroundColor: Colors.card,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
  },
  emptyText: { fontSize: 14, fontWeight: '600', color: Colors.textMuted },
  emptySubtext: { fontSize: 12, color: Colors.textMuted, marginTop: 4, textAlign: 'center' },

  variantRow: {
    backgroundColor: Colors.card,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  variantRowBest: { borderColor: Colors.success, borderWidth: 1.5 },
  variantRowSelected: { borderColor: Colors.primary, borderWidth: 1.5 },
  profitLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  bestBadge: {
    backgroundColor: Colors.success,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  bestBadgeText: { fontSize: 10, fontWeight: '700', color: '#fff' },
  costingSubtitle: { fontSize: 12, color: Colors.textMuted, marginHorizontal: 16, marginTop: 2 },
  floatingBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  variantLeft: { flex: 1 },
  variantName: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  variantProfit: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  variantRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  variantPrice: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },

  listItem: {
    backgroundColor: Colors.card,
    marginHorizontal: 16,
    marginBottom: 6,
    borderRadius: 10,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  listItemLeft: { flex: 1 },
  listItemRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  listItemName: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  listItemSub: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  ingredientCost: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },

  recipeCostTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  recipeCostTotalLabel: { fontSize: 13, color: Colors.textSecondary, fontWeight: '600' },
  recipeCostTotalValue: { fontSize: 13, color: Colors.textPrimary, fontWeight: '700' },

  instructionsCard: {
    backgroundColor: Colors.card,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 10,
    padding: 16,
  },
  instructionsText: { fontSize: 14, color: Colors.textPrimary, lineHeight: 22 },

  manageRecipeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
  },
  manageRecipeText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  deleteIcon: { padding: 4 },

  confirmOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  confirmBox: { backgroundColor: Colors.card, borderRadius: 16, padding: 24, width: '100%' },
  confirmTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary, marginBottom: 8 },
  confirmMessage: { fontSize: 14, color: Colors.textSecondary, lineHeight: 20, marginBottom: 20 },
  confirmButtons: { flexDirection: 'row', gap: 10 },
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
    backgroundColor: Colors.error,
    alignItems: 'center',
  },
  confirmActionText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});