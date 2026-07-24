import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, Plus, Trash2 } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { getIngredients } from '../../services/ingredients';
import {
  deleteRecipeIngredient,
  getProductById,
  getRecipeIngredients,
} from '../../services/products';
import { getSettings } from '../../services/settings';
import { Ingredient, Product, RecipeIngredient, Settings } from '../../types';
import { calculateIngredientCost, calculateRecipeCost } from '../../utils/costing';
import { getCurrencyPrefix } from '../../utils/currency';

export default function RecipeModal() {
  const Colors = useTheme();
  const styles = useMemo(() => getStyles(Colors), [Colors]);
  const { product_id } = useLocalSearchParams<{ product_id: string }>();

  const [product, setProduct] = useState<Product | null>(null);
  const [recipeIngredients, setRecipeIngredients] = useState<RecipeIngredient[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState<{ ingredient: RecipeIngredient } | null>(null);

  async function load() {
    const [productData, recipeData, ingredientsData, settingsData] = await Promise.all([
      getProductById(product_id),
      getRecipeIngredients(product_id),
      getIngredients(),
      getSettings(),
    ]);
    setProduct(productData);
    setRecipeIngredients(recipeData);
    setIngredients(ingredientsData);
    setSettings(settingsData);
    setLoading(false);
  }

  useFocusEffect(useCallback(() => { load(); }, [product_id]));

  function getIngredient(ingredientId: string): Ingredient | undefined {
    return ingredients.find((i) => i.id === ingredientId);
  }

  function getIngredientName(ingredientId: string): string {
    return getIngredient(ingredientId)?.name ?? 'Unknown';
  }

  async function handleDelete() {
    if (!confirm) return;
    const success = await deleteRecipeIngredient(confirm.ingredient.id);
    setConfirm(null);
    if (success) await load();
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  const cur = getCurrencyPrefix(settings?.currency);
  const recipeCost = calculateRecipeCost(recipeIngredients, ingredients);
  const costPerPiece = product && product.yield > 0 ? recipeCost / product.yield : 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <ChevronLeft size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{product?.name ?? 'Recipe'}</Text>
        <View style={{ width: 34 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.summaryCard}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Total recipe cost</Text>
            <Text style={styles.summaryValue}>{cur}{recipeCost.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Cost per piece</Text>
            <Text style={styles.summaryValue}>{cur}{costPerPiece.toFixed(2)}</Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Ingredients</Text>
          <TouchableOpacity
            style={styles.sectionAddButton}
            onPress={() => router.push({ pathname: '/modals/add-recipe-ingredient', params: { product_id } })}
          >
            <Plus size={20} color={Colors.primary} />
            <Text style={styles.sectionAddText}>Add Ingredient</Text>
          </TouchableOpacity>
        </View>

        {recipeIngredients.length === 0 ? (
          <View style={styles.emptySection}>
            <Text style={styles.emptyText}>No ingredients yet</Text>
            <Text style={styles.emptySubtext}>Add the ingredients this recipe requires</Text>
          </View>
        ) : (
          recipeIngredients.map((item) => {
            const ing = getIngredient(item.ingredient_id);
            const cost = calculateIngredientCost(item, ing);
            return (
              <View key={item.id} style={styles.listItem}>
                <View style={styles.listItemLeft}>
                  <Text style={styles.listItemName}>{getIngredientName(item.ingredient_id)}</Text>
                  <Text style={styles.listItemSub}>
                    {item.quantity_used} {item.unit_used} used · bought {item.purchased_quantity} {item.purchased_unit}
                    {ing ? ` at ${cur}${ing.average_cost.toFixed(2)}` : ''}
                  </Text>
                </View>
                <View style={styles.listItemRight}>
                  <Text style={styles.ingredientCost}>{cur}{cost.toFixed(2)}</Text>
                  <TouchableOpacity style={styles.deleteIcon} onPress={() => setConfirm({ ingredient: item })}>
                    <Trash2 size={18} color={Colors.error} />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Instructions</Text>
        </View>
        {product?.preparation_instructions ? (
          <View style={styles.instructionsCard}>
            <Text style={styles.instructionsText}>{product.preparation_instructions}</Text>
          </View>
        ) : (
          <View style={styles.emptySection}>
            <Text style={styles.emptyText}>No instructions yet</Text>
            <Text style={styles.emptySubtext}>Add baking steps from Edit Product</Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      <Modal visible={!!confirm} transparent animationType="fade" onRequestClose={() => setConfirm(null)}>
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmBox}>
            <Text style={styles.confirmTitle}>Remove Ingredient</Text>
            <Text style={styles.confirmMessage}>
              Remove "{confirm ? getIngredientName(confirm.ingredient.ingredient_id) : ''}" from this recipe?
            </Text>
            <View style={styles.confirmButtons}>
              <TouchableOpacity style={styles.confirmCancel} onPress={() => setConfirm(null)}>
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmAction} onPress={handleDelete}>
                <Text style={styles.confirmActionText}>Remove</Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
  },
  headerBtn: { padding: 6, width: 34 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    marginHorizontal: 16,
    borderRadius: 14,
    padding: 14,
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryDivider: { width: 1, backgroundColor: Colors.border },
  summaryLabel: { fontSize: 11, color: Colors.textMuted, marginBottom: 3 },
  summaryValue: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 8,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  sectionAddButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sectionAddText: { fontSize: 14, color: Colors.primary, fontWeight: '600' },
  emptySection: {
    backgroundColor: Colors.card,
    marginHorizontal: 16,
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
  },
  emptyText: { fontSize: 14, fontWeight: '600', color: Colors.textMuted },
  emptySubtext: { fontSize: 12, color: Colors.textMuted, marginTop: 4, textAlign: 'center' },
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
  listItemLeft: { flex: 1, marginRight: 8 },
  listItemRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  listItemName: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  listItemSub: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  ingredientCost: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  deleteIcon: { padding: 4 },
  instructionsCard: { backgroundColor: Colors.card, marginHorizontal: 16, marginBottom: 8, borderRadius: 10, padding: 16 },
  instructionsText: { fontSize: 14, color: Colors.textPrimary, lineHeight: 22 },
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
    flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: Colors.background, alignItems: 'center',
  },
  confirmCancelText: { fontSize: 15, fontWeight: '600', color: Colors.textSecondary },
  confirmAction: {
    flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: Colors.error, alignItems: 'center',
  },
  confirmActionText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});