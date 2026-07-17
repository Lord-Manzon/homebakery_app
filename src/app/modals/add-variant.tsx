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
import { addVariant } from '../../services/products';

export default function AddVariantModal() {
  const { product_id } = useLocalSearchParams<{ product_id: string }>();

  const [name, setName] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [packaging, setPackaging] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Variant name is required.');
      return;
    }
    if (!sellingPrice || parseFloat(sellingPrice) < 0) {
      Alert.alert('Validation Error', 'Please enter a valid selling price.');
      return;
    }

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
      Alert.alert('Error', 'Failed to save variant. Please try again.');
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
          style={styles.input}
          placeholder="e.g. Box of 6"
          placeholderTextColor={Colors.textMuted}
          value={name}
          onChangeText={setName}
        />
      </View>

      {/* Selling Price */}
      <View style={styles.section}>
        <Text style={styles.label}>
          Selling Price <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          style={styles.input}
          placeholder="0.00"
          placeholderTextColor={Colors.textMuted}
          value={sellingPrice}
          onChangeText={setSellingPrice}
          keyboardType="numeric"
        />
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
});