import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
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
import { Colors } from '../../constants/theme';
import {
  adjustStock,
  deleteIngredient,
  getIngredientRecipeCounts,
  getIngredients,
  getProductsUsingIngredient,
} from '../../services/ingredients';
import { Ingredient } from '../../types';

export default function InventoryScreen() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [filtered, setFiltered] = useState<Ingredient[]>([]);
  const [recipeCounts, setRecipeCounts] = useState<Record<string, number>>({});
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [usedIn, setUsedIn] = useState<{
    ingredientName: string;
    products: string[];
    loading: boolean;
  } | null>(null);
  const [restock, setRestock] = useState<{
    ingredient: Ingredient;
    amount: string;
    error: string;
    saving: boolean;
  } | null>(null);
  const [confirm, setConfirm] = useState<{
    title: string;
    message: string;
    actionLabel: string;
    onConfirm: () => void;
  } | null>(null);

  async function load() {
    const data = await getIngredients();
    setIngredients(data);
    setFiltered(data);
    const counts = await getIngredientRecipeCounts(data.map((i) => i.id));
    setRecipeCounts(counts);
    setLoading(false);
  }

  async function openUsedIn(ingredient: Ingredient) {
    setUsedIn({ ingredientName: ingredient.name, products: [], loading: true });
    const products = await getProductsUsingIngredient(ingredient.id);
    setUsedIn({ ingredientName: ingredient.name, products, loading: false });
  }

  function openRestock(ingredient: Ingredient) {
    setRestock({ ingredient, amount: '', error: '', saving: false });
  }

  function handleRestockStep(direction: 1 | -1) {
    if (!restock) return;
    const { step } = getRestockConfig(restock.ingredient.unit);
    const current = parseFloat(restock.amount) || 0;
    const next = Math.max(0, current + step * direction);
    // Round to avoid floating point artifacts like 0.30000000000000004
    const rounded = Math.round(next * 100) / 100;
    setRestock({ ...restock, amount: rounded === 0 ? '' : formatQty(rounded), error: '' });
  }

  async function handleRestockSave() {
    if (!restock) return;

    const amountNum = parseFloat(restock.amount);
    if (!restock.amount || isNaN(amountNum) || amountNum <= 0) {
      setRestock({ ...restock, error: 'Enter an amount greater than 0.' });
      return;
    }

    setRestock({ ...restock, saving: true, error: '' });

    const previousStock = restock.ingredient.current_stock;
    const newStock = previousStock + amountNum;
    const success = await adjustStock(restock.ingredient.id, newStock, previousStock);

    if (success) {
      setRestock(null);
      await load();
    } else {
      setRestock({ ...restock, saving: false, error: 'Failed to update stock. Please try again.' });
    }
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
      setFiltered(ingredients);
    } else {
      setFiltered(
        ingredients.filter((i) =>
          i.name.toLowerCase().includes(search.toLowerCase())
        )
      );
    }
  }, [search, ingredients]);

  function handleDelete(ingredient: Ingredient) {
    setConfirm({
      title: 'Delete Ingredient',
      message: `Are you sure you want to delete "${ingredient.name}"?`,
      actionLabel: 'Delete',
      onConfirm: async () => {
        const success = await deleteIngredient(ingredient.id);
        setConfirm(null);
        if (success) {
          await load();
        } else {
          setConfirm({
            title: 'Cannot Delete',
            message: 'This ingredient is used in a product recipe. Remove it from all recipes first.',
            actionLabel: 'OK',
            onConfirm: () => setConfirm(null),
          });
        }
      },
    });
  }

  const isLowStock = (ingredient: Ingredient) =>
    ingredient.current_stock <= ingredient.low_stock_threshold;

  type StockStatus = 'out' | 'low' | 'in';

  function getStockStatus(ingredient: Ingredient): StockStatus {
    if (ingredient.current_stock <= 0) return 'out';
    if (ingredient.current_stock <= ingredient.low_stock_threshold) return 'low';
    return 'in';
  }

  type StatusConfigMap = Record<StockStatus, { label: string; badgeStyle: object; textStyle: object }>;

  const STATUS_CONFIG: StatusConfigMap = {
    out: {
      label: 'Out of Stock',
      badgeStyle: styles.statusBadgeOut,
      textStyle: styles.statusTextOut,
    },
    low: {
      label: 'Low Stock',
      badgeStyle: styles.statusBadgeLow,
      textStyle: styles.statusTextLow,
    },
    in: {
      label: 'In Stock',
      badgeStyle: styles.statusBadgeIn,
      textStyle: styles.statusTextIn,
    },
  };

  // Ingredients that are Low or Out of Stock, worst-first then alphabetical.
  // Recomputed from `ingredients` on every render — cheap, no extra fetch.
  const MAX_ALERTS_SHOWN = 5;
  const stockAlerts = ingredients
    .map((ingredient) => ({ ingredient, status: getStockStatus(ingredient) }))
    .filter((a) => a.status !== 'in')
    .sort((a, b) => {
      if (a.status !== b.status) return a.status === 'out' ? -1 : 1;
      return a.ingredient.name.localeCompare(b.ingredient.name);
    });
  const visibleAlerts = stockAlerts.slice(0, MAX_ALERTS_SHOWN);
  const hiddenAlertCount = stockAlerts.length - visibleAlerts.length;

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
        <Ionicons name="search-outline" size={18} color="#999" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search ingredients..."
          placeholderTextColor="#999"
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      {/* Summary */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryNumber}>{ingredients.length}</Text>
          <Text style={styles.summaryLabel}>Total</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryNumber, { color: '#E07B39' }]}>
            {ingredients.filter(isLowStock).length}
          </Text>
          <Text style={styles.summaryLabel}>Low Stock</Text>
        </View>
      </View>

      {/* Stock Alerts */}
      {stockAlerts.length > 0 && (
        <View style={styles.alertsCard}>
          <View style={styles.alertsHeader}>
            <Ionicons name="warning-outline" size={16} color={Colors.warning} />
            <Text style={styles.alertsTitle}>
              Stock Alerts ({stockAlerts.length})
            </Text>
          </View>

          {visibleAlerts.map(({ ingredient, status }) => (
            <TouchableOpacity
              key={ingredient.id}
              style={styles.alertRow}
              onPress={() => openRestock(ingredient)}
            >
              <View
                style={[
                  styles.alertDot,
                  status === 'out' ? styles.alertDotOut : styles.alertDotLow,
                ]}
              />
              <Text style={styles.alertName} numberOfLines={1}>
                {ingredient.name}
              </Text>
              <Text
                style={[
                  styles.alertStatus,
                  status === 'out' ? styles.statusTextOut : styles.statusTextLow,
                ]}
              >
                {status === 'out' ? 'OUT' : 'LOW'} · {formatQty(ingredient.current_stock)} {ingredient.unit}
              </Text>
            </TouchableOpacity>
          ))}

          {hiddenAlertCount > 0 && (
            <Text style={styles.alertsMore}>
              +{hiddenAlertCount} more — scroll the list below
            </Text>
          )}
        </View>
      )}

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.centered}>
            <Ionicons name="cube-outline" size={48} color="#ddd" />
            <Text style={styles.emptyText}>No ingredients yet</Text>
            <Text style={styles.emptySubtext}>
              Tap the + button to add your first ingredient
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const status = getStockStatus(item);
          const statusConfig = STATUS_CONFIG[status];
          const count = recipeCounts[item.id] ?? 0;

          return (
            <View style={styles.card}>
              <View style={styles.cardLeft}>
                <Text style={styles.ingredientName}>{item.name}</Text>

                <View style={styles.qtyRow}>
                  <Text style={styles.qtyValue}>
                    {formatQty(item.current_stock)} {item.unit}
                  </Text>
                  {item.category && (
                    <Text style={styles.category}> · {item.category}</Text>
                  )}
                </View>

                {count > 0 && (
                  <TouchableOpacity
                    style={styles.recipeRow}
                    onPress={() => openUsedIn(item)}
                  >
                    <Ionicons name="restaurant-outline" size={12} color={Colors.textMuted} />
                    <Text style={styles.recipeText}>
                      Used in {count} {count === 1 ? 'recipe' : 'recipes'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
              <View style={styles.cardRight}>
                <View style={[styles.statusBadge, statusConfig.badgeStyle]}>
                  <Text style={[styles.statusBadgeText, statusConfig.textStyle]}>
                    {statusConfig.label}
                  </Text>
                </View>
                <View style={styles.iconRow}>
                  <TouchableOpacity
                    style={styles.iconButton}
                    onPress={() => openRestock(item)}
                  >
                    <Ionicons name="add-circle-outline" size={20} color={Colors.success} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.iconButton}
                    onPress={() => router.push({
                      pathname: '/modals/edit-ingredient',
                      params: {
                        id: item.id,
                        name: item.name,
                        category: item.category ?? '',
                        unit: item.unit,
                        current_stock: item.current_stock.toString(),
                        low_stock_threshold: item.low_stock_threshold.toString(),
                        average_cost: item.average_cost?.toString() ?? '0',
                        notes: item.notes ?? '',
                      },
                    })}
                  >
                    <Ionicons name="create-outline" size={20} color="#666" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.iconButton}
                    onPress={() => handleDelete(item)}
                  >
                    <Ionicons name="trash-outline" size={20} color="#e74c3c" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        }}
        
      />
      <FAB onPress={() => router.push('/modals/add-ingredient')} />

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

    <Modal
      visible={!!usedIn}
      transparent
      animationType="fade"
      onRequestClose={() => setUsedIn(null)}
    >
      <TouchableOpacity
        style={styles.confirmOverlay}
        activeOpacity={1}
        onPress={() => setUsedIn(null)}
      >
        <TouchableOpacity style={styles.usedInBox} activeOpacity={1} onPress={() => {}}>
          <View style={styles.usedInHeader}>
            <Text style={styles.confirmTitle}>Used In — {usedIn?.ingredientName}</Text>
            <TouchableOpacity onPress={() => setUsedIn(null)}>
              <Ionicons name="close" size={22} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>
          <Text style={styles.usedInSubtitle}>
            {usedIn?.ingredientName} appears in:
          </Text>
          {usedIn?.loading ? (
            <Text style={styles.confirmMessage}>Loading...</Text>
          ) : (
            usedIn?.products.map((name) => (
              <View key={name} style={styles.usedInItem}>
                <View style={styles.usedInDot} />
                <Text style={styles.usedInItemText}>{name}</Text>
              </View>
            ))
          )}
          <Text style={styles.usedInNote}>
            Changing this ingredient's price in a recipe requires editing each recipe individually.
          </Text>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>

    <Modal
      visible={!!restock}
      transparent
      animationType="fade"
      onRequestClose={() => setRestock(null)}
    >
      <View style={styles.confirmOverlay}>
        <View style={styles.confirmBox}>
          <Text style={styles.confirmTitle}>Restock {restock?.ingredient.name}</Text>
          <Text style={styles.confirmMessage}>
            Currently {restock ? formatQty(restock.ingredient.current_stock) : ''} {restock?.ingredient.unit}. How much did you add?
          </Text>
          <View style={styles.restockInputRow}>
            <TouchableOpacity
              style={styles.restockStepButton}
              onPress={() => handleRestockStep(-1)}
            >
              <Ionicons name="remove" size={20} color={Colors.textPrimary} />
            </TouchableOpacity>
            <TextInput
              style={styles.restockInput}
              placeholder="0"
              placeholderTextColor="#999"
              keyboardType="numeric"
              autoFocus
              value={restock?.amount}
              onChangeText={(text) =>
                restock && setRestock({ ...restock, amount: text, error: '' })
              }
            />
            <Text style={styles.restockUnit}>{restock?.ingredient.unit}</Text>
            <TouchableOpacity
              style={styles.restockStepButton}
              onPress={() => handleRestockStep(1)}
            >
              <Ionicons name="add" size={20} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>
          {restock && (
            <View style={styles.restockPresetRow}>
              {getRestockConfig(restock.ingredient.unit).presets.map((preset) => (
                <TouchableOpacity
                  key={preset}
                  style={styles.restockPresetChip}
                  onPress={() =>
                    setRestock({ ...restock, amount: String(preset), error: '' })
                  }
                >
                  <Text style={styles.restockPresetText}>{formatQty(preset)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          {!!restock?.error && (
            <Text style={styles.restockError}>{restock.error}</Text>
          )}
          <View style={styles.confirmButtons}>
            <TouchableOpacity style={styles.confirmCancel} onPress={() => setRestock(null)}>
              <Text style={styles.confirmCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmAction, styles.restockConfirmAction]}
              onPress={handleRestockSave}
              disabled={restock?.saving}
            >
              <Text style={styles.confirmActionText}>
                {restock?.saving ? 'Saving...' : 'Add Stock'}
              </Text>
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

// Preset quick-add amounts and the fine-tune step size, scaled to how the
// ingredient is actually measured. 250g of butter is normal; 250 eggs isn't.
function getRestockConfig(unit: string): { presets: number[]; step: number } {
  switch (unit) {
    case 'g':
    case 'ml':
      return { presets: [50, 100, 150, 200, 250], step: 10 };
    case 'kg':
    case 'L':
      return { presets: [0.5, 1, 2, 5, 10], step: 0.5 };
    case 'pcs':
      return { presets: [6, 12, 24], step: 1 };
    default:
      return { presets: [1, 5, 10, 20], step: 1 };
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  addButton: {
    backgroundColor: '#E07B39',
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#eee',
    height: 42,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 15,
    color: '#1a1a1a',
  },
  summaryRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 10,
    gap: 10,
  },
  summaryItem: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  summaryNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  alertsCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FFE0B2',
  },
  alertsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  alertsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
  },
  alertDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 8,
  },
  alertDotOut: {
    backgroundColor: Colors.error,
  },
  alertDotLow: {
    backgroundColor: '#E07B39',
  },
  alertName: {
    flex: 1,
    fontSize: 13,
    color: '#1a1a1a',
    marginRight: 8,
  },
  alertStatus: {
    fontSize: 11,
    fontWeight: '700',
  },
  alertsMore: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardLeft: {
    flex: 1,
  },
  cardRight: {
    alignItems: 'flex-end',
    alignSelf: 'center',
    gap: 8,
  },
  iconRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statusBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  statusBadgeOut: {
    backgroundColor: '#FDEDEC',
  },
  statusTextOut: {
    color: Colors.error,
  },
  statusBadgeLow: {
    backgroundColor: '#fff3e0',
  },
  statusTextLow: {
    color: '#E07B39',
  },
  statusBadgeIn: {
    backgroundColor: '#EAFAF1',
  },
  statusTextIn: {
    color: Colors.success,
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
  },
  qtyValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  recipeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  recipeText: {
    fontSize: 12,
    color: Colors.textMuted,
    textDecorationLine: 'underline',
  },
  usedInBox: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxHeight: '70%',
  },
  usedInHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  usedInSubtitle: {
    fontSize: 13,
    color: Colors.textMuted,
    marginBottom: 14,
  },
  usedInItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF8ED',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  usedInDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E07B39',
  },
  usedInItemText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  usedInNote: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 8,
    lineHeight: 16,
  },
  lowStockBadge: {
    backgroundColor: '#fff3e0',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  lowStockText: {
    fontSize: 10,
    color: '#E07B39',
    fontWeight: '600',
  },
  ingredientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  category: {
    fontSize: 13,
    color: '#999',
    marginTop: 2,
  },
  stock: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  iconButton: {
    padding: 4,
  },
  loadingText: {
    fontSize: 16,
    color: '#999',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#999',
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
  restockConfirmAction: {
    backgroundColor: Colors.success,
  },
  restockStepButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  restockPresetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  restockPresetChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFF3E0',
  },
  restockPresetText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#E07B39',
  },
  restockInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  restockInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
    paddingVertical: 12,
  },
  restockUnit: {
    fontSize: 15,
    color: Colors.textMuted,
    marginLeft: 8,
  },
  restockError: {
    fontSize: 13,
    color: Colors.error,
    marginBottom: 12,
  },
  confirmActionText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});