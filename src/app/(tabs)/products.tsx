import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import FAB from '../../components/common/FAB';
import { useTheme } from '../../contexts/ThemeContext';
import { getIngredients } from '../../services/ingredients';
import {
  archiveProduct,
  getProducts,
  getRecipeIngredientsForProducts,
  getVariantsForProducts,
} from '../../services/products';
import { Ingredient, Product, ProductVariant, RecipeIngredient } from '../../types';
import {
  calculateCostPerPiece,
  calculateRecipeCost,
  formatPriceRange,
} from '../../utils/costing';

export default function ProductsScreen() {
  const Colors = useTheme();
  const styles = useMemo(() => getStyles(Colors), [Colors]);
  const [products, setProducts] = useState<Product[]>([]);
  const [filtered, setFiltered] = useState<Product[]>([]);
  const [recipeIngredients, setRecipeIngredients] = useState<RecipeIngredient[]>([]);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [confirm, setConfirm] = useState<{
    title: string;
    message: string;
    actionLabel: string;
    onConfirm: () => void;
  } | null>(null);

  async function load() {
    const productsData = await getProducts();
    const ids = productsData.map((p) => p.id);

    const [recipeData, variantsData, ingredientsData] = await Promise.all([
      getRecipeIngredientsForProducts(ids),
      getVariantsForProducts(ids),
      getIngredients(),
    ]);

    setProducts(productsData);
    setFiltered(productsData);
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

  useEffect(() => {
    if (search.trim() === '') {
      setFiltered(products);
    } else {
      setFiltered(
        products.filter((p) =>
          p.name.toLowerCase().includes(search.toLowerCase())
        )
      );
    }
  }, [search, products]);

  // Cost/price/profit for one product, derived from the batch-loaded data.
  function getCosting(product: Product) {
    const items = recipeIngredients.filter((r) => r.product_id === product.id);
    const productVariants = variants.filter((v) => v.product_id === product.id);

    const recipeCost = calculateRecipeCost(items, ingredients);
    const cost = calculateCostPerPiece(recipeCost, product.yield);
    const prices = productVariants.map((v) => v.selling_price);
    const profits = prices.map((p) => p - cost);

    return {
      costLabel: `₱${cost.toFixed(2)}`,
      priceLabel: formatPriceRange(prices),
      profitLabel: profits.length === 0 ? '—' : formatPriceRange(profits),
    };
  }

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
        <Ionicons name="search-outline" size={18} color={Colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search products..."
          placeholderTextColor={Colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Summary */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryNumber}>{products.length}</Text>
          <Text style={styles.summaryLabel}>Total Products</Text>
        </View>
      </View>

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.centered}>
            <Ionicons name="storefront-outline" size={48} color="#ddd" />
            <Text style={styles.emptyText}>No products yet</Text>
            <Text style={styles.emptySubtext}>
              Tap the + button to add your first product
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const costing = getCosting(item);
          return (
            <TouchableOpacity
              style={styles.card}
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
                      <Ionicons name="image-outline" size={18} color={Colors.textMuted} />
                    </View>
                  )}
                </View>
                <View style={styles.cardLeft}>
                  {item.category && (
                    <Text style={styles.category}>{item.category}</Text>
                  )}
                  <Text style={styles.productName}>{item.name}</Text>
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
                    <Ionicons name="create-outline" size={20} color={Colors.textSecondary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.iconButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleArchive(item);
                    }}
                  >
                    <Ionicons name="archive-outline" size={20} color={Colors.error} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.costRow}>
                <View style={styles.costItem}>
                  <Text style={styles.costLabel}>Cost</Text>
                  <Text style={styles.costValue}>{costing.costLabel}</Text>
                </View>
                <View style={styles.costDivider} />
                <View style={styles.costItemWide}>
                  <Text style={styles.costLabel}>Price</Text>
                  <Text style={[styles.costValue, { color: Colors.primary }]} numberOfLines={1}>
                    {costing.priceLabel}
                  </Text>
                </View>
                <View style={styles.costDivider} />
                <View style={styles.costItemWide}>
                  <Text style={styles.costLabel}>Profit</Text>
                  <Text style={[styles.costValue, { color: Colors.success }]} numberOfLines={1}>
                    {costing.profitLabel}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
      />
      <FAB onPress={() => router.push('/modals/add-product')} />

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
    marginVertical: 10,
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
  summaryRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 10,
  },
  summaryItem: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  summaryNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  summaryLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 10,
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 14,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
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
  },
  cardRight: {
    flexDirection: 'row',
    gap: 8,
  },
  category: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  costRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  costItem: {
    flex: 1,
    alignItems: 'center',
  },
  costItemWide: {
    flex: 1.3,
    alignItems: 'center',
  },
  costDivider: {
    width: 1,
    height: 26,
    backgroundColor: Colors.border,
  },
  costLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    marginBottom: 2,
  },
  costValue: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
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
    backgroundColor: Colors.error,
    alignItems: 'center',
  },
  confirmActionText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});