import { Camera, Image as ImageIcon, Pencil } from 'lucide-react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import { addProduct, updateProduct, uploadProductImage } from '../../services/products';

const CATEGORIES = [
  'Cakes', 'Cookies', 'Bread', 'Pastries',
  'Cupcakes', 'Donuts', 'Brownies', 'Others',
];

export default function AddProductModal() {
  const Colors = useTheme();
  const styles = useMemo(() => getStyles(Colors), [Colors]);
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [preparationInstructions, setPreparationInstructions] = useState('');
  const [yieldAmount, setYieldAmount] = useState('1');
  const [bufferPercent, setBufferPercent] = useState('0');
  const [markupPercent, setMarkupPercent] = useState('0');
  const [localImageUri, setLocalImageUri] = useState<string | null>(null);
  const [localImageMimeType, setLocalImageMimeType] = useState<string | null>(null);
  const [photoPickerVisible, setPhotoPickerVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function pickFromGallery() {
    setPhotoPickerVisible(false);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setErrors((e) => ({ ...e, general: 'Photo library permission was denied.' }));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setLocalImageUri(result.assets[0].uri);
      setLocalImageMimeType(result.assets[0].mimeType ?? null);
    }
  }

  async function pickFromCamera() {
    setPhotoPickerVisible(false);
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setErrors((e) => ({ ...e, general: 'Camera permission was denied.' }));
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setLocalImageUri(result.assets[0].uri);
      setLocalImageMimeType(result.assets[0].mimeType ?? null);
    }
  }

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

    // Step 1: create the product first (no photo yet) — we need its id
    // before we can name/upload the photo.
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

    if (!result) {
      setSaving(false);
      setErrors({ general: 'Failed to save product. Please try again.' });
      return;
    }

    // Step 2: if a photo was picked, upload it now and attach it.
    // If this fails, the product itself is still saved successfully —
    // we just leave it photo-less rather than losing all the entered data.
    if (localImageUri) {
      const uploadedUrl = await uploadProductImage(result.id, localImageUri, localImageMimeType);
      if (uploadedUrl) {
        await updateProduct(result.id, { image_url: uploadedUrl });
      } else {
        setSaving(false);
        setErrors({ general: 'Product saved, but the photo failed to upload. You can add it from Edit Product.' });
        router.back();
        return;
      }
    }

    setSaving(false);
    router.back();
  }

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">

      {/* Photo */}
      <View style={styles.section}>
        <Text style={styles.label}>Photo</Text>
        <TouchableOpacity
          style={styles.photoTouchable}
          onPress={() => setPhotoPickerVisible(true)}
        >
          {localImageUri ? (
            <Image source={{ uri: localImageUri }} style={styles.photo} contentFit="cover" />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Camera size={28} color={Colors.textMuted} />
              <Text style={styles.photoPlaceholderText}>Add Photo</Text>
            </View>
          )}
          <View style={styles.photoEditBadge}>
            <Pencil size={14} color="#fff" />
          </View>
        </TouchableOpacity>
      </View>

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

      <View style={{ height: 40 + insets.bottom }} />

      {/* Photo source picker */}
      <Modal
        visible={photoPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPhotoPickerVisible(false)}
      >
        <TouchableOpacity
          style={styles.photoModalOverlay}
          activeOpacity={1}
          onPress={() => setPhotoPickerVisible(false)}
        >
          <View style={styles.photoModalBox}>
            <TouchableOpacity style={styles.photoModalOption} onPress={pickFromCamera}>
              <Camera size={20} color={Colors.textPrimary} />
              <Text style={styles.photoModalOptionText}>Take Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.photoModalOption} onPress={pickFromGallery}>
              <ImageIcon size={20} color={Colors.textPrimary} />
              <Text style={styles.photoModalOptionText}>Choose from Gallery</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.photoModalCancel}
              onPress={() => setPhotoPickerVisible(false)}
            >
              <Text style={styles.photoModalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </ScrollView>
  );
}

const getStyles = (Colors: Record<string, string>) => StyleSheet.create({
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
    backgroundColor: Colors.lowStockBackground,
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
  photoTouchable: {
    alignSelf: 'flex-start',
  },
  photo: {
    width: 140,
    height: 105,
    borderRadius: 10,
    backgroundColor: Colors.card,
  },
  photoPlaceholder: {
    width: 140,
    height: 105,
    borderRadius: 10,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  photoPlaceholderText: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  photoEditBadge: {
    position: 'absolute',
    bottom: -6,
    right: -6,
    backgroundColor: Colors.primary,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.background,
  },
  photoModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  photoModalBox: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    paddingBottom: 32,
  },
  photoModalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  photoModalOptionText: {
    fontSize: 15,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  photoModalCancel: {
    marginTop: 8,
    paddingVertical: 14,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  photoModalCancelText: {
    fontSize: 15,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
});