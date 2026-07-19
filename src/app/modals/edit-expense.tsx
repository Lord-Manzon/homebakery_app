import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import PopupSheet from '../../components/common/PopupSheet';
import { Colors } from '../../constants/theme';
import { updateExpense } from '../../services/expenses';

const TYPE_LABELS: Record<string, string> = {
  ingredient_purchase: '🛒 Ingredient Purchase',
  packaging: '📦 Packaging',
  transportation: '🚗 Transportation',
  utilities: '💡 Utilities',
  equipment: '🔧 Equipment',
  miscellaneous: '📝 Miscellaneous',
};

export default function EditExpenseModal() {
  const params = useLocalSearchParams();
  const expenseType = params.expense_type as string;
  const isIngredientPurchase = expenseType === 'ingredient_purchase';

  const [name, setName] = useState(params.name as string ?? '');
  const [amount, setAmount] = useState(params.amount as string ?? '');
  const [date, setDate] = useState(params.expense_date as string ?? '');
  const [notes, setNotes] = useState(params.notes as string ?? '');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function handleSave() {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = 'Name is required.';
    if (!amount || parseFloat(amount) <= 0) newErrors.amount = 'Please enter a valid amount.';
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});
    setSaving(true);

    const success = await updateExpense(params.id as string, {
      name: name.trim(),
      amount: parseFloat(amount),
      expense_date: date,
      notes: notes.trim() || null,
    });

    setSaving(false);

    if (success) {
      router.back();
    } else {
      setErrors({ general: 'Failed to update expense. Please try again.' });
    }
  }

  return (
    <PopupSheet title="Edit Expense">
      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
        {/* Type (read-only) */}
        <View style={styles.section}>
          <Text style={styles.label}>Type</Text>
          <View style={styles.typeBadge}>
            <Text style={styles.typeBadgeText}>{TYPE_LABELS[expenseType] ?? expenseType}</Text>
          </View>
          {isIngredientPurchase && (
            <Text style={styles.hint}>
              Quantity and stock can't be changed here — delete and re-add this expense if the purchased amount was wrong, so inventory stays in sync.
            </Text>
          )}
        </View>

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
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Save Changes</Text>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </PopupSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  section: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  required: {
    color: Colors.error,
  },
  input: {
    backgroundColor: Colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  typeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.background,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  typeBadgeText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  hint: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 6,
    lineHeight: 16,
  },
  saveButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
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