import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import PopupSheet from '../../components/common/PopupSheet';
import { useTheme } from '../../contexts/ThemeContext';
import { archiveVariant, updateVariant } from '../../services/products';
import { ProductVariant } from '../../types';

export default function EditVariantModal() {
  const Colors = useTheme();
  const styles = useMemo(() => getStyles(Colors), [Colors]);
  const { id } = useLocalSearchParams<{ id: string }>();

  const [variant, setVariant] = useState<ProductVariant | null>(null);
  const [name, setName] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [packaging, setPackaging] = useState('');
  const [packagingCost, setPackagingCost] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmArchive, setConfirmArchive] = useState(false);

  useEffect(() => {
    async function load() {
      // No getVariantById exists yet — reusing getVariantsByProduct would
      // need a product_id we don't have here, so instead we fetch via a
      // direct-by-id query inline. If this pattern is needed elsewhere
      // later, it's worth promoting to a real service function.
      const { supabase } = await import('../../lib/supabase');
      const { data, error } = await supabase
        .from('product_variants')
        .select('*')
        .eq('id', id)
        .single();

      if (!error && data) {
        setVariant(data);
        setName(data.name);
        setSellingPrice(String(data.selling_price));
        setPackaging(data.packaging ?? '');
        setPackagingCost(String(data.packaging_cost ?? 0));
      }
      setLoading(false);
    }
    load();
  }, [id]);

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

    const success = await updateVariant(id, {
      name: name.trim(),
      selling_price: parseFloat(sellingPrice) || 0,
      packaging: packaging.trim() || null,
      packaging_cost: parseFloat(packagingCost) || 0,
    });

    setSaving(false);

    if (success) {
      router.back();
    } else {
      setErrors({ general: 'Failed to save variant. Please try again.' });
    }
  }

  async function handleArchive() {
    setSaving(true);
    const success = await archiveVariant(id);
    setSaving(false);
    setConfirmArchive(false);
    if (success) router.back();
  }

  if (loading) {
    return (
      <PopupSheet title="Edit Variant">
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      </PopupSheet>
    );
  }

  return (
    <PopupSheet title="Edit Variant">
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">

      <View style={styles.section}>
        <Text style={styles.label}>
          Variant Name <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          style={[styles.input, errors.name ? styles.inputError : null]}
          placeholderTextColor={Colors.textMuted}
          value={name}
          onChangeText={(t) => { setName(t); setErrors((e) => ({ ...e, name: '' })); }}
        />
        {errors.name ? <Text style={styles.errorText}>{errors.name}</Text> : null}
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>
          Selling Price <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          style={[styles.input, errors.sellingPrice ? styles.inputError : null]}
          placeholderTextColor={Colors.textMuted}
          value={sellingPrice}
          onChangeText={(t) => { setSellingPrice(t); setErrors((e) => ({ ...e, sellingPrice: '' })); }}
          keyboardType="numeric"
        />
        {errors.sellingPrice ? <Text style={styles.errorText}>{errors.sellingPrice}</Text> : null}
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Packaging (optional)</Text>
        <TextInput
          style={styles.input}
          placeholderTextColor={Colors.textMuted}
          value={packaging}
          onChangeText={setPackaging}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Packaging Cost (optional)</Text>
        <Text style={styles.hint}>What this specific packaging costs you, per unit</Text>
        <TextInput
          style={styles.input}
          placeholderTextColor={Colors.textMuted}
          value={packagingCost}
          onChangeText={setPackagingCost}
          keyboardType="numeric"
        />
      </View>

      {errors.general ? <Text style={[styles.errorText, { textAlign: 'center', marginBottom: 8 }]}>{errors.general}</Text> : null}

      <TouchableOpacity
        style={[styles.saveButton, saving && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={saving}
      >
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Save Changes</Text>}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.archiveButton}
        onPress={() => setConfirmArchive(true)}
        disabled={saving}
      >
        <Text style={styles.archiveButtonText}>Archive Variant</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>

    <Modal visible={confirmArchive} transparent animationType="fade" onRequestClose={() => setConfirmArchive(false)}>
      <View style={styles.confirmOverlay}>
        <View style={styles.confirmBox}>
          <Text style={styles.confirmTitle}>Archive Variant</Text>
          <Text style={styles.confirmMessage}>
            Archive "{variant?.name}"? It will be hidden but existing orders using this variant are preserved.
          </Text>
          <View style={styles.confirmButtons}>
            <TouchableOpacity style={styles.confirmCancel} onPress={() => setConfirmArchive(false)}>
              <Text style={styles.confirmCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmAction} onPress={handleArchive}>
              <Text style={styles.confirmActionText}>Archive</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
    </PopupSheet>
  );
}

const getStyles = (Colors: ReturnType<typeof useTheme>) => StyleSheet.create({
  container: { paddingHorizontal: 20, paddingTop: 4 },
  centered: { paddingVertical: 40, alignItems: 'center' },
  section: { marginBottom: 16 },
  label: {
    fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: 4,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  hint: { fontSize: 12, color: Colors.textMuted, marginBottom: 6 },
  required: { color: Colors.error },
  input: {
    backgroundColor: Colors.card, borderRadius: 10, borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: Colors.textPrimary,
  },
  inputError: { borderColor: Colors.error, borderWidth: 1.5 },
  errorText: { fontSize: 12, color: Colors.error, marginTop: 4, fontWeight: '500' },
  saveButton: { backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  archiveButton: { paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  archiveButtonText: { color: Colors.error, fontSize: 14, fontWeight: '600' },
  confirmOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32,
  },
  confirmBox: { backgroundColor: Colors.card, borderRadius: 16, padding: 24, width: '100%' },
  confirmTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary, marginBottom: 8 },
  confirmMessage: { fontSize: 14, color: Colors.textSecondary, lineHeight: 20, marginBottom: 20 },
  confirmButtons: { flexDirection: 'row', gap: 10 },
  confirmCancel: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: Colors.background, alignItems: 'center' },
  confirmCancelText: { fontSize: 15, fontWeight: '600', color: Colors.textSecondary },
  confirmAction: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: Colors.error, alignItems: 'center' },
  confirmActionText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});