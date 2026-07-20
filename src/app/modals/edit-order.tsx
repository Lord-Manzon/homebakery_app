import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import {
  getOrderById,
  getOrderItems,
  updateOrderWithItems,
} from '../../services/orders';
import { getProducts, getVariantsByProduct } from '../../services/products';
import { Product, ProductVariant } from '../../types';

type OrderItemDraft = {
  product: Product;
  variant: ProductVariant;
  quantity: number;
};

export default function EditOrderModal() {
  const Colors = useTheme();
  const styles = useMemo(() => getStyles(Colors), [Colors]);
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [customerName, setCustomerName] = useState('');
  const [orderType, setOrderType] = useState<'delivery' | 'pickup'>('delivery');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryFee, setDeliveryFee] = useState('0');
  const [deliveryDate, setDeliveryDate] = useState<Date | null>(null);
  const [deliveryTime, setDeliveryTime] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [customerNotes, setCustomerNotes] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<'unpaid' | 'paid'>('unpaid');
  const [orderItems, setOrderItems] = useState<OrderItemDraft[]>([]);

  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [quantity, setQuantity] = useState('1');
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [productSearch, setProductSearch] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load order, its items, and all products to allow re-picking
  useEffect(() => {
    async function load() {
      const [order, items, allProducts] = await Promise.all([
        getOrderById(id),
        getOrderItems(id),
        getProducts(),
      ]);

      setProducts(allProducts);

      if (order) {
        setCustomerName(order.customer_name);
        setOrderType(order.order_type);
        setDeliveryAddress(order.delivery_address ?? '');
        setDeliveryFee(order.delivery_fee.toString());
        setDeliveryDate(order.delivery_date ? new Date(order.delivery_date + 'T00:00:00') : null);
        if (order.delivery_time) {
          const [h, m] = order.delivery_time.split(':');
          const t = new Date();
          t.setHours(parseInt(h), parseInt(m), 0, 0);
          setDeliveryTime(t);
        }
        setCustomerNotes(order.customer_notes ?? '');
        setPaymentStatus(order.payment_status);
      }

      // Rebuild order item drafts with full product/variant objects
      const drafts: OrderItemDraft[] = [];
      for (const item of items) {
        const product = allProducts.find((p) => p.id === item.product_id);
        if (!product) continue;
        const productVariants = await getVariantsByProduct(product.id);
        const variant = productVariants.find((v) => v.id === item.variant_id);
        if (!variant) continue;
        drafts.push({ product, variant, quantity: item.quantity });
      }
      setOrderItems(drafts);

      setLoading(false);
    }
    load();
  }, [id]);

  useEffect(() => {
    async function loadVariants() {
      if (selectedProduct) {
        const data = await getVariantsByProduct(selectedProduct.id);
        setVariants(data);
        setSelectedVariant(null);
      }
    }
    loadVariants();
  }, [selectedProduct]);

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(productSearch.toLowerCase())
  );

  function handleAddItem() {
    if (!selectedProduct || !selectedVariant) {
      setErrors((e) => ({ ...e, items: 'Please select a product and variant.' }));
      return;
    }
    const qty = parseInt(quantity) || 1;
    const existing = orderItems.findIndex(
      (i) => i.variant.id === selectedVariant.id
    );
    if (existing >= 0) {
      const updated = [...orderItems];
      updated[existing].quantity += qty;
      setOrderItems(updated);
    } else {
      setOrderItems([
        ...orderItems,
        { product: selectedProduct, variant: selectedVariant, quantity: qty },
      ]);
    }
    setSelectedProduct(null);
    setSelectedVariant(null);
    setVariants([]);
    setQuantity('1');
    setProductSearch('');
    setShowProductPicker(false);
    setErrors((e) => ({ ...e, items: '' }));
  }

  function handleRemoveItem(index: number) {
    setOrderItems(orderItems.filter((_, i) => i !== index));
  }

  const subtotal = orderItems.reduce(
    (sum, item) => sum + item.variant.selling_price * item.quantity,
    0
  );
  const total = subtotal + (parseFloat(deliveryFee) || 0);

  async function handleSave() {
    const newErrors: Record<string, string> = {};
    if (!customerName.trim()) newErrors.customerName = 'Customer name is required.';
    if (orderItems.length === 0) newErrors.items = 'Please add at least one product.';
    if (orderType === 'delivery' && !deliveryAddress.trim()) newErrors.deliveryAddress = 'Delivery address is required.';
    if (!deliveryDate) newErrors.deliveryDate = 'Please set a delivery date.';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});
    setSaving(true);

    const success = await updateOrderWithItems(
      id,
      {
        customer_name: customerName.trim(),
        payment_status: paymentStatus,
        order_type: orderType,
        delivery_address: orderType === 'delivery' ? deliveryAddress.trim() : null,
        delivery_fee: parseFloat(deliveryFee) || 0,
        delivery_date: deliveryDate ? deliveryDate.toISOString().split('T')[0] : null,
        delivery_time: deliveryTime ? deliveryTime.toTimeString().slice(0, 5) : null,
        customer_notes: customerNotes.trim() || null,
        total_amount: total,
      },
      orderItems.map((item) => ({
        product_id: item.product.id,
        variant_id: item.variant.id,
        quantity: item.quantity,
        unit_price: item.variant.selling_price,
        subtotal: item.variant.selling_price * item.quantity,
      }))
    );

    setSaving(false);

    if (success) {
      router.back();
    } else {
      setErrors({ general: 'Failed to update order. Please try again.' });
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">

      {/* Customer Name */}
      <View style={styles.section}>
        <Text style={styles.label}>
          Customer Name <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          style={[styles.input, errors.customerName ? styles.inputError : null]}
          placeholder="e.g. Maria Santos"
          placeholderTextColor={Colors.textMuted}
          value={customerName}
          onChangeText={(t) => { setCustomerName(t); setErrors((e) => ({ ...e, customerName: '' })); }}
        />
        {errors.customerName ? <Text style={styles.errorText}>{errors.customerName}</Text> : null}
      </View>

      {/* Order Type */}
      <View style={styles.section}>
        <Text style={styles.label}>Order Type</Text>
        <View style={styles.toggleRow}>
          <TouchableOpacity
            style={[styles.toggleButton, orderType === 'delivery' && styles.toggleButtonActive]}
            onPress={() => setOrderType('delivery')}
          >
            <Text style={[styles.toggleText, orderType === 'delivery' && styles.toggleTextActive]}>
              🛵 Delivery
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, orderType === 'pickup' && styles.toggleButtonActive]}
            onPress={() => setOrderType('pickup')}
          >
            <Text style={[styles.toggleText, orderType === 'pickup' && styles.toggleTextActive]}>
              🏠 Pickup
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Delivery Address */}
      {orderType === 'delivery' && (
        <View style={styles.section}>
          <Text style={styles.label}>
            Delivery Address <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={[styles.input, styles.textArea, errors.deliveryAddress ? styles.inputError : null]}
            placeholder="Enter delivery address..."
            placeholderTextColor={Colors.textMuted}
            value={deliveryAddress}
            onChangeText={(t) => { setDeliveryAddress(t); setErrors((e) => ({ ...e, deliveryAddress: '' })); }}
            multiline
            numberOfLines={2}
          />
          {errors.deliveryAddress ? <Text style={styles.errorText}>{errors.deliveryAddress}</Text> : null}
        </View>
      )}

      {/* Delivery Date & Time */}
      <View style={styles.row}>
        <View style={[styles.section, { flex: 1, marginRight: 8 }]}>
          <Text style={styles.label}>
            Date <Text style={styles.required}>*</Text>
          </Text>
          {Platform.OS === 'web' ? (
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={Colors.textMuted}
              value={deliveryDate ? deliveryDate.toISOString().split('T')[0] : ''}
              onChangeText={(text) => {
                const date = new Date(text);
                if (!isNaN(date.getTime())) setDeliveryDate(date);
              }}
            />
          ) : (
            <>
              <TouchableOpacity style={styles.input} onPress={() => setShowDatePicker(true)}>
                <Text style={deliveryDate ? styles.dateText : styles.datePlaceholder}>
                  {deliveryDate
                    ? deliveryDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                    : 'Select date'}
                </Text>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={deliveryDate ?? new Date()}
                  mode="date"
                  onChange={(event, date) => {
                    setShowDatePicker(false);
                    if (date) setDeliveryDate(date);
                  }}
                />
              )}
            </>
          )}
          {errors.deliveryDate ? <Text style={styles.errorText}>{errors.deliveryDate}</Text> : null}
        </View>
        <View style={[styles.section, { flex: 1 }]}>
          <Text style={styles.label}>Time</Text>
          {Platform.OS === 'web' ? (
            <TextInput
              style={styles.input}
              placeholder="HH:MM"
              placeholderTextColor={Colors.textMuted}
              value={deliveryTime ? deliveryTime.toTimeString().slice(0, 5) : ''}
              onChangeText={(text) => {
                const [hours, minutes] = text.split(':');
                const date = new Date();
                date.setHours(parseInt(hours) || 0);
                date.setMinutes(parseInt(minutes) || 0);
                setDeliveryTime(date);
              }}
            />
          ) : (
            <>
              <TouchableOpacity style={styles.input} onPress={() => setShowTimePicker(true)}>
                <Text style={deliveryTime ? styles.dateText : styles.datePlaceholder}>
                  {deliveryTime
                    ? deliveryTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                    : 'Select time'}
                </Text>
              </TouchableOpacity>
              {showTimePicker && (
                <DateTimePicker
                  value={deliveryTime ?? new Date()}
                  mode="time"
                  onChange={(event, date) => {
                    setShowTimePicker(false);
                    if (date) setDeliveryTime(date);
                  }}
                />
              )}
            </>
          )}
        </View>
      </View>

      {/* Delivery Fee */}
      {orderType === 'delivery' && (
        <View style={styles.section}>
          <Text style={styles.label}>Delivery Fee</Text>
          <TextInput
            style={styles.input}
            placeholder="0.00"
            placeholderTextColor={Colors.textMuted}
            value={deliveryFee}
            onChangeText={setDeliveryFee}
            keyboardType="numeric"
          />
        </View>
      )}

      {/* Payment Status */}
      <View style={styles.section}>
        <Text style={styles.label}>Payment Status</Text>
        <View style={styles.toggleRow}>
          <TouchableOpacity
            style={[styles.toggleButton, paymentStatus === 'unpaid' && styles.toggleButtonUnpaid]}
            onPress={() => setPaymentStatus('unpaid')}
          >
            <Text style={[styles.toggleText, paymentStatus === 'unpaid' && styles.toggleTextActive]}>
              Unpaid
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, paymentStatus === 'paid' && styles.toggleButtonPaid]}
            onPress={() => setPaymentStatus('paid')}
          >
            <Text style={[styles.toggleText, paymentStatus === 'paid' && styles.toggleTextActive]}>
              ✓ Paid
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Order Items */}
      <View style={styles.section}>
        <Text style={styles.label}>
          Products <Text style={styles.required}>*</Text>
        </Text>

        {orderItems.map((item, index) => (
          <View key={index} style={styles.orderItem}>
            <View style={styles.orderItemLeft}>
              <Text style={styles.orderItemName}>{item.product.name}</Text>
              <Text style={styles.orderItemVariant}>
                {item.variant.name} × {item.quantity}
              </Text>
            </View>
            <View style={styles.orderItemRight}>
              <Text style={styles.orderItemPrice}>
                ₱{(item.variant.selling_price * item.quantity).toFixed(2)}
              </Text>
              <TouchableOpacity onPress={() => handleRemoveItem(index)}>
                <Ionicons name="close-circle" size={20} color={Colors.error} />
              </TouchableOpacity>
            </View>
          </View>
        ))}

        <TouchableOpacity
          style={styles.addItemButton}
          onPress={() => { setShowProductPicker(!showProductPicker); setErrors((e) => ({ ...e, items: '' })); }}
        >
          <Ionicons name="add-circle-outline" size={20} color={Colors.primary} />
          <Text style={styles.addItemText}>Add Product</Text>
        </TouchableOpacity>
        {errors.items ? <Text style={styles.errorText}>{errors.items}</Text> : null}

        {showProductPicker && (
          <View style={styles.picker}>
            <TextInput
              style={styles.input}
              placeholder="Search product..."
              placeholderTextColor={Colors.textMuted}
              value={productSearch}
              onChangeText={setProductSearch}
            />

            {!selectedProduct && (
              <View style={styles.pickerList}>
                {filteredProducts.map((product) => (
                  <TouchableOpacity
                    key={product.id}
                    style={styles.pickerItem}
                    onPress={() => {
                      setSelectedProduct(product);
                      setProductSearch(product.name);
                    }}
                  >
                    <Text style={styles.pickerItemText}>{product.name}</Text>
                    {product.category && (
                      <Text style={styles.pickerItemSub}>{product.category}</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {selectedProduct && variants.length === 0 && (
              <View style={styles.noVariantBox}>
                <Ionicons name="warning-outline" size={18} color={Colors.warning} />
                <Text style={styles.noVariantText}>This product has no variants yet.</Text>
                <TouchableOpacity onPress={() => { setSelectedProduct(null); setProductSearch(''); }}>
                  <Text style={styles.noVariantLink}>Choose a different product</Text>
                </TouchableOpacity>
              </View>
            )}
            {selectedProduct && variants.length > 0 && (
              <View style={styles.variantPicker}>
                <Text style={styles.pickerLabel}>Select Variant</Text>
                {variants.map((variant) => (
                  <TouchableOpacity
                    key={variant.id}
                    style={[styles.variantItem, selectedVariant?.id === variant.id && styles.variantItemSelected]}
                    onPress={() => setSelectedVariant(variant)}
                  >
                    <Text style={styles.variantItemName}>{variant.name}</Text>
                    <Text style={styles.variantItemPrice}>₱{variant.selling_price.toFixed(2)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {selectedVariant && (
              <View style={styles.quantityRow}>
                <Text style={styles.pickerLabel}>Quantity</Text>
                <View style={styles.quantityControls}>
                  <TouchableOpacity
                    style={styles.quantityButton}
                    onPress={() => setQuantity((q) => Math.max(1, parseInt(q) - 1).toString())}
                  >
                    <Ionicons name="remove" size={18} color={Colors.primary} />
                  </TouchableOpacity>
                  <Text style={styles.quantityValue}>{quantity}</Text>
                  <TouchableOpacity
                    style={styles.quantityButton}
                    onPress={() => setQuantity((q) => (parseInt(q) + 1).toString())}
                  >
                    <Ionicons name="add" size={18} color={Colors.primary} />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity style={styles.confirmButton} onPress={handleAddItem}>
                  <Text style={styles.confirmButtonText}>Add to Order</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Customer Notes */}
      <View style={styles.section}>
        <Text style={styles.label}>Customer Notes (optional)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Any special requests..."
          placeholderTextColor={Colors.textMuted}
          value={customerNotes}
          onChangeText={setCustomerNotes}
          multiline
          numberOfLines={3}
        />
      </View>

      {/* Order Total */}
      {orderItems.length > 0 && (
        <View style={styles.totalCard}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>₱{subtotal.toFixed(2)}</Text>
          </View>
          {orderType === 'delivery' && parseFloat(deliveryFee) > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Delivery Fee</Text>
              <Text style={styles.totalValue}>₱{parseFloat(deliveryFee).toFixed(2)}</Text>
            </View>
          )}
          <View style={[styles.totalRow, styles.totalFinal]}>
            <Text style={styles.totalFinalLabel}>Total</Text>
            <Text style={styles.totalFinalValue}>₱{total.toFixed(2)}</Text>
          </View>
        </View>
      )}

      {errors.general ? <Text style={[styles.errorText, { textAlign: 'center', marginBottom: 8 }]}>{errors.general}</Text> : null}

      {/* Save Button */}
      <TouchableOpacity
        style={[styles.saveButton, saving && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={saving}
      >
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Save Changes</Text>}
      </TouchableOpacity>

      <View style={{ height: 40 + insets.bottom }} />
    </ScrollView>
  );
}

const getStyles = (Colors: ReturnType<typeof useTheme>) => StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: 16 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  section: { marginBottom: 16 },
  row: { flexDirection: 'row' },
  label: {
    fontSize: 13, fontWeight: '600', color: Colors.textSecondary,
    marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  required: { color: Colors.error },
  input: {
    backgroundColor: Colors.card, borderRadius: 10,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 15, color: Colors.textPrimary,
  },
  inputError: { borderColor: Colors.error, borderWidth: 1.5 },
  errorText: { fontSize: 12, color: Colors.error, marginTop: 4, fontWeight: '500' },
  textArea: { height: 70, textAlignVertical: 'top' },
  toggleRow: { flexDirection: 'row', gap: 8 },
  toggleButton: {
    flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center',
    backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border,
  },
  toggleButtonActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  toggleButtonPaid: { backgroundColor: Colors.success, borderColor: Colors.success },
  toggleButtonUnpaid: { backgroundColor: Colors.error, borderColor: Colors.error },
  toggleText: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  toggleTextActive: { color: '#fff' },
  orderItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: Colors.card, borderRadius: 10, padding: 12, marginBottom: 8,
    borderWidth: 1, borderColor: Colors.border,
  },
  orderItemLeft: { flex: 1 },
  orderItemName: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  orderItemVariant: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  orderItemRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  orderItemPrice: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  addItemButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10 },
  addItemText: { fontSize: 14, color: Colors.primary, fontWeight: '600' },
  picker: {
    backgroundColor: Colors.card, borderRadius: 10, borderWidth: 1,
    borderColor: Colors.border, padding: 12, gap: 8,
  },
  pickerList: { maxHeight: 200 },
  pickerItem: {
    paddingVertical: 10, paddingHorizontal: 4,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  pickerItemText: { fontSize: 15, color: Colors.textPrimary, fontWeight: '600' },
  pickerItemSub: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  pickerLabel: {
    fontSize: 12, fontWeight: '600', color: Colors.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6,
  },
  variantPicker: { gap: 6 },
  variantItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 10, borderRadius: 8, borderWidth: 1, borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  variantItemSelected: { borderColor: Colors.primary, backgroundColor: Colors.lowStockBackground },
  variantItemName: { fontSize: 14, color: Colors.textPrimary, fontWeight: '600' },
  variantItemPrice: { fontSize: 14, color: Colors.success, fontWeight: '700' },
  quantityRow: { gap: 8 },
  quantityControls: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  quantityButton: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.background,
    borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center',
  },
  quantityValue: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, minWidth: 30, textAlign: 'center' },
  confirmButton: { backgroundColor: Colors.primary, borderRadius: 8, paddingVertical: 10, alignItems: 'center', marginTop: 4 },
  confirmButtonText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  totalCard: { backgroundColor: Colors.card, borderRadius: 12, padding: 16, marginBottom: 16, gap: 8 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between' },
  totalLabel: { fontSize: 14, color: Colors.textSecondary },
  totalValue: { fontSize: 14, color: Colors.textPrimary, fontWeight: '600' },
  totalFinal: { borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 8, marginTop: 4 },
  totalFinalLabel: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  totalFinalValue: { fontSize: 18, fontWeight: '700', color: Colors.primary },
  saveButton: { backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  dateText: { fontSize: 15, color: Colors.textPrimary, paddingVertical: 2 },
  datePlaceholder: { fontSize: 15, color: Colors.textMuted, paddingVertical: 2 },
  noVariantBox: { backgroundColor: Colors.lowStockBackground, borderRadius: 10, padding: 12, alignItems: 'center', gap: 6 },
  noVariantText: { fontSize: 13, color: Colors.warning, fontWeight: '600', textAlign: 'center' },
  noVariantLink: { fontSize: 13, color: Colors.primary, fontWeight: '600', textDecorationLine: 'underline' },
});