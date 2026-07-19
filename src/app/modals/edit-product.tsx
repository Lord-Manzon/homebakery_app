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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/theme';
import { getProductById, updateProduct } from '../../services/products';

const CATEGORIES = [
  'Cakes', 'Cookies', 'Bread', 'Pastries',
  'Cupcakes', 'Donuts', 'Brownies', 'Others',
];

export default function EditProductModal() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [preparationInstructions, setPreparationInstructions] = useState('');
  const [yieldAmount, setYieldAmount] = useState('1');
  const [bufferPercent, setBufferPercent] = useState('0');
  const [markupPercent, setMarkupPercent] = useState('0');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const product = await getProductById(id);
      if (product) {
        setName(product.name);
        setCategory(product.category ?? '');
        setDescription(product.description ?? '');
        setPreparationInstructions(product.preparation_instructions ?? '');
        setYieldAmount(product.yield.toString());
        setBufferPercent(product.buffer_percent.toString());
        setMarkupPercent(product.markup_percent.toString());
      }
      setLoading(false);
    }
    load();
  }, [id]);

  async function handleSave() {
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Product name is required.');
      return;
    }
    if (!yieldAmount || parseFloat(yieldAmount) <= 0) {
      Alert.alert('Validation Error', 'Yield must be greater than 0.');
      return;
    }

    setSaving(true);

    const success = await updateProduct(id, {
      name: name.trim(),
      category: category.trim() || null,
      description: description.trim() || null,
      preparation_instructions: preparationInstructions.trim() || null,
      yield: parseFloat(yieldAmount) || 1,
      buffer_percent: parseFloat(bufferPercent) || 0,
      markup_percent: parseFloat(markupPercent) || 0,
    });

    setSaving(false);

    if (success) {
      router.back();
    } else {
      Alert.alert('Error', 'Failed to update product. Please try again.');
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

      {/* Name */}
      <View style={styles.section}>
        <Text style={styles.label}>
          Product Name <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Cinnamon Roll"
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
        <Text style={styles.hint}>How many pieces does this recipe produce?</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 12"
          placeholderTextColor={Colors.textMuted}
          value={yieldAmount}
          onChangeText={setYieldAmount}
          keyboardType="numeric"
        />
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

      <View style={{ height: 40 + insets.bottom }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: 16,
  },
  centered: {
    flex: 1,
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