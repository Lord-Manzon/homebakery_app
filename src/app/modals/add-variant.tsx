import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
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
import { InfoModal } from '../../components/ui/InfoModal';
import { useTheme } from '../../contexts/ThemeContext';
import { getIngredients } from '../../services/ingredients';
import { addVariant, getProductById, getRecipeIngredients } from '../../services/products';
import { getSettings } from '../../services/settings';
import { Ingredient, Product, RecipeIngredient, Settings } from '../../types';
import {
  calculateBufferAmount,
  calculateCostPerPiece,
  calculateRecipeCost,
  calculateSuggestedPrice,
  calculateVariantTotalCost,
} from '../../utils/costing';
import { getCurrencyPrefix } from '../../utils/currency';

export default function AddVariantModal() {
  const Colors = useTheme();
  const styles = useMemo(() => getStyles(Colors), [Colors]);
  const { product_id } = useLocalSearchParams<{ product_id: string }>();

  const [name, setName] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [packaging, setPackaging] = useState('');
  const [packagingCost, setPackagingCost] = useState('');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [product, setProduct] = useState<Product | null>(null);
  const [recipeIngredients, setRecipeIngredients] = useState<RecipeIngredient[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loadingContext, setLoadingContext] = useState(true);
  const [showBreakdown, setShowBreakdown] = useState(false);

  useEffect(() => {
    async function loadContext() {
      const [productData, recipeData, ingredientsData, settingsData] = await Promise.all([
        getProductById(product_id),
        getRecipeIngredients(product_id),
        getIngredients(),
        getSettings(),
      ]);
      setProduct(productData);
      setRecipeIngredients(recipeData);
      setIngredients(ingredientsData);
      setSettings(settingsData);
      setLoadingContext(false);
    }
    loadContext();
  }, [product_id]);

  const cur = getCurrencyPrefix(settings?.currency);
  const costPerPiece = product
    ? calculateCostPerPiece(calculateRecipeCost(recipeIngredients, ingredients), product.yield)
    : 0;
  const packagingCostNum = parseFloat(packagingCost) || 0;
  const bufferAmount = product ? calculateBufferAmount(costPerPiece, product.buffer_percent) : 0;
  const totalCost = product
    ? calculateVariantTotalCost(costPerPiece, packagingCostNum, product.buffer_percent)
    : 0;
  const suggestedPrice = product ? calculateSuggestedPrice(totalCost, product.markup_percent) : 0;

  const breakdownMessage = product
    ? `Recipe cost: ${cur}${costPerPiece.toFixed(2)}\n` +
      `Buffer (${product.buffer_percent}%): ${cur}${bufferAmount.toFixed(2)}\n` +
      `Packaging: ${cur}${packagingCostNum.toFixed(2)}\n` +
      `Total cost: ${cur}${totalCost.toFixed(2)}\n` +
      `Markup (${product.markup_percent}%): +${cur}${(suggestedPrice - totalCost).toFixed(2)}\n` +
      `Suggested price: ${cur}${suggestedPrice.toFixed(2)}`
    : '';

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
      packaging_cost: packagingCostNum,
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

      {/* Packaging Cost */}
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

      {/* Suggested Price panel */}
      {loadingContext ? (
        <View style={styles.suggestedLoading}>
          <ActivityIndicator color={Colors.primary} size="small" />
        </View>
      ) : product && (
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
      )}

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

    <InfoModal
      visible={showBreakdown}
      title="Suggested price breakdown"
      message={breakdownMessage}
      onClose={() => setShowBreakdown(false)}
    />
    </PopupSheet>
  );
}

const getStyles = (Colors: ReturnType<typeof useTheme>) => StyleSheet.create({
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
  suggestedLoading: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  suggestedPanel: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  suggestedHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  suggestedLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoIcon: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  suggestedValue: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: 4,
  },
  suggestedCaption: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 4,
    lineHeight: 17,
  },
  useSuggestedButton: {
    marginTop: 10,
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  useSuggestedButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
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