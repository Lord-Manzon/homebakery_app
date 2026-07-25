import { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Modal,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useTheme } from '../../contexts/ThemeContext';
import { addVariant, updateVariant } from '../../services/products';
import { ProductVariant } from '../../types';
import {
    calculateBufferAmount,
    calculateSuggestedPrice,
    calculateVariantTotalCost,
} from '../../utils/costing';
import PopupSheet from '../common/PopupSheet';
import { InfoModal } from '../ui/InfoModal';

type Props = {
  visible: boolean;
  productId: string;
  variant?: ProductVariant | null; // present = edit mode, absent = add mode
  costPerPiece: number;
  bufferPercent: number;
  markupPercent: number;
  currencyPrefix: string;
  onClose: () => void;
  onSaved: () => void;
  onArchive?: (variant: ProductVariant) => void;
};

export function VariantFormModal({
  visible,
  productId,
  variant,
  costPerPiece,
  bufferPercent,
  markupPercent,
  currencyPrefix: cur,
  onClose,
  onSaved,
  onArchive,
}: Props) {
  const Colors = useTheme();
  const styles = useMemo(() => getStyles(Colors), [Colors]);
  const isEdit = !!variant;

  const [name, setName] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [packaging, setPackaging] = useState('');
  const [packagingCost, setPackagingCost] = useState('');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showBreakdown, setShowBreakdown] = useState(false);

  // Re-sync form fields whenever a different variant is opened for editing,
  // or reset to blank when switching to add mode.
  useEffect(() => {
    if (!visible) return;
    if (variant) {
      setName(variant.name);
      setSellingPrice(String(variant.selling_price));
      setPackaging(variant.packaging ?? '');
      setPackagingCost(String(variant.packaging_cost ?? 0));
    } else {
      setName('');
      setSellingPrice('');
      setPackaging('');
      setPackagingCost('');
    }
    setErrors({});
  }, [visible, variant]);

  const packagingCostNum = parseFloat(packagingCost) || 0;
  const bufferAmount = calculateBufferAmount(costPerPiece, bufferPercent);
  const totalCost = calculateVariantTotalCost(costPerPiece, packagingCostNum, bufferPercent);
  const suggestedPrice = calculateSuggestedPrice(totalCost, markupPercent);

  const breakdownMessage =
    `Recipe cost: ${cur}${costPerPiece.toFixed(2)}\n` +
    `Buffer (${bufferPercent}%): ${cur}${bufferAmount.toFixed(2)}\n` +
    `Packaging: ${cur}${packagingCostNum.toFixed(2)}\n` +
    `Total cost: ${cur}${totalCost.toFixed(2)}\n` +
    `Markup (${markupPercent}%): +${cur}${(suggestedPrice - totalCost).toFixed(2)}\n` +
    `Suggested price: ${cur}${suggestedPrice.toFixed(2)}`;

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

    const payload = {
      name: name.trim(),
      selling_price: parseFloat(sellingPrice) || 0,
      packaging: packaging.trim() || null,
      packaging_cost: packagingCostNum,
    };

    const success = isEdit
      ? await updateVariant(variant!.id, payload)
      : await addVariant({ product_id: productId, is_archived: false, ...payload });

    setSaving(false);

    if (success) {
      onSaved();
      onClose();
    } else {
      setErrors({ general: 'Failed to save variant. Please try again.' });
    }
  }

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <GestureHandlerRootView style={{ flex: 1 }}>
      <PopupSheet title={isEdit ? 'Edit Variant' : 'Add Variant'} onClose={onClose}>
        <View style={styles.container}>

          <View style={styles.section}>
            <Text style={styles.label}>
              Variant Name <Text style={styles.required}>*</Text>
            </Text>
            {!isEdit && <Text style={styles.hint}>e.g. Single, Box of 4, Small, Large</Text>}
            <TextInput
              style={[styles.input, errors.name ? styles.inputError : null]}
              placeholder="e.g. Box of 6"
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
              placeholder="0.00"
              placeholderTextColor={Colors.textMuted}
              value={sellingPrice}
              onChangeText={(t) => { setSellingPrice(t); setErrors((e) => ({ ...e, sellingPrice: '' })); }}
              keyboardType="numeric"
            />
            {errors.sellingPrice ? <Text style={styles.errorText}>{errors.sellingPrice}</Text> : null}
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Packaging (optional)</Text>
            {!isEdit && <Text style={styles.hint}>e.g. Brown box, Clear bag, Kraft box</Text>}
            <TextInput
              style={styles.input}
              placeholder="e.g. Brown box"
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
              placeholder="0.00"
              placeholderTextColor={Colors.textMuted}
              value={packagingCost}
              onChangeText={setPackagingCost}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.suggestedPanel}>
            <View style={styles.suggestedHeaderRow}>
              <Text style={styles.suggestedLabel}>Suggested Price</Text>
              <TouchableOpacity onPress={() => setShowBreakdown(true)} hitSlop={8}>
                <Text style={styles.infoIcon}>ⓘ</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.suggestedValue}>{cur}{suggestedPrice.toFixed(2)}</Text>
            <Text style={styles.suggestedCaption}>
              Based on this product's recipe cost, buffer, and markup — a starting point, not a rule.
            </Text>
            <TouchableOpacity
              style={styles.useSuggestedButton}
              onPress={() => setSellingPrice(suggestedPrice.toFixed(2))}
            >
              <Text style={styles.useSuggestedButtonText}>Use {cur}{suggestedPrice.toFixed(2)}</Text>
            </TouchableOpacity>
          </View>

          {errors.general ? <Text style={[styles.errorText, { textAlign: 'center', marginBottom: 8 }]}>{errors.general}</Text> : null}

          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? <ActivityIndicator color="#fff" /> : (
              <Text style={styles.saveButtonText}>{isEdit ? 'Save Changes' : 'Save Variant'}</Text>
            )}
          </TouchableOpacity>

          {isEdit && onArchive && (
            <TouchableOpacity
              style={styles.archiveButton}
              onPress={() => { onClose(); onArchive(variant!); }}
              disabled={saving}
            >
              <Text style={styles.archiveButtonText}>Archive Variant</Text>
            </TouchableOpacity>
          )}

          <View style={{ height: 24 }} />
        </View>
      </PopupSheet>
      </GestureHandlerRootView>

      <InfoModal
        visible={showBreakdown}
        title="Suggested price breakdown"
        message={breakdownMessage}
        onClose={() => setShowBreakdown(false)}
      />
    </Modal>
  );
}

const getStyles = (Colors: ReturnType<typeof useTheme>) => StyleSheet.create({
  container: { paddingHorizontal: 20, paddingTop: 16 },
  section: { marginBottom: 16 },
  label: {
    fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: 4,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  hint: { fontSize: 12, color: Colors.textMuted, marginBottom: 6 },
  required: { color: Colors.error },
  input: {
    backgroundColor: Colors.background, borderRadius: 10, borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: Colors.textPrimary,
  },
  inputError: { borderColor: Colors.error, borderWidth: 1.5 },
  errorText: { fontSize: 12, color: Colors.error, marginTop: 4, fontWeight: '500' },
  suggestedPanel: {
    borderWidth: 1.5, borderColor: Colors.border, borderStyle: 'dashed', borderRadius: 12,
    padding: 14, marginBottom: 16,
  },
  suggestedHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  suggestedLabel: {
    fontSize: 12, fontWeight: '600', color: Colors.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  infoIcon: { fontSize: 14, color: Colors.textMuted },
  suggestedValue: { fontSize: 24, fontWeight: '700', color: Colors.textPrimary, marginTop: 4 },
  suggestedCaption: { fontSize: 12, color: Colors.textMuted, marginTop: 4, lineHeight: 17 },
  useSuggestedButton: {
    marginTop: 10, alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 8, backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.primary,
  },
  useSuggestedButtonText: { fontSize: 13, fontWeight: '600', color: Colors.primary },
  saveButton: { backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  archiveButton: { paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  archiveButtonText: { color: Colors.error, fontSize: 14, fontWeight: '600' },
});