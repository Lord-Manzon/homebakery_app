import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import { getProductById, updateProduct, uploadProductImage } from '../../services/products';

const CATEGORIES = [
  'Cakes', 'Cookies', 'Bread', 'Pastries',
  'Cupcakes', 'Donuts', 'Brownies', 'Others',
];

export default function EditProductModal() {
  const Colors = useTheme();
  const styles = useMemo(() => getStyles(Colors), [Colors]);
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [preparationInstructions, setPreparationInstructions] = useState('');
  const [yieldAmount, setYieldAmount] = useState('1');
  const [bufferPercent, setBufferPercent] = useState('0');
  const [markupPercent, setMarkupPercent] = useState('0');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [localImageUri, setLocalImageUri] = useState<string | null>(null);
  const [localImageMimeType, setLocalImageMimeType] = useState<string | null>(null);
  const [photoPickerVisible, setPhotoPickerVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

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
        setImageUrl(product.image_url);
      }
      setLoading(false);
    }
    load();
  }, [id]);

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
    if (!yieldAmount || parseFloat(yieldAmount) <= 0) {
      newErrors.yieldAmount = 'Yield must be greater than 0.';
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});
    setSaving(true);

    let finalImageUrl = imageUrl;
    if (localImageUri) {
      const uploadedUrl = await uploadProductImage(id, localImageUri, localImageMimeType);
      if (!uploadedUrl) {
        setSaving(false);
        setErrors({ general: 'Failed to upload photo. Product details were not saved — please try again.' });
        return;
      }
      finalImageUrl = uploadedUrl;
    }

    const success = await updateProduct(id, {
      name: name.trim(),
      category: category.trim() || null,
      description: description.trim() || null,
      preparation_instructions: preparationInstructions.trim() || null,
      yield: parseFloat(yieldAmount) || 1,
      buffer_percent: parseFloat(bufferPercent) || 0,
      markup_percent: parseFloat(markupPercent) || 0,
      image_url: finalImageUrl,
    });

    setSaving(false);

    if (success) {
      router.back();
    } else {
      setErrors({ general: 'Failed to update product. Please try again.' });
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  const displayedImage = localImageUri ?? imageUrl;

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">

      {/* Photo */}
      <View style={styles.section}>
        <Text style={styles.label}>Photo</Text>
        <TouchableOpacity
          style={styles.photoTouchable}
          onPress={() => setPhotoPickerVisible(true)}
        >
          {displayedImage ? (
            <Image source={{ uri: displayedImage }} style={styles.photo} contentFit="cover" />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Ionicons name="camera-outline" size={28} color={Colors.textMuted} />
              <Text style={styles.photoPlaceholderText}>Add Photo</Text>
            </View>
          )}
          <View style={styles.photoEditBadge}>
            <Ionicons name="pencil" size={14} color="#fff" />
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
        <Text style={styles.hint}>How many pieces does this recipe produce?</Text>
        <TextInput
          style={[styles.input, errors.yieldAmount ? styles.inputError : null]}
          placeholder="e.g. 12"
          placeholderTextColor={Colors.textMuted}
          value={yieldAmount}
          onChangeText={(t) => { setYieldAmount(t); setErrors((e) => ({ ...e, yieldAmount: '' })); }}
          keyboardType="numeric"
        />
        {errors.yieldAmount ? <Text style={styles.errorText}>{errors.yieldAmount}</Text> : null}
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
              <Ionicons name="camera-outline" size={20} color={Colors.textPrimary} />
              <Text style={styles.photoModalOptionText}>Take Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.photoModalOption} onPress={pickFromGallery}>
              <Ionicons name="image-outline" size={20} color={Colors.textPrimary} />
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

const getStyles = (Colors: ReturnType<typeof useTheme>) => StyleSheet.create({
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