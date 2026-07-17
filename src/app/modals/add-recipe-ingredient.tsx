import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
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
import { getIngredients } from '../../services/ingredients';
import { addRecipeIngredient } from '../../services/products';
import { Ingredient } from '../../types';

const UNITS = ['g', 'kg', 'ml', 'L', 'pcs', 'tsp', 'tbsp', 'cup', 'pack', 'bottle', 'sachet'];

export default function AddRecipeIngredientModal() {
  const { product_id } = useLocalSearchParams<{ product_id: string }>();

  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(null);
  const [search, setSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [purchasedQuantity, setPurchasedQuantity] = useState('');
  const [purchasedUnit, setPurchasedUnit] = useState('');
  const [quantityUsed, setQuantityUsed] = useState('');
  const [unitUsed, setUnitUsed] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const data = await getIngredients();
      setIngredients(data);
      setLoading(false);
    }
    load();
  }, []);

  const filteredIngredients = ingredients.filter((i) =>
    i.name.toLowerCase().includes(search.toLowerCase())
  );

  function selectIngredient(ingredient: Ingredient) {
    setSelectedIngredient(ingredient);
    setSearch(ingredient.name);
    setPurchasedUnit(ingredient.unit);
    setUnitUsed(ingredient.unit);
    setShowDropdown(false);
  }

  async function handleSave() {
    if (!selectedIngredient) {
      Alert.alert('Validation Error', 'Please select an ingredient.');
      return;
    }
    if (!purchasedQuantity || parseFloat(purchasedQuantity) <= 0) {
      Alert.alert('Validation Error', 'Please enter the purchased quantity.');
      return;
    }
    if (!purchasedUnit.trim()) {
      Alert.alert('Validation Error', 'Please select the purchased unit.');
      return;
    }
    if (!quantityUsed || parseFloat(quantityUsed) <= 0) {
      Alert.alert('Validation Error', 'Please enter the quantity used.');
      return;
    }
    if (!unitUsed.trim()) {
      Alert.alert('Validation Error', 'Please select the unit used.');
      return;
    }

    setSaving(true);

    const result = await addRecipeIngredient({
      product_id,
      ingredient_id: selectedIngredient.id,
      purchased_quantity: parseFloat(purchasedQuantity),
      purchased_unit: purchasedUnit.trim(),
      quantity_used: parseFloat(quantityUsed),
      unit_used: unitUsed.trim(),
    });

    setSaving(false);

    if (result) {
      router.back();
    } else {
      Alert.alert('Error', 'Failed to save recipe ingredient.');
    }
  }

  if (loading) {
    return (
      <PopupSheet title="Add Recipe Ingredient">
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      </PopupSheet>
    );
  }

  return (
    <PopupSheet title="Add Recipe Ingredient">
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">

      {/* Ingredient Selector */}
      <View style={styles.section}>
        <Text style={styles.label}>
          Ingredient <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          style={styles.input}
          placeholder="Search ingredient..."
          placeholderTextColor={Colors.textMuted}
          value={search}
          onChangeText={(text) => {
            setSearch(text);
            setSelectedIngredient(null);
            setShowDropdown(true);
          }}
          onFocus={() => setShowDropdown(true)}
        />
        {showDropdown && filteredIngredients.length > 0 && (
          <View style={styles.dropdown}>
            {filteredIngredients.slice(0, 5).map((ingredient) => (
              <TouchableOpacity
                key={ingredient.id}
                style={styles.dropdownItem}
                onPress={() => selectIngredient(ingredient)}
              >
                <Text style={styles.dropdownItemText}>{ingredient.name}</Text>
                <Text style={styles.dropdownItemUnit}>{ingredient.unit}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        {selectedIngredient && (
          <View style={styles.selectedBadge}>
            <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
            <Text style={styles.selectedText}>
              {selectedIngredient.name} selected
            </Text>
          </View>
        )}
      </View>

      {/* Info Box */}
      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          💡 Enter how you buy this ingredient and how much the recipe uses.
          The app uses this to calculate your recipe cost accurately.
        </Text>
      </View>

      {/* Purchased Quantity & Unit */}
      <Text style={styles.groupLabel}>HOW YOU BUY IT</Text>
      <View style={styles.row}>
        <View style={[styles.section, { flex: 1, marginRight: 8 }]}>
          <Text style={styles.label}>
            Quantity <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 1"
            placeholderTextColor={Colors.textMuted}
            value={purchasedQuantity}
            onChangeText={setPurchasedQuantity}
            keyboardType="numeric"
          />
        </View>
        <View style={[styles.section, { flex: 1 }]}>
          <Text style={styles.label}>
            Unit <Text style={styles.required}>*</Text>
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.chipRow}>
              {UNITS.map((u) => (
                <TouchableOpacity
                  key={u}
                  style={[styles.chip, purchasedUnit === u && styles.chipSelected]}
                  onPress={() => setPurchasedUnit(u)}
                >
                  <Text style={[styles.chipText, purchasedUnit === u && styles.chipTextSelected]}>
                    {u}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      </View>

      {/* Quantity Used & Unit */}
      <Text style={styles.groupLabel}>HOW MUCH THE RECIPE USES</Text>
      <View style={styles.row}>
        <View style={[styles.section, { flex: 1, marginRight: 8 }]}>
          <Text style={styles.label}>
            Quantity <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 250"
            placeholderTextColor={Colors.textMuted}
            value={quantityUsed}
            onChangeText={setQuantityUsed}
            keyboardType="numeric"
          />
        </View>
        <View style={[styles.section, { flex: 1 }]}>
          <Text style={styles.label}>
            Unit <Text style={styles.required}>*</Text>
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.chipRow}>
              {UNITS.map((u) => (
                <TouchableOpacity
                  key={u}
                  style={[styles.chip, unitUsed === u && styles.chipSelected]}
                  onPress={() => setUnitUsed(u)}
                >
                  <Text style={[styles.chipText, unitUsed === u && styles.chipTextSelected]}>
                    {u}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
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
          <Text style={styles.saveButtonText}>Add to Recipe</Text>
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
  centered: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
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
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  groupLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 8,
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
  dropdown: {
    backgroundColor: Colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: 4,
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  dropdownItemText: {
    fontSize: 15,
    color: Colors.textPrimary,
  },
  dropdownItemUnit: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  selectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  selectedText: {
    fontSize: 13,
    color: Colors.success,
    fontWeight: '600',
  },
  infoBox: {
    backgroundColor: '#EBF5FB',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  infoText: {
    fontSize: 13,
    color: Colors.info,
    lineHeight: 18,
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