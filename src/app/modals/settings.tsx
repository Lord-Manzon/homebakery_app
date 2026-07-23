import { Banknote, Gauge, MapPin, Moon, Palette, Smartphone, Store, Sun, X, type LucideIcon } from 'lucide-react-native';
import { router } from 'expo-router';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeContext } from '../../contexts/ThemeContext';
import { getSettings, updateSettings } from '../../services/settings';

const CURRENCIES = ['PHP', 'USD', 'EUR', 'SGD', 'MYR', 'JPY', 'AUD', 'GBP'];
const DISTANCE_UNITS: { value: 'km' | 'miles'; label: string; icon: string }[] = [
  { value: 'km', label: 'Kilometers', icon: 'navigate-outline' },
  { value: 'miles', label: 'Miles', icon: 'navigate-outline' },
];
const THEMES: { value: 'light' | 'dark' | 'system'; label: string; icon: LucideIcon }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Smartphone },
];

export default function SettingsModal() {
  const insets = useSafeAreaInsets();
  const { colors: Colors, setPreference } = useThemeContext();
  const styles = useMemo(() => getStyles(Colors), [Colors]);
  const [businessName, setBusinessName] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [currency, setCurrency] = useState('PHP');
  const [distanceUnit, setDistanceUnit] = useState<'km' | 'miles'>('km');
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [savedMessage, setSavedMessage] = useState(false);

  useEffect(() => {
    async function load() {
      const data = await getSettings();
      if (data) {
        setBusinessName(data.business_name);
        setBusinessAddress(data.business_address ?? '');
        setCurrency(data.currency);
        setDistanceUnit(data.distance_unit);
        setTheme(data.theme);
      }
      setLoading(false);
    }
    load();
  }, []);

  async function handleSave() {
    if (!businessName.trim()) {
      setErrors({ businessName: 'Business name is required.' });
      return;
    }
    setErrors({});
    setSaving(true);
    const success = await updateSettings({
      business_name: businessName.trim(),
      business_address: businessAddress.trim() || null,
      currency,
      distance_unit: distanceUnit,
      theme,
    });
    setSaving(false);
    if (success) {
      setPreference(theme);
      setSavedMessage(true);
      setTimeout(() => setSavedMessage(false), 2500);
    } else {
      setErrors({ general: 'Failed to save settings. Please try again.' });
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <X size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <TouchableOpacity
          style={[styles.saveBtn, saving && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={styles.saveBtnText}>Save</Text>
          }
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {errors.general ? (
          <View style={styles.banner}>
            <Text style={styles.bannerErrorText}>{errors.general}</Text>
          </View>
        ) : null}
        {savedMessage ? (
          <View style={[styles.banner, styles.bannerSuccess]}>
            <Text style={styles.bannerSuccessText}>Settings saved.</Text>
          </View>
        ) : null}

        {/* Business Section */}
        <Text style={styles.sectionLabel}>BUSINESS</Text>
        <View style={styles.card}>
          <View style={styles.fieldRow}>
            <View style={styles.fieldIcon}>
              <Store size={18} color={Colors.primary} />
            </View>
            <View style={styles.fieldBody}>
              <Text style={styles.fieldLabel}>Business Name</Text>
              <TextInput
                style={[styles.fieldInput, errors.businessName ? styles.fieldInputError : null]}
                value={businessName}
                onChangeText={(t) => { setBusinessName(t); setErrors((e) => ({ ...e, businessName: '' })); }}
                placeholder="e.g. Mama's Bakery"
                placeholderTextColor={Colors.textMuted}
                returnKeyType="next"
              />
              {errors.businessName ? <Text style={styles.errorText}>{errors.businessName}</Text> : null}
            </View>
          </View>

          <View style={styles.separator} />

          <View style={styles.fieldRow}>
            <View style={styles.fieldIcon}>
              <MapPin size={18} color={Colors.primary} />
            </View>
            <View style={styles.fieldBody}>
              <Text style={styles.fieldLabel}>Business Address</Text>
              <TextInput
                style={[styles.fieldInput, styles.multilineInput]}
                value={businessAddress}
                onChangeText={setBusinessAddress}
                placeholder="Used for delivery distance estimates"
                placeholderTextColor={Colors.textMuted}
                multiline
                numberOfLines={2}
                textAlignVertical="top"
              />
            </View>
          </View>
        </View>

        {/* Currency Section */}
        <Text style={styles.sectionLabel}>PREFERENCES</Text>
        <View style={styles.card}>
          <View style={styles.fieldRow}>
            <View style={styles.fieldIcon}>
              <Banknote size={18} color={Colors.primary} />
            </View>
            <View style={styles.fieldBody}>
              <Text style={styles.fieldLabel}>Currency</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginTop: 10 }}
              >
                <View style={styles.chipRow}>
                  {CURRENCIES.map((c) => (
                    <TouchableOpacity
                      key={c}
                      style={[styles.chip, currency === c && styles.chipActive]}
                      onPress={() => setCurrency(c)}
                    >
                      <Text style={[styles.chipText, currency === c && styles.chipTextActive]}>
                        {c}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
              {!CURRENCIES.includes(currency) && (
                <TextInput
                  style={[styles.fieldInput, { marginTop: 10 }]}
                  value={currency}
                  onChangeText={setCurrency}
                  placeholder="Custom code (e.g. THB)"
                  placeholderTextColor={Colors.textMuted}
                  autoCapitalize="characters"
                  maxLength={5}
                />
              )}
            </View>
          </View>

          <View style={styles.separator} />

          {/* Distance Unit */}
          <View style={styles.fieldRow}>
            <View style={styles.fieldIcon}>
              <Gauge size={18} color={Colors.primary} />
            </View>
            <View style={styles.fieldBody}>
              <Text style={styles.fieldLabel}>Distance Unit</Text>
              <View style={styles.segmentRow}>
                {DISTANCE_UNITS.map((d) => (
                  <TouchableOpacity
                    key={d.value}
                    style={[styles.segment, distanceUnit === d.value && styles.segmentActive]}
                    onPress={() => setDistanceUnit(d.value)}
                  >
                    <Text style={[
                      styles.segmentText,
                      distanceUnit === d.value && styles.segmentTextActive,
                    ]}>
                      {d.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          <View style={styles.separator} />

          {/* Theme */}
          <View style={styles.fieldRow}>
            <View style={styles.fieldIcon}>
              <Palette size={18} color={Colors.primary} />
            </View>
            <View style={styles.fieldBody}>
              <Text style={styles.fieldLabel}>Theme</Text>
              <View style={styles.segmentRow}>
                {THEMES.map((t) => (
                  <TouchableOpacity
                    key={t.value}
                    style={[styles.segment, theme === t.value && styles.segmentActive]}
                    onPress={() => setTheme(t.value)}
                  >
                    <t.icon
                      size={14}
                      color={theme === t.value ? '#fff' : Colors.textMuted}
                    />
                    <Text style={[
                      styles.segmentText,
                      theme === t.value && styles.segmentTextActive,
                    ]}>
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </View>

        <View style={{ height: 48 }} />
      </ScrollView>
    </View>
  );
}

const getStyles = (Colors: Record<string, string>) => StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.card,
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: { width: 40 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  saveBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    minWidth: 64,
    alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  scroll: { flex: 1 },

  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 1,
    marginHorizontal: 20,
    marginTop: 24,
    marginBottom: 8,
  },

  card: {
    backgroundColor: Colors.card,
    marginHorizontal: 16,
    borderRadius: 14,
    overflow: 'hidden',
  },

  fieldRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  fieldIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FFF3E0',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  fieldBody: { flex: 1 },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  fieldInput: {
    fontSize: 15,
    color: Colors.textPrimary,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  multilineInput: {
    minHeight: 48,
    lineHeight: 20,
  },

  separator: {
    height: 1,
    backgroundColor: Colors.border,
    marginLeft: 60,
  },

  chipRow: { flexDirection: 'row', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipText: { fontSize: 13, fontWeight: '500', color: Colors.textSecondary },
  chipTextActive: { color: '#fff', fontWeight: '700' },

  segmentRow: {
    flexDirection: 'row',
    backgroundColor: Colors.background,
    borderRadius: 10,
    padding: 3,
    marginTop: 8,
    gap: 3,
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 8,
    borderRadius: 8,
  },
  segmentActive: { backgroundColor: Colors.primary },
  segmentText: { fontSize: 13, fontWeight: '600', color: Colors.textMuted },
  segmentTextActive: { color: '#fff' },

  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 15,
    marginHorizontal: 16,
    marginTop: 24,
  },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  fieldInputError: {
    borderBottomColor: Colors.error,
    borderBottomWidth: 1.5,
  },
  errorText: {
    fontSize: 12,
    color: Colors.error,
    marginTop: 4,
    fontWeight: '500',
  },
  banner: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 10,
    padding: 12,
    backgroundColor: '#FDECEA',
  },
  bannerErrorText: {
    color: Colors.error,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  bannerSuccess: {
    backgroundColor: '#E8F5E9',
  },
  bannerSuccessText: {
    color: Colors.success,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
});