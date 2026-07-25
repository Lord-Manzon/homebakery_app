import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { Archive, Calculator, ChevronDown, ChevronUp, Image as ImageIcon, Pencil, Search, Store, Tag, XCircle } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import FAB from '../../components/common/FAB';
import { Spacing } from '../../constants/theme';
import { useTabBarHeight, useTabBarVisibility } from '../../contexts/TabBarVisibilityContext';
import { useTheme } from '../../contexts/ThemeContext';
import { getIngredients } from '../../services/ingredients';
import {
  archiveProduct,
  getProducts,
  getRecipeIngredientsForProducts,
  getVariantsForProducts,
} from '../../services/products';
import { Ingredient, Product, ProductVariant, RecipeIngredient } from '../../types';
import { calculateCostPerPiece, calculateRecipeCost } from '../../utils/costing';
import { eventBus } from '../../utils/eventBus';

const ALL_CATEGORIES = 'All';

// Colors used for category pills, cycling by a hash of the category name so
// the same category always lands on the same color. Deliberately excludes
// Colors.error -- that's reserved for destructive/loss meaning everywhere
// else in the app (including the Archive button on this very card), so
// using it for an arbitrary category tag would blur that signal.
const CATEGORY_COLOR_KEYS = ['primary', 'info', 'success', 'warning'] as const;

function categoryColorKey(category: string): (typeof CATEGORY_COLOR_KEYS)[number] {
  let hash = 0;
  for (let i = 0; i < category.length; i++) {
    hash = (hash * 31 + category.charCodeAt(i)) >>> 0;
  }
  return CATEGORY_COLOR_KEYS[hash % CATEGORY_COLOR_KEYS.length];
}

// A product's margin badge state -- its own category, separate from the
// severity colors used elsewhere in the app, since "no recipe cost yet" is
// a data-completeness problem, not a stock-shortage problem.
type MarginTier = 'high' | 'mid' | 'low' | 'noCost' | 'noVariants';

function marginTier(avgMargin: number | null, hasVariants: boolean): MarginTier {
  if (!hasVariants) return 'noVariants';
  if (avgMargin === null) return 'noCost';
  if (avgMargin >= 60) return 'high';
  if (avgMargin >= 30) return 'mid';
  return 'low';
}

// Whole numbers drop the trailing ".00" -- 40 reads faster than 40.00 in a
// list you scan quickly, and the precision isn't lost since it just wasn't
// there to begin with.
function formatMoney(n: number): string {
  return n % 1 === 0 ? `₱${n.toFixed(0)}` : `₱${n.toFixed(2)}`;
}

// Distinguishes "one price" from "a range of prices" with an explicit label
// change (Selling Price vs Price Range) rather than relying on the reader
// to notice a dash between two numbers, which is easy to misread as a
// minus sign or a typo at a glance.
function formatPriceLabel(prices: number[]): { label: string; value: string } {
  if (prices.length === 0) return { label: 'Selling Price', value: '—' };
  const sorted = [...prices].sort((a, b) => a - b);
  const low = sorted[0];
  const high = sorted[sorted.length - 1];
  if (low === high) return { label: 'Selling Price', value: formatMoney(low) };
  return { label: 'Price Range', value: `${formatMoney(low)} – ${formatMoney(high)}` };
}

function formatProfitLabel(profits: number[]): string {
  if (profits.length === 0) return '—';
  const sorted = [...profits].sort((a, b) => a - b);
  const low = sorted[0];
  const high = sorted[sorted.length - 1];
  if (low === high) return formatMoney(low);
  return `${formatMoney(low)} – ${formatMoney(high)}`;
}

export default function ProductsScreen() {
  const Colors = useTheme();
  const { onScroll } = useTabBarVisibility();
  const tabBarHeight = useTabBarHeight();
  const styles = useMemo(() => getStyles(Colors), [Colors]);
  const [products, setProducts] = useState<Product[]>([]);
  const [recipeIngredients, setRecipeIngredients] = useState<RecipeIngredient[]>([]);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>(ALL_CATEGORIES);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showGlossary, setShowGlossary] = useState(false);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [pendingScrollId, setPendingScrollId] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const [confirm, setConfirm] = useState<{
    title: string;
    message: string;
    actionLabel: string;
    onConfirm: () => void;
  } | null>(null);

  // The header (owned by the Tabs layout, outside this screen's tree) fires
  // this event when its info button is tapped -- see _layout.tsx and
  // utils/eventBus.ts. Keeps the glossary's state fully local to this
  // screen without the header needing to know anything about it.
  useEffect(() => {
    const unsubscribe = eventBus.on('products:showGlossary', () => setShowGlossary(true));
    return unsubscribe;
  }, []);

  async function load() {
    const productsData = await getProducts();
    const ids = productsData.map((p) => p.id);

    const [recipeData, variantsData, ingredientsData] = await Promise.all([
      getRecipeIngredientsForProducts(ids),
      getVariantsForProducts(ids),
      getIngredients(),
    ]);

    setProducts(productsData);
    setRecipeIngredients(recipeData);
    setVariants(variantsData);
    setIngredients(ingredientsData);
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

  // Categories are derived from whatever products actually exist -- add a
  // new category to any product and a new chip appears here automatically,
  // nothing hardcoded to maintain.
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return [ALL_CATEGORIES, ...Array.from(set).sort()];
  }, [products]);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        search.trim() === '' || p.name.toLowerCase().includes(search.toLowerCase());
      const matchesCategory =
        activeCategory === ALL_CATEGORIES || p.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, search, activeCategory]);

  // Cost/price/profit/margin for one product, derived from the batch-loaded
  // data. Cost is a single per-piece value (same across all of a product's
  // variants); margin still varies per variant because it's a function of
  // that variant's own selling price relative to the fixed cost.
  function getCosting(product: Product) {
    const items = recipeIngredients.filter((r) => r.product_id === product.id);
    const productVariants = variants.filter((v) => v.product_id === product.id);

    const recipeCost = calculateRecipeCost(items, ingredients);
    const cost = calculateCostPerPiece(recipeCost, product.yield);
    const prices = productVariants.map((v) => v.selling_price);
    const profits = prices.map((p) => p - cost);

    const hasVariants = productVariants.length > 0;
    const hasCost = cost > 0;

    const variantMargins = productVariants.map((v) => ({
      id: v.id,
      name: v.name,
      margin: v.selling_price > 0 ? ((v.selling_price - cost) / v.selling_price) * 100 : 0,
    }));

    const avgMargin =
      hasCost && variantMargins.length > 0
        ? variantMargins.reduce((sum, v) => sum + v.margin, 0) / variantMargins.length
        : null;

    const priceInfo = formatPriceLabel(prices);

    return {
      cost,
      costLabel: formatMoney(cost),
      priceLabel: priceInfo.label,
      priceValue: priceInfo.value,
      profitLabel: formatProfitLabel(profits),
      hasVariants,
      hasCost,
      avgMargin,
      variantMargins,
    };
  }

  // "Need Costing" -- products with no usable recipe cost yet, regardless
  // of whether variants/prices are already set up.
  const needsCostingProducts = useMemo(() => {
    return products.filter((p) => getCosting(p).cost <= 0);
  }, [products, recipeIngredients, ingredients]);

  // Tapping the "Need Costing" stat jumps straight to the first product
  // that needs it -- clears any active filter/search first (the target
  // might be hidden by them), then waits for the list to reflect that
  // before scrolling, since state updates aren't synchronous.
  function handleNeedCostingPress() {
    if (needsCostingProducts.length === 0) return;
    const target = needsCostingProducts[0];
    setSearch('');
    setActiveCategory(ALL_CATEGORIES);
    setPendingScrollId(target.id);
  }

  useEffect(() => {
    if (!pendingScrollId) return;
    const index = filtered.findIndex((p) => p.id === pendingScrollId);
    if (index === -1) return; // filters haven't caught up yet, try again next render

    flatListRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.15 });
    setHighlightId(pendingScrollId);
    setPendingScrollId(null);
  }, [pendingScrollId, filtered]);

  // Kept as its own effect, keyed only on highlightId -- if this timer lived
  // inside the scroll effect above, any unrelated re-run of that effect
  // (e.g. `filtered` changing for any other reason while the highlight is
  // still active) would cancel the pending clear with nothing to replace
  // it, leaving the highlight stuck on instead of fading away.
  useEffect(() => {
    if (!highlightId) return;
    const t = setTimeout(() => setHighlightId(null), 1800);
    return () => clearTimeout(t);
  }, [highlightId]);

  function handleArchive(product: Product) {
    setConfirm({
      title: 'Archive Product',
      message: `Archive "${product.name}"? It will be hidden from the product list but your order history will be preserved.`,
      actionLabel: 'Archive',
      onConfirm: async () => {
        const success = await archiveProduct(product.id);
        setConfirm(null);
        if (success) await load();
      },
    });
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search */}
      <View style={styles.searchContainer}>
        <Search size={18} color={Colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search products..."
          placeholderTextColor={Colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <XCircle size={18} color={Colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Category chips -- generated from real product data, see `categories` above.
          style (not just contentContainerStyle) caps the ScrollView's own height, and
          alignItems: 'center' on the row stops chips stretching to fill any extra
          cross-axis space -- together these are the fix for the "chips go tall" bug. */}
      {categories.length > 2 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipScroll}
          contentContainerStyle={styles.chipRow}
        >
          {categories.map((cat) => {
            const active = activeCategory === cat;
            const colorKey = cat === ALL_CATEGORIES ? 'primary' : categoryColorKey(cat);
            return (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.chip,
                  active && { backgroundColor: Colors[colorKey], borderColor: Colors[colorKey] },
                ]}
                onPress={() => setActiveCategory(cat)}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{cat}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* Summary */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <View style={[styles.summaryIconWrap, { backgroundColor: Colors.primary + '18' }]}>
            <Store size={14} color={Colors.primary} />
          </View>
          <Text style={styles.summaryNumber}>{products.length}</Text>
          <Text style={styles.summaryLabel}>Products</Text>
        </View>
        <View style={styles.summaryItem}>
          <View style={[styles.summaryIconWrap, { backgroundColor: Colors.info + '18' }]}>
            <Tag size={14} color={Colors.info} />
          </View>
          <Text style={styles.summaryNumber}>{categories.length - 1}</Text>
          <Text style={styles.summaryLabel}>Categories</Text>
        </View>
        <TouchableOpacity
          style={[styles.summaryItem, needsCostingProducts.length > 0 && styles.summaryItemAlert]}
          activeOpacity={needsCostingProducts.length > 0 ? 0.6 : 1}
          onPress={handleNeedCostingPress}
        >
          <View
            style={[
              styles.summaryIconWrap,
              {
                backgroundColor:
                  needsCostingProducts.length > 0 ? Colors.warning + '18' : Colors.textMuted + '18',
              },
            ]}
          >
            <Calculator
              size={14}
              color={needsCostingProducts.length > 0 ? Colors.warning : Colors.textMuted}
            />
          </View>
          <Text
            style={[
              styles.summaryNumber,
              needsCostingProducts.length > 0 && { color: Colors.warning },
            ]}
          >
            {needsCostingProducts.length}
          </Text>
          <Text style={styles.summaryLabel}>
            {needsCostingProducts.length > 0 ? 'Tap to fix' : 'Need Costing'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      <FlatList
        ref={flatListRef}
        data={filtered}
        keyExtractor={(item) => item.id}
        style={styles.list}
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: tabBarHeight + Spacing.two }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        onScrollToIndexFailed={(info) => {
          // Item hasn't been measured yet (common right after a filter
          // reset) -- wait a beat for layout to settle, then retry once.
          setTimeout(() => {
            flatListRef.current?.scrollToIndex({ index: info.index, animated: true, viewPosition: 0.15 });
          }, 250);
        }}
        ListEmptyComponent={
          <View style={styles.centered}>
            <Store size={48} color="#ddd" />
            <Text style={styles.emptyText}>
              {products.length === 0 ? 'No products yet' : 'No products match'}
            </Text>
            <Text style={styles.emptySubtext}>
              {products.length === 0
                ? 'Tap the + button to add your first product'
                : 'Try a different search or category'}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const costing = getCosting(item);
          const tier = marginTier(costing.avgMargin, costing.hasVariants);
          const isExpanded = expandedId === item.id;
          const isHighlighted = highlightId === item.id;
          const catColorKey = item.category ? categoryColorKey(item.category) : 'primary';
          const itemVariantCount = variants.filter((v) => v.product_id === item.id).length;

          return (
            <TouchableOpacity
              style={[styles.card, isHighlighted && styles.cardHighlighted]}
              activeOpacity={0.85}
              onPress={() =>
                router.push({
                  pathname: '/modals/product-detail',
                  params: { id: item.id },
                })
              }
            >
              <View style={styles.cardTop}>
                <View style={styles.thumbnailWrap}>
                  {item.image_url ? (
                    <Image
                      source={{ uri: item.image_url }}
                      style={styles.thumbnail}
                      contentFit="cover"
                    />
                  ) : (
                    <View style={styles.thumbnailPlaceholder}>
                      <ImageIcon size={18} color={Colors.textMuted} />
                    </View>
                  )}
                </View>
                <View style={styles.cardLeft}>
                  <View style={styles.tagRow}>
                    {item.category && (
                      <View
                        style={[
                          styles.categoryPill,
                          { backgroundColor: Colors[catColorKey] + '20' },
                        ]}
                      >
                        <Text style={[styles.categoryPillText, { color: Colors[catColorKey] }]}>
                          {item.category}
                        </Text>
                      </View>
                    )}
                    <Text style={styles.variantCount}>
                      {costing.hasVariants
                        ? `· ${itemVariantCount} variant${itemVariantCount === 1 ? '' : 's'}`
                        : '· no variants yet'}
                    </Text>
                  </View>
                  <Text style={styles.productName} numberOfLines={1}>
                    {item.name}
                  </Text>
                </View>
                <View style={styles.cardRight}>
                  <TouchableOpacity
                    style={styles.iconButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      router.push({
                        pathname: '/modals/edit-product',
                        params: { id: item.id },
                      });
                    }}
                  >
                    <Pencil size={20} color={Colors.textSecondary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.iconButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleArchive(item);
                    }}
                  >
                    <Archive size={20} color={Colors.error} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.divider} />

              {!costing.hasVariants ? (
                <Text style={styles.noVariantsText}>
                  Add a variant to set a selling price for this product.
                </Text>
              ) : (
                <>
                  {/* Price + Margin get the one prominent row -- together
                      they answer "is this worth making" at a glance. Cost
                      and Profit drop to a plain caption line below, which
                      wraps instead of a rigid column truncating a longer
                      number. */}
                  <View style={styles.priceRow}>
                    <View style={styles.priceRowLeft}>
                      <Text style={styles.priceLabel}>{costing.priceLabel}</Text>
                      <Text style={styles.priceValue} numberOfLines={1}>
                        {costing.priceValue}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[
                        styles.marginBadge,
                        marginBadgeStyle(tier, Colors),
                        tier === 'noCost' && styles.marginBadgeNoCost,
                      ]}
                      onPress={(e) => {
                        e.stopPropagation();
                        setExpandedId(isExpanded ? null : item.id);
                      }}
                    >
                      {tier === 'noCost' ? (
                        <Text style={[styles.marginNoCostText, marginTextStyle(tier, Colors)]}>
                          No Cost
                        </Text>
                      ) : (
                        <>
                          <Text style={[styles.marginPct, marginTextStyle(tier, Colors)]}>
                            {`~${Math.round(costing.avgMargin ?? 0)}%`}
                          </Text>
                          <Text style={styles.marginLbl}>margin</Text>
                        </>
                      )}
                      {isExpanded ? (
                        <ChevronUp size={11} color={marginTextStyle(tier, Colors).color} />
                      ) : (
                        <ChevronDown size={11} color={marginTextStyle(tier, Colors).color} />
                      )}
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.captionLine}>
                    Cost{' '}
                    <Text style={[styles.captionBold, !costing.hasCost && { color: Colors.error }]}>
                      {costing.costLabel}
                    </Text>
                    {'  ·  Profit '}
                    <Text style={styles.captionBold}>{costing.profitLabel}</Text>
                  </Text>

                  {isExpanded && (
                    <View style={styles.expandBox}>
                      {tier === 'noCost' ? (
                        <Text style={styles.expandNote}>
                          No recipe cost is set for this product yet, so margin can't be
                          calculated. Tap this card to add ingredient costs.
                        </Text>
                      ) : (
                        costing.variantMargins.map((v, i) => (
                          <View
                            key={v.id}
                            style={[
                              styles.variantMarginRow,
                              i === costing.variantMargins.length - 1 && { borderBottomWidth: 0 },
                            ]}
                          >
                            <Text style={styles.variantMarginName}>{v.name}</Text>
                            <Text style={styles.variantMarginValue}>
                              ~{Math.round(v.margin)}%
                            </Text>
                          </View>
                        ))
                      )}
                    </View>
                  )}
                </>
              )}
            </TouchableOpacity>
          );
        }}
      />
      <FAB onPress={() => router.push('/modals/add-product')} bottomOffset={tabBarHeight} />

      {/* Metrics glossary -- opened from the native header's info icon (see
          _layout.tsx + utils/eventBus.ts), not repeated per card or as a
          permanent line taking up scroll space. */}
      <Modal
        visible={showGlossary}
        transparent
        animationType="fade"
        onRequestClose={() => setShowGlossary(false)}
      >
        <View style={styles.confirmOverlay}>
          <View style={styles.glossaryBox}>
            <Text style={styles.confirmTitle}>Product Metrics</Text>

            <View style={styles.metricDef}>
              <Text style={styles.metricDefEmoji}>💰</Text>
              <View style={styles.metricDefText}>
                <Text style={styles.metricDefLabel}>Cost</Text>
                <Text style={styles.metricDefDesc}>Estimated recipe cost for one product.</Text>
              </View>
            </View>
            <View style={styles.metricDef}>
              <Text style={styles.metricDefEmoji}>🏷️</Text>
              <View style={styles.metricDefText}>
                <Text style={styles.metricDefLabel}>Selling Price</Text>
                <Text style={styles.metricDefDesc}>The price range across all variants.</Text>
              </View>
            </View>
            <View style={styles.metricDef}>
              <Text style={styles.metricDefEmoji}>📈</Text>
              <View style={styles.metricDefText}>
                <Text style={styles.metricDefLabel}>Profit</Text>
                <Text style={styles.metricDefDesc}>Selling Price − Cost.</Text>
              </View>
            </View>
            <View style={[styles.metricDef, { borderBottomWidth: 0 }]}>
              <Text style={styles.metricDefEmoji}>📊</Text>
              <View style={styles.metricDefText}>
                <Text style={styles.metricDefLabel}>Margin</Text>
                <Text style={styles.metricDefDesc}>
                  (Price − Cost) ÷ Price × 100. Higher means more of each sale is profit. Tap a
                  product's margin badge to see it broken down per variant.
                </Text>
              </View>
            </View>

            <TouchableOpacity style={styles.confirmActionFull} onPress={() => setShowGlossary(false)}>
              <Text style={styles.confirmActionText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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

// Kept as plain functions (not inline in JSX) so the tier->color mapping
// lives in exactly one place, shared between the badge background and its
// text/icon color.
function marginBadgeStyle(tier: MarginTier, Colors: Record<string, string>) {
  switch (tier) {
    case 'high':
      return { backgroundColor: Colors.success + '20' };
    case 'mid':
      return { backgroundColor: Colors.warning + '20' };
    case 'low':
      return { backgroundColor: Colors.error + '20' };
    case 'noCost':
      return { backgroundColor: Colors.warning + '14' };
    default:
      return { backgroundColor: Colors.textMuted + '20' };
  }
}
function marginTextStyle(tier: MarginTier, Colors: Record<string, string>) {
  switch (tier) {
    case 'high':
      return { color: Colors.success };
    case 'mid':
      return { color: Colors.warning };
    case 'low':
      return { color: Colors.error };
    case 'noCost':
      return { color: Colors.warning };
    default:
      return { color: Colors.textMuted };
  }
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    height: 42,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  // Explicit height cap on the ScrollView itself (not just its content
  // container) -- this plus alignItems: 'center' on chipRow is the fix for
  // chips stretching tall when a category is selected.
  chipScroll: {
    maxHeight: 40,
    flexGrow: 0,
  },
  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  chipText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  chipTextActive: {
    color: '#fff',
  },
  // Compacted per feedback: icon + number + label tightened into a shorter
  // card so more of the product list is visible without scrolling.
  summaryRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 8,
    gap: 8,
  },
  summaryItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  summaryItemAlert: {
    backgroundColor: Colors.warning + '10',
    borderColor: Colors.warning + '35',
  },
  summaryIconWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  summaryNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  summaryLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    flexShrink: 1,
  },
  list: {
    flex: 1,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 10,
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1.5,
  },
  cardHighlighted: {
    borderColor: Colors.warning,
    borderWidth: 1.5,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  thumbnailWrap: {
    width: 44,
    height: 44,
    borderRadius: 8,
    overflow: 'hidden',
  },
  thumbnail: {
    width: 44,
    height: 44,
  },
  thumbnailPlaceholder: {
    width: 44,
    height: 44,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardLeft: {
    flex: 1,
    minWidth: 0,
  },
  cardRight: {
    flexDirection: 'row',
    gap: 8,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 5,
    marginBottom: 3,
  },
  categoryPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  categoryPillText: {
    fontSize: 10.5,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  variantCount: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginTop: 10,
    marginBottom: 10,
  },
  noVariantsText: {
    fontSize: 12.5,
    color: Colors.textMuted,
    fontStyle: 'italic',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 6,
  },
  priceRowLeft: {
    flex: 1,
    minWidth: 0,
  },
  priceLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  priceValue: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  marginBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 20,
    flexShrink: 0,
  },
  marginBadgeNoCost: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.warning + '70',
  },
  marginPct: {
    fontSize: 13,
    fontWeight: '800',
  },
  marginNoCostText: {
    fontSize: 12,
    fontWeight: '700',
  },
  marginLbl: {
    fontSize: 10.5,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  captionLine: {
    fontSize: 12,
    color: Colors.textMuted,
    lineHeight: 17,
  },
  captionBold: {
    color: Colors.textSecondary,
    fontWeight: '700',
  },
  expandBox: {
    marginTop: 10,
    padding: 10,
    backgroundColor: Colors.background,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  expandNote: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 17,
  },
  variantMarginRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  variantMarginName: {
    fontSize: 12.5,
    color: Colors.textSecondary,
  },
  variantMarginValue: {
    fontSize: 12.5,
    fontWeight: '700',
    color: Colors.success,
  },
  iconButton: {
    padding: 4,
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
    textAlign: 'center',
    paddingHorizontal: 40,
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
  glossaryBox: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 20,
    width: '100%',
  },
  confirmTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 12,
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
    backgroundColor: Colors.error,
    alignItems: 'center',
  },
  confirmActionFull: {
    marginTop: 6,
    paddingVertical: 13,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  confirmActionText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  metricDef: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  metricDefEmoji: {
    fontSize: 18,
    lineHeight: 22,
  },
  metricDefText: {
    flex: 1,
  },
  metricDefLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  metricDefDesc: {
    fontSize: 12.5,
    color: Colors.textMuted,
    lineHeight: 18,
  },
});