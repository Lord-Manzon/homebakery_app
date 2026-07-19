import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/theme';
import { addExpense, addIngredientPurchaseExpense } from '../../services/expenses';
import { getIngredients } from '../../services/ingredients';
import { Expense, Ingredient } from '../../types';

const EXPENSE_TYPES = [
  { key: 'ingredient_purchase', label: '🛒 Ingredient Purchase' },
  { key: 'packaging', label: '📦 Packaging' },
  { key: 'transportation', label: '🚗 Transportation' },
  { key: 'utilities', label: '💡 Utilities' },
  { key: 'equipment', label: '🔧 Equipment' },
  { key: 'miscellaneous', label: '📝 Miscellaneous' },
];

export default function AddExpenseModal() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    prefill_ingredient_id?: string;
    prefill_ingredient_name?: string;
    prefill_unit?: string;
  }>();

  const [expenseType, setExpenseType] = useState(
    params.prefill_ingredient_id ? 'ingredient_purchase' : 'miscellaneous'
  );
  const [name, setName] = useState(params.prefill_ingredient_name ?? '');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Ingredient purchase fields
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(null);
  const [ingredientSearch, setIngredientSearch] = useState(params.prefill_ingredient_name ?? '');
  const [showDropdown, setShowDropdown] = useState(false);
  const [purchasedQuantity, setPurchasedQuantity] = useState('');

  useEffect(() => {
    getIngredients().then((data) => {
      setIngredients(data);
      // Auto-select the ingredient if we came here via a prefill link
      if (params.prefill_ingredient_id) {
        const match = data.find((i) => i.id === params.prefill_ingredient_id);
        if (match) setSelectedIngredient(match);
      }
    });
  }, []);

  const filteredIngredients = ingredients.filter((i) =>
    i.name.toLowerCase().includes(ingredientSearch.toLowerCase())
  );

  async function handleSave() {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = 'Name is required.';
    if (!amount || parseFloat(amount) <= 0) newErrors.amount = 'Please enter a valid amount.';
    if (expenseType === 'ingredient_purchase' && !selectedIngredient) newErrors.ingredient = 'Please select an ingredient.';
    if (expenseType === 'ingredient_purchase' && !purchasedQuantity) newErrors.quantity = 'Please enter purchased quantity.';
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});
    setSaving(true);

    const expenseData = {
      expense_type: expenseType as Expense['expense_type'],
      name: name.trim(),
      amount: parseFloat(amount),
      expense_date: date,
      ingredient_id: selectedIngredient?.id ?? null,
      purchased_quantity: purchasedQuantity ? parseFloat(purchasedQuantity) : null,
      purchased_unit: selectedIngredient?.unit ?? null,
      notes: notes.trim() || null,
    };

    let success = false;

    if (expenseType === 'ingredient_purchase' && selectedIngredient) {
      const qty = parseFloat(purchasedQuantity);
      const prev = selectedIngredient.current_stock;
      const next = prev + qty;
      success = await addIngredientPurchaseExpense(
        expenseData, selectedIngredient.id, qty, prev, next
      );
    } else {
      const result = await addExpense(expenseData);
      success = !!result;
    }

    setSaving(false);

    if (success) {
      router.back();
    } else {
      setErrors({ general: 'Failed to save expense. Please try again.' });
    }
  }

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">

      {/* Type Selector */}
      <View style={styles.section}>
        <Text style={styles.label}>Expense Type</Text>
        {EXPENSE_TYPES.map((type) => (
          <TouchableOpacity
            key={type.key}
            style={[styles.typeItem, expenseType === type.key && styles.typeItemSelected]}
            onPress={() => setExpenseType(type.key)}
          >
            <Text style={[styles.typeText, expenseType === type.key && styles.typeTextSelected]}>
              {type.label}
            </Text>
            {expenseType === type.key && (
              <Text style={styles.typeCheck}>✓</Text>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Ingredient Selector (only for ingredient purchase) */}
      {expenseType === 'ingredient_purchase' && (
        <View style={styles.section}>
          <Text style={styles.label}>Ingredient <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={styles.input}
            placeholder="Search ingredient..."
            placeholderTextColor={Colors.textMuted}
            value={ingredientSearch}
            onChangeText={(t) => {
              setIngredientSearch(t);
              setSelectedIngredient(null);
              setShowDropdown(true);
            }}
            onFocus={() => setShowDropdown(true)}
          />
          {showDropdown && filteredIngredients.length > 0 && (
            <View style={styles.dropdown}>
              {filteredIngredients.slice(0, 5).map((i) => (
                <TouchableOpacity
                  key={i.id}
                  style={styles.dropdownItem}
                  onPress={() => {
                    setSelectedIngredient(i);
                    setIngredientSearch(i.name);
                    setName(i.name);
                    setShowDropdown(false);
                  }}
                >
                  <Text style={styles.dropdownText}>{i.name}</Text>
                  <Text style={styles.dropdownUnit}>{i.unit}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          {selectedIngredient && (
            <Text style={styles.currentStock}>
              Current stock: {selectedIngredient.current_stock} {selectedIngredient.unit}
            </Text>
          )}
          {errors.ingredient ? <Text style={styles.errorText}>{errors.ingredient}</Text> : null}
        </View>
      )}

      {/* Purchased Quantity */}
      {expenseType === 'ingredient_purchase' && (
        <View style={styles.section}>
          <Text style={styles.label}>
            Purchased Quantity <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={[styles.input, errors.quantity ? styles.inputError : null]}
            placeholder={`Amount in ${selectedIngredient?.unit ?? 'units'}`}
            placeholderTextColor={Colors.textMuted}
            value={purchasedQuantity}
            onChangeText={(t) => { setPurchasedQuantity(t); setErrors((e) => ({ ...e, quantity: '' })); }}
            keyboardType="numeric"
          />
          {errors.quantity ? <Text style={styles.errorText}>{errors.quantity}</Text> : null}
        </View>
      )}

      {/* Name */}
      <View style={styles.section}>
        <Text style={styles.label}>
          Name <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          style={[styles.input, errors.name ? styles.inputError : null]}
          placeholder="e.g. All Purpose Flour"
          placeholderTextColor={Colors.textMuted}
          value={name}
          onChangeText={(t) => { setName(t); setErrors((e) => ({ ...e, name: '' })); }}
        />
        {errors.name ? <Text style={styles.errorText}>{errors.name}</Text> : null}
      </View>

      {/* Amount */}
      <View style={styles.section}>
        <Text style={styles.label}>
          Amount (₱) <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          style={[styles.input, errors.amount ? styles.inputError : null]}
          placeholder="0.00"
          placeholderTextColor={Colors.textMuted}
          value={amount}
          onChangeText={(t) => { setAmount(t); setErrors((e) => ({ ...e, amount: '' })); }}
          keyboardType="numeric"
        />
        {errors.amount ? <Text style={styles.errorText}>{errors.amount}</Text> : null}
      </View>

      {/* Date */}
      <View style={styles.section}>
        <Text style={styles.label}>Date</Text>
        <TextInput
          style={styles.input}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={Colors.textMuted}
          value={date}
          onChangeText={setDate}
        />
      </View>

      {/* Notes */}
      <View style={styles.section}>
        <Text style={styles.label}>Notes (optional)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Any additional notes..."
          placeholderTextColor={Colors.textMuted}
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
        />
      </View>

      {errors.general ? <Text style={[styles.errorText, { textAlign: 'center', marginBottom: 8 }]}>{errors.general}</Text> : null}

      <TouchableOpacity
        style={[styles.saveButton, saving && { opacity: 0.6 }]}
        onPress={handleSave}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveButtonText}>Save Expense</Text>
        )}
      </TouchableOpacity>

      <View style={{ height: 40 + insets.bottom }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: 16 },
  section: { marginBottom: 16 },
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
  textArea: { height: 80, textAlignVertical: 'top' },
  typeItem: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', backgroundColor: Colors.card,
    borderRadius: 10, borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 14, paddingVertical: 12, marginBottom: 6,
  },
  typeItemSelected: { borderColor: Colors.primary, backgroundColor: '#FFF3E0' },
  typeText: { fontSize: 14, color: Colors.textSecondary },
  typeTextSelected: { color: Colors.primary, fontWeight: '600' },
  typeCheck: { fontSize: 14, color: Colors.primary, fontWeight: '700' },
  dropdown: {
    backgroundColor: Colors.card, borderRadius: 10,
    borderWidth: 1, borderColor: Colors.border, marginTop: 4,
  },
  dropdownItem: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  dropdownText: { fontSize: 15, color: Colors.textPrimary },
  dropdownUnit: { fontSize: 13, color: Colors.textMuted },
  currentStock: { fontSize: 12, color: Colors.success, marginTop: 6, fontWeight: '600' },
  saveButton: {
    backgroundColor: Colors.primary, borderRadius: 12,
    paddingVertical: 14, alignItems: 'center', marginTop: 8,
  },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  inputError: {
    borderColor: Colors.error,
    borderWidth: 1.5,
  },
  errorText: {
    fontSize: 12,
    color: Colors.error,
    marginTop: 4,
    fontWeight: '500',
  },
});