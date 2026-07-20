import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
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
import { useTheme } from '../../contexts/ThemeContext';
import { getIngredients } from '../../services/ingredients';
import {
  archiveVariant,
  deleteRecipeIngredient,
  getProductById,
  getRecipeIngredients,
  getVariantsByProduct,
} from '../../services/products';
import { Ingredient, Product, ProductVariant, RecipeIngredient } from '../../types';
import {
  calculateCostPerPiece,
  calculateIngredientCost,
  calculateRecipeCost,
  formatPriceRange,
} from '../../utils/costing';

export default function ProductDetailModal() {
  const Colors = useTheme();
  const styles = useMemo(() => getStyles(Colors), [Colors]);
  const { id } = useLocalSearchParams<{ id: string }>();

  const [product, setProduct] = useState<Product | null>(null);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [recipeIngredients, setRecipeIngredients] = useState<RecipeIngredient[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [confirm, setConfirm] = useState<{
    title: string;
    message: string;
    actionLabel: string;
    onConfirm: () => void;
  } | null>(null);

  async function load() {
    const [productData, variantsData, recipeData, ingredientsData] =
      await Promise.all([
        getProductById(id),
        getVariantsByProduct(id),
        getRecipeIngredients(id),
        getIngredients(),
      ]);

    setProduct(productData);
    setVariants(variantsData);
    setRecipeIngredients(recipeData);
    setIngredients(ingredientsData);
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

  function handleDeleteRecipeIngredient(item: RecipeIngredient) {
    setConfirm({
      title: 'Remove Ingredient',
      message: `Remove "${getIngredientName(item.ingredient_id)}" from this recipe?`,
      actionLabel: 'Remove',
      onConfirm: async () => {
        const success = await deleteRecipeIngredient(item.id);
        setConfirm(null);
        if (success) await load();
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

  const recipeCost = calculateRecipeCost(recipeIngredients, ingredients);
  const costPerPiece = calculateCostPerPiece(recipeCost, product.yield);
  const prices = variants.map((v) => v.selling_price);
  const profits = prices.map((p) => p - costPerPiece);
  const priceLabel = formatPriceRange(prices);
  const profitLabel = profits.length === 0 ? '—' : formatPriceRange(profits);
  const marginLabel =
    prices.length === 1 && prices[0] > 0
      ? `${(((prices[0] - costPerPiece) / prices[0]) * 100).toFixed(0)}%`
      : null;

  return (
    <View style={styles.container}>
    <ScrollView
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Photo */}
      <View style={styles.photoWrap}>
        {product.image_url ? (
          <Image
            source={{ uri: product.image_url }}
            style={styles.photo}
            contentFit="cover"
          />
        ) : (
          <View style={styles.photoPlaceholder}>
            <Ionicons name="image-outline" size={32} color={Colors.textMuted} />
            <Text style={styles.photoPlaceholderText}>No photo yet</Text>
          </View>
        )}
      </View>

      {/* Product Info */}
      <View style={styles.card}>
        {product.category && (
          <Text style={styles.categoryLabel}>{product.category}</Text>
        )}
        <Text style={styles.productName}>{product.name}</Text>
        {product.description && (
          <Text style={styles.description}>{product.description}</Text>
        )}

        <View style={styles.costSummary}>
          <View style={styles.costSummaryItem}>
            <Text style={styles.costSummaryLabel}>Cost</Text>
            <Text style={styles.costSummaryValue}>₱{costPerPiece.toFixed(2)}</Text>
          </View>
          <View style={styles.costSummaryDivider} />
          <View style={styles.costSummaryItem}>
            <Text style={styles.costSummaryLabel}>Price</Text>
            <Text style={[styles.costSummaryValue, { color: Colors.primary }]}>
              {priceLabel}
            </Text>
          </View>
          <View style={styles.costSummaryDivider} />
          <View style={styles.costSummaryItem}>
            <Text style={styles.costSummaryLabel}>Profit</Text>
            <Text style={[styles.costSummaryValue, { color: Colors.success }]}>
              {profitLabel}
            </Text>
          </View>
        </View>
        {marginLabel && (
          <Text style={styles.marginText}>Margin: {marginLabel}</Text>
        )}

        <TouchableOpacity
          style={styles.editButton}
          onPress={() =>
            router.push({
              pathname: '/modals/edit-product',
              params: { id: product.id },
            })
          }
        >
          <Ionicons name="create-outline" size={16} color={Colors.primary} />
          <Text style={styles.editButtonText}>Edit Product</Text>
        </TouchableOpacity>
      </View>

      {/* Variants */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Variants</Text>
        <TouchableOpacity
          style={styles.sectionAddButton}
          onPress={() =>
            router.push({
              pathname: '/modals/add-variant',
              params: { product_id: id },
            })
          }
        >
          <Ionicons name="add" size={20} color={Colors.primary} />
          <Text style={styles.sectionAddText}>Add Variant</Text>
        </TouchableOpacity>
      </View>

      {variants.length === 0 ? (
        <View style={styles.emptySection}>
          <Text style={styles.emptyText}>No variants yet</Text>
          <Text style={styles.emptySubtext}>
            Add variants like Small, Medium, Large or Box of 4
          </Text>
        </View>
      ) : (
        variants.map((variant) => (
          <View key={variant.id} style={styles.listItem}>
            <View style={styles.listItemLeft}>
              <Text style={styles.listItemName}>{variant.name}</Text>
              {variant.packaging && (
                <Text style={styles.listItemSub}>{variant.packaging}</Text>
              )}
            </View>
            <View style={styles.listItemRight}>
              <Text style={styles.price}>
                ₱{variant.selling_price.toFixed(2)}
              </Text>
              <TouchableOpacity
                style={styles.deleteIcon}
                onPress={() => handleDeleteVariant(variant)}
              >
                <Ionicons name="trash-outline" size={18} color={Colors.error} />
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}

      {/* Recipe Ingredients */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recipe Ingredients</Text>
        <TouchableOpacity
          style={styles.sectionAddButton}
          onPress={() =>
            router.push({
              pathname: '/modals/add-recipe-ingredient',
              params: { product_id: id },
            })
          }
        >
          <Ionicons name="add" size={20} color={Colors.primary} />
          <Text style={styles.sectionAddText}>Add Ingredient</Text>
        </TouchableOpacity>
      </View>

      {recipeIngredients.length === 0 ? (
        <View style={styles.emptySection}>
          <Text style={styles.emptyText}>No ingredients yet</Text>
          <Text style={styles.emptySubtext}>
            Add the ingredients this recipe requires
          </Text>
        </View>
      ) : (
        <>
          {recipeIngredients.map((item) => (
            <View key={item.id} style={styles.listItem}>
              <View style={styles.listItemLeft}>
                <Text style={styles.listItemName}>
                  {getIngredientName(item.ingredient_id)}
                </Text>
                <Text style={styles.listItemSub}>
                  {item.quantity_used} {item.unit_used} used
                  {' · '}
                  bought {item.purchased_quantity} {item.purchased_unit}
                </Text>
              </View>
              <View style={styles.listItemRight}>
                <Text style={styles.ingredientCost}>
                  ₱{calculateIngredientCost(item, getIngredient(item.ingredient_id)).toFixed(2)}
                </Text>
                <TouchableOpacity
                  style={styles.deleteIcon}
                  onPress={() => handleDeleteRecipeIngredient(item)}
                >
                  <Ionicons name="trash-outline" size={18} color={Colors.error} />
                </TouchableOpacity>
              </View>
            </View>
          ))}
          <View style={styles.recipeCostTotal}>
            <Text style={styles.recipeCostTotalLabel}>Total recipe cost</Text>
            <Text style={styles.recipeCostTotalValue}>₱{recipeCost.toFixed(2)}</Text>
          </View>
        </>
      )}

      {/* Instructions */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Instructions</Text>
      </View>

      {product.preparation_instructions ? (
        <View style={styles.instructionsCard}>
          <Text style={styles.instructionsText}>
            {product.preparation_instructions}
          </Text>
        </View>
      ) : (
        <View style={styles.emptySection}>
          <Text style={styles.emptyText}>No instructions yet</Text>
          <Text style={styles.emptySubtext}>
            Add baking steps from Edit Product
          </Text>
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>

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

const getStyles = (Colors: ReturnType<typeof useTheme>) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
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
  photoWrap: {
    marginHorizontal: 16,
    marginTop: 16,
  },
  photo: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    backgroundColor: Colors.card,
  },
  photoPlaceholder: {
    width: '100%',
    height: 160,
    borderRadius: 12,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  photoPlaceholderText: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  card: {
    backgroundColor: Colors.card,
    margin: 16,
    borderRadius: 12,
    padding: 16,
  },
  categoryLabel: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  productName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 12,
    lineHeight: 20,
  },
  costSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 10,
    padding: 12,
    marginBottom: 4,
  },
  costSummaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  costSummaryDivider: {
    width: 1,
    height: 30,
    backgroundColor: Colors.border,
  },
  costSummaryLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    marginBottom: 2,
  },
  costSummaryValue: {
    fontSize: 15,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  marginText: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: 12,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  editButtonText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  sectionAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sectionAddText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
  },
  emptySection: {
    backgroundColor: Colors.card,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  emptySubtext: {
    fontSize: 12,
    color: '#bbb',
    marginTop: 4,
    textAlign: 'center',
  },
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
  listItemLeft: {
    flex: 1,
  },
  listItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  listItemName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  listItemSub: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  price: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.success,
  },
  ingredientCost: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  recipeCostTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  recipeCostTotalLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  recipeCostTotalValue: {
    fontSize: 13,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  instructionsCard: {
    backgroundColor: Colors.card,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 10,
    padding: 16,
  },
  instructionsText: {
    fontSize: 14,
    color: Colors.textPrimary,
    lineHeight: 22,
  },
  deleteIcon: {
    padding: 4,
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