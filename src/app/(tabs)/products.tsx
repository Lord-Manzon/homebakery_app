import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { Calculator, Image as ImageIcon, Search, Store, XCircle } from 'lucide-react-native';
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
  getProducts,
  getRecipeIngredientsForProducts,
  getVariantsForProducts,
} from '../../services/products';
import { Ingredient, Product, ProductVariant, RecipeIngredient } from '../../types';
import { calculateCostPerPiece, calculateRecipeCost } from '../../utils/costing';
import { eventBus } from '../../utils/eventBus';

const ALL_CATEGORIES = 'All';

// Colors used for category pills, cycling by a hash of the category name so
// the same category always lands on the same color.
const CATEGORY_COLOR_KEYS = ['primary', 'info', 'success', 'warning'] as const;

function categoryColorKey(category: string): (typeof CATEGORY_COLOR_KEYS)[number] {
  let hash = 0;
  for (let i = 0; i < category.length; i++) {
    hash = (hash * 31 + category.charCodeAt(i)) >>> 0;
  }
  return CATEGORY_COLOR_KEYS[hash % CATEGORY_COLOR_KEYS.length];
}

// Whole numbers drop the trailing ".00" -- 40 reads faster than 40.00 in a
// list you scan quickly, and the precision isn't lost since it just wasn't
// there to begin with.
function formatMoney(n: number): string {
  return n % 1 === 0 ? `₱${n.toFixed(0)}` : `₱${n.toFixed(2)}`;
}

function formatPriceLabel(prices: number[]): string {
  if (prices.length === 0) return '—';
  const sorted = [...prices].sort((a, b) => a - b);
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
  const [showGlossary, setShowGlossary] = useState(false);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [pendingScrollId, setPendingScrollId] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);

  // The header (owned by the Tabs layout, outside this screen's tree) fires
  // this event when its info button is tapped -- see _layout.tsx and
  // utils/eventBus.ts.
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

  // Just enough costing to power the card (price range) and the "Need
  // Costing" stat -- no margin math anymore since that's not shown here;
  // full costing detail lives in Product Detail now.
  function getCosting(product: Product) {
    const items = recipeIngredients.filter((r) => r.product_id === product.id);
    const productVariants = variants.filter((v) => v.product_id === product.id);
    const recipeCost = calculateRecipeCost(items, ingredients);
    const cost = calculateCostPerPiece(recipeCost, product.yield);
    const prices = productVariants.map((v) => v.selling_price);

    return {
      hasCost: cost > 0,
      hasVariants: productVariants.length > 0,
      priceLabel: formatPriceLabel(prices),
      variantCount: productVariants.length,
    };
  }

  const needsCostingProducts = useMemo(() => {
    return products.filter((p) => !getCosting(p).hasCost);
  }, [products, recipeIngredients, ingredients]);

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
    if (index === -1) return;

    flatListRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.15 });
    setHighlightId(pendingScrollId);
    setPendingScrollId(null);
  }, [pendingScrollId, filtered]);

  useEffect(() => {
    if (!highlightId) return;
    const t = setTimeout(() => setHighlightId(null), 1800);
    return () => clearTimeout(t);
  }, [highlightId]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search — styled as a rounded pill per the redesign. Note: this
          still lives inline in the screen, not merged into the native tab
          header, since that lives in the (tabs)/_layout.tsx file. */}
      <View style={styles.searchContainer}>
        <Search size={16} color={Colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search products..."
          placeholderTextColor={Colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <XCircle size={16} color={Colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

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

      {/* Summary — Products + Need Costing only, per redesign */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <View style={[styles.summaryIconWrap, { backgroundColor: Colors.primary + '18' }]}>
            <Store size={16} color={Colors.primary} />
          </View>
          <View>
            <Text style={styles.summaryNumber}>{products.length}</Text>
            <Text style={styles.summaryLabel}>Products</Text>
          </View>
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
              size={16}
              color={needsCostingProducts.length > 0 ? Colors.warning : Colors.textMuted}
            />
          </View>
          <View>
            <Text
              style={[
                styles.summaryNumber,
                needsCostingProducts.length > 0 && { color: Colors.warning },
              ]}
            >
              {needsCostingProducts.length}
            </Text>
            <Text style={styles.summaryLabel}>Need costing</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* 2-column grid */}
      <FlatList
        ref={flatListRef}
        data={filtered}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.gridRow}
        style={styles.list}
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: tabBarHeight + Spacing.two }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        onScrollToIndexFailed={(info) => {
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
          const isHighlighted = highlightId === item.id;
          const catColorKey = item.category ? categoryColorKey(item.category) : 'primary';

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
              <View style={styles.imageWrap}>
                {item.image_url ? (
                  <Image
                    source={{ uri: item.image_url }}
                    style={styles.image}
                    contentFit="cover"
                  />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <ImageIcon size={26} color={Colors.textMuted} />
                  </View>
                )}
                {item.category && (
                  <View
                    style={[
                      styles.categoryPill,
                      { backgroundColor: Colors[catColorKey] + 'E6' },
                    ]}
                  >
                    <Text style={styles.categoryPillText}>{item.category}</Text>
                  </View>
                )}
                {!costing.hasCost && (
                  <View style={styles.needCostingPill}>
                    <Calculator size={10} color="#fff" />
                  </View>
                )}
              </View>

              <View style={styles.cardBody}>
                <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.variantCount}>
                  {costing.hasVariants
                    ? `${costing.variantCount} variant${costing.variantCount === 1 ? '' : 's'}`
                    : 'No variants yet'}
                </Text>
                <Text style={styles.priceValue} numberOfLines={1}>{costing.priceLabel}</Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />
      <FAB onPress={() => router.push('/modals/add-product')} bottomOffset={tabBarHeight} />

      {/* Metrics glossary -- opened from the native header's info icon */}
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
            <View style={[styles.metricDef, { borderBottomWidth: 0 }]}>
              <Text style={styles.metricDefEmoji}>🧮</Text>
              <View style={styles.metricDefText}>
                <Text style={styles.metricDefLabel}>Need Costing</Text>
                <Text style={styles.metricDefDesc}>
                  A product with no recipe cost set yet. Open it to add ingredients — full cost,
                  profit, and margin breakdowns live inside Product Detail.
                </Text>
              </View>
            </View>

            <TouchableOpacity style={styles.confirmActionFull} onPress={() => setShowGlossary(false)}>
              <Text style={styles.confirmActionText}>Got it</Text>
            </TouchableOpacity>
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    height: 42,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.textPrimary,
  },
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
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  summaryItemAlert: {
    backgroundColor: Colors.warning + '10',
    borderColor: Colors.warning + '35',
  },
  summaryIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  summaryNumber: {
    fontSize: 17,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  summaryLabel: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  list: {
    flex: 1,
  },
  gridRow: {
    gap: 10,
  },
  card: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  cardHighlighted: {
    borderColor: Colors.warning,
    borderWidth: 1.5,
  },
  imageWrap: {
    width: '100%',
    height: 110,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryPill: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 20,
  },
  categoryPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  needCostingPill: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.warning,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: {
    padding: 10,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  variantCount: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 3,
  },
  priceValue: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: 3,
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