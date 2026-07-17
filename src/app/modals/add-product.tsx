import { router } from 'expo-router';
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
import { Colors } from '../../constants/theme';
import { addProduct } from '../../services/products';

const CATEGORIES = [
  'Cakes', 'Cookies', 'Bread', 'Pastries',
  'Cupcakes', 'Donuts', 'Brownies', 'Others',
];

export default function AddProductModal() {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [preparationInstructions, setPreparationInstructions] = useState('');
  const [yieldAmount, setYieldAmount] = useState('1');
  const [bufferPercent, setBufferPercent] = useState('0');
  const [markupPercent, setMarkupPercent] = useState('0');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function handleSave() {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = 'Product name is required.';
    if (!yieldAmount || parseFloat(yieldAmount) <= 0) newErrors.yield = 'Yield must be greater than 0.';
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});
    setSaving(true);

    const result = await addProduct({
      name: name.trim(),
      category: category.trim() || null,
      image_url: null,
      description: description.trim() || null,
      preparation_instructions: preparationInstructions.trim() || null,
      yield: parseFloat(yieldAmount) || 1,
      buffer_percent: parseFloat(bufferPercent) || 0,
      markup_percent: parseFloat(markupPercent) || 0,
      is_archived: false,
    });

    setSaving(false);

    if (result) {
      router.back();
    } else {
      setErrors({ general: 'Failed to save product. Please try again.' });
    }
  }

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">

      {/* Name */}
      <View style={styles.section}>
        <Text style={styles.label}>
          Product Name <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          style={[styles.input, errors.name ? styles.inputError : null]}
          placeholder="e.g. Cinnamon Roll"
          placeholderTextColor={Colors.textMuted}
          value={name}
          onChangeText={(t) => { setName(t); setErrors((e) => ({ ...e, name: '' })); }}
        />
        {errors.name ? <Text style={styles.errorText}>{errors.name}</Text> : null}
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

      {/* Description */}
      <View style={styles.section}>
        <Text style={styles.label}>Description (optional)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Brief description of the product..."
          placeholderTextColor={Colors.textMuted}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
        />
      </View>

      {/* Preparation Instructions */}
      <View style={styles.section}>
        <Text style={styles.label}>Preparation Instructions (optional)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Step by step instructions..."
          placeholderTextColor={Colors.textMuted}
          value={preparationInstructions}
          onChangeText={setPreparationInstructions}
          multiline
          numberOfLines={4}
        />
      </View>

      {/* Yield */}
      <View style={styles.section}>
        <Text style={styles.label}>
          Yield <Text style={styles.required}>*</Text>
        </Text>
        <Text style={styles.hint}>
          How many pieces does this recipe produce?
        </Text>
        <TextInput
          style={[styles.input, errors.yield ? styles.inputError : null]}
          placeholder="e.g. 12"
          placeholderTextColor={Colors.textMuted}
          value={yieldAmount}
          onChangeText={(t) => { setYieldAmount(t); setErrors((e) => ({ ...e, yield: '' })); }}
          keyboardType="numeric"
        />
        {errors.yield ? <Text style={styles.errorText}>{errors.yield}</Text> : null}
      </View>

      {/* Buffer & Markup */}
      <View style={styles.row}>
        <View style={[styles.section, { flex: 1, marginRight: 8 }]}>
          <Text style={styles.label}>Buffer %</Text>
          <Text style={styles.hint}>Waste allowance</Text>
          <TextInput
            style={styles.input}
            placeholder="0"
            placeholderTextColor={Colors.textMuted}
            value={bufferPercent}
            onChangeText={setBufferPercent}
            keyboardType="numeric"
          />
        </View>
        <View style={[styles.section, { flex: 1 }]}>
          <Text style={styles.label}>Markup %</Text>
          <Text style={styles.hint}>Profit margin</Text>
          <TextInput
            style={styles.input}
            placeholder="0"
            placeholderTextColor={Colors.textMuted}
            value={markupPercent}
            onChangeText={setMarkupPercent}
            keyboardType="numeric"
          />
        </View>
      </View>

      {errors.general ? <Text style={[styles.errorText, { textAlign: 'center', marginBottom: 8 }]}>{errors.general}</Text> : null}

      {/* Info Box */}
      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          💡 After saving, you can add variants (sizes & prices) and recipe ingredients from the product detail screen.
        </Text>
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
          <Text style={styles.saveButtonText}>Save Product</Text>
        )}
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: 16,
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
  hint: {
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 6,
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