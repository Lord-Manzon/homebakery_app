import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
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
import { getIngredients } from '../../services/ingredients';
import {
  archiveVariant,
  deleteRecipeIngredient,
  getProductById,
  getRecipeIngredients,
  getVariantsByProduct,
} from '../../services/products';
import { Ingredient, Product, ProductVariant, RecipeIngredient } from '../../types';

export default function ProductDetailModal() {
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

  function getIngredientName(ingredientId: string): string {
    return ingredients.find((i) => i.id === ingredientId)?.name ?? 'Unknown';
  }

  function getIngredientUnit(ingredientId: string): string {
    return ingredients.find((i) => i.id === ingredientId)?.unit ?? '';
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

  return (
    <View style={styles.container}>
    <ScrollView
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Product Info */}
      <View style={styles.card}>
        {product.category && (
          <Text style={styles.categoryLabel}>{product.category}</Text>
        )}
        <Text style={styles.productName}>{product.name}</Text>
        {product.description && (
          <Text style={styles.description}>{product.description}</Text>
        )}
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Text style={styles.metaValue}>{product.yield}</Text>
            <Text style={styles.metaLabel}>Yield</Text>
          </View>
          <View style={styles.metaDivider} />
          <View style={styles.metaItem}>
            <Text style={styles.metaValue}>{product.buffer_percent}%</Text>
            <Text style={styles.metaLabel}>Buffer</Text>
          </View>
          <View style={styles.metaDivider} />
          <View style={styles.metaItem}>
            <Text style={styles.metaValue}>{product.markup_percent}%</Text>
            <Text style={styles.metaLabel}>Markup</Text>
          </View>
        </View>
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
        recipeIngredients.map((item) => (
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
            <TouchableOpacity
              style={styles.deleteIcon}
              onPress={() => handleDeleteRecipeIngredient(item)}
            >
              <Ionicons name="trash-outline" size={18} color={Colors.error} />
            </TouchableOpacity>
          </View>
        ))
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

const styles = StyleSheet.create({
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
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  metaItem: {
    flex: 1,
    alignItems: 'center',
  },
  metaValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  metaLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  metaDivider: {
    width: 1,
    height: 30,
    backgroundColor: Colors.border,
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