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
import { addVariant } from '../../services/products';

export default function AddVariantModal() {
  const { product_id } = useLocalSearchParams<{ product_id: string }>();

  const [name, setName] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [packaging, setPackaging] = useState('');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function handleSave() {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = 'Variant name is required.';
    if (!sellingPrice || parseFloat(sellingPrice) < 0) {
      newErrors.sellingPrice = 'Please enter a valid selling price.';
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});
    setSaving(true);

    const result = await addVariant({
      product_id,
      name: name.trim(),
      selling_price: parseFloat(sellingPrice) || 0,
      packaging: packaging.trim() || null,
      is_archived: false,
    });

    setSaving(false);

    if (result) {
      router.back();
    } else {
      setErrors({ general: 'Failed to save variant. Please try again.' });
    }
  }

  return (
    <PopupSheet title="Add Variant">
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">

      {/* Variant Name */}
      <View style={styles.section}>
        <Text style={styles.label}>
          Variant Name <Text style={styles.required}>*</Text>
        </Text>
        <Text style={styles.hint}>e.g. Single, Box of 4, Small, Large</Text>
        <TextInput
          style={[styles.input, errors.name ? styles.inputError : null]}
          placeholder="e.g. Box of 6"
          placeholderTextColor={Colors.textMuted}
          value={name}
          onChangeText={(t) => { setName(t); setErrors((e) => ({ ...e, name: '' })); }}
        />
        {errors.name ? <Text style={styles.errorText}>{errors.name}</Text> : null}
      </View>

      {/* Selling Price */}
      <View style={styles.section}>
        <Text style={styles.label}>
          Selling Price <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          style={[styles.input, errors.sellingPrice ? styles.inputError : null]}
          placeholder="0.00"
          placeholderTextColor={Colors.textMuted}
          value={sellingPrice}
          onChangeText={(t) => { setSellingPrice(t); setErrors((e) => ({ ...e, sellingPrice: '' })); }}
          keyboardType="numeric"
        />
        {errors.sellingPrice ? <Text style={styles.errorText}>{errors.sellingPrice}</Text> : null}
      </View>

      {/* Packaging */}
      <View style={styles.section}>
        <Text style={styles.label}>Packaging (optional)</Text>
        <Text style={styles.hint}>e.g. Brown box, Clear bag, Kraft box</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Brown box"
          placeholderTextColor={Colors.textMuted}
          value={packaging}
          onChangeText={setPackaging}
        />
      </View>

      {errors.general ? <Text style={[styles.errorText, { textAlign: 'center', marginBottom: 8 }]}>{errors.general}</Text> : null}

      {/* Save Button */}
      <TouchableOpacity
        style={[styles.saveButton, saving && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveButtonText}>Save Variant</Text>
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