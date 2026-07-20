import { Ionicons } from '@expo/vector-icons';
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
import { archiveProduct, getProducts } from '../../services/products';
import { Product } from '../../types';

export default function ProductsScreen() {
  const Colors = useTheme();
  const styles = useMemo(() => getStyles(Colors), [Colors]);
  const [products, setProducts] = useState<Product[]>([]);
  const [filtered, setFiltered] = useState<Product[]>([]);
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
    const data = await getProducts();
    setProducts(data);
    setFiltered(data);
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
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() =>
              router.push({
                pathname: '/modals/product-detail',
                params: { id: item.id },
              })
            }
          >
            <View style={styles.cardLeft}>
              {item.category && (
                <Text style={styles.category}>{item.category}</Text>
              )}
              <Text style={styles.productName}>{item.name}</Text>
              <View style={styles.metaRow}>
                <Text style={styles.meta}>Yield: {item.yield}</Text>
                {item.buffer_percent > 0 && (
                  <Text style={styles.meta}>
                    Buffer: {item.buffer_percent}%
                  </Text>
                )}
                {item.markup_percent > 0 && (
                  <Text style={styles.meta}>
                    Markup: {item.markup_percent}%
                  </Text>
                )}
              </View>
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
          </TouchableOpacity>
        )}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: Colors.card,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  addButton: {
    backgroundColor: Colors.primary,
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  metaRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  meta: {
    fontSize: 12,
    color: Colors.textMuted,
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