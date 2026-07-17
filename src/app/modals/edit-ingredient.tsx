import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import PopupSheet from '../../components/common/PopupSheet';
import { Colors } from '../../constants/theme';
import { updateIngredient } from '../../services/ingredients';

const UNITS = ['g', 'kg', 'ml', 'L', 'pcs', 'tsp', 'tbsp', 'cup', 'pack', 'bottle', 'sachet'];
const CATEGORIES = ['Dry Goods', 'Dairy', 'Wet Ingredients', 'Sweeteners', 'Flavorings', 'Packaging', 'Others'];

export default function EditIngredientModal() {
  const params = useLocalSearchParams();

  const [name, setName] = useState(params.name as string ?? '');
  const [category, setCategory] = useState(params.category as string ?? '');
  const [unit, setUnit] = useState(params.unit as string ?? '');
  const [currentStock, setCurrentStock] = useState(params.current_stock as string ?? '0');
  const [lowStockThreshold, setLowStockThreshold] = useState(params.low_stock_threshold as string ?? '0');
  const [averageCost, setAverageCost] = useState(params.average_cost as string ?? '0');
  const [notes, setNotes] = useState(params.notes as string ?? '');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Ingredient name is required.');
      return;
    }
    if (!unit.trim()) {
      Alert.alert('Validation Error', 'Unit is required.');
      return;
    }

    setSaving(true);

    const success = await updateIngredient(params.id as string, {
      name: name.trim(),
      category: category.trim() || null,
      unit: unit.trim(),
      current_stock: parseFloat(currentStock) || 0,
      low_stock_threshold: parseFloat(lowStockThreshold) || 0,
      average_cost: parseFloat(averageCost) || 0,
      notes: notes.trim() || null,
    });

    setSaving(false);

    if (success) {
      router.back();
    } else {
      Alert.alert('Error', 'Failed to update ingredient. Please try again.');
    }
  }

  return (
    <PopupSheet title="Edit Ingredient">
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      {/* Name */}
      <View style={styles.section}>
        <Text style={styles.label}>
          Ingredient Name <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. All Purpose Flour"
          placeholderTextColor={Colors.textMuted}
          value={name}
          onChangeText={setName}
        />
      </View>

      {/* Category */}
      <View style={styles.section}>
        <Text style={styles.label}>Category</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.chipRow}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[styles.chip, category === cat && styles.chipSelected]}
                onPress={() => setCategory(category === cat ? '' : cat)}
              >
                <Text style={[styles.chipText, category === cat && styles.chipTextSelected]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Unit */}
      <View style={styles.section}>
        <Text style={styles.label}>
          Unit <Text style={styles.required}>*</Text>
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.chipRow}>
            {UNITS.map((u) => (
              <TouchableOpacity
                key={u}
                style={[styles.chip, unit === u && styles.chipSelected]}
                onPress={() => setUnit(unit === u ? '' : u)}
              >
                <Text style={[styles.chipText, unit === u && styles.chipTextSelected]}>
                  {u}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Stock & Threshold */}
      <View style={styles.row}>
        <View style={[styles.section, { flex: 1, marginRight: 8 }]}>
          <Text style={styles.label}>Current Stock</Text>
          <TextInput
            style={styles.input}
            placeholder="0"
            placeholderTextColor={Colors.textMuted}
            value={currentStock}
            onChangeText={setCurrentStock}
            keyboardType="numeric"
          />
        </View>
        <View style={[styles.section, { flex: 1 }]}>
          <Text style={styles.label}>Low Stock Threshold</Text>
          <TextInput
            style={styles.input}
            placeholder="0"
            placeholderTextColor={Colors.textMuted}
            value={lowStockThreshold}
            onChangeText={setLowStockThreshold}
            keyboardType="numeric"
          />
        </View>
      </View>

      {/* Average Cost */}
      <View style={styles.section}>
        <Text style={styles.label}>Average Cost (optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="0.00"
          placeholderTextColor={Colors.textMuted}
          value={averageCost}
          onChangeText={setAverageCost}
          keyboardType="numeric"
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

      {/* Save Button */}
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
  row: {
    flexDirection: 'row',
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
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 4,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  chipTextSelected: {
    color: '#fff',
    fontWeight: '600',
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
});