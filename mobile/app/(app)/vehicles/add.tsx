import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, ScrollView, Pressable,
  StyleSheet, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { ref as refApi, vehicles as vehiclesApi, type CarMake, type CarModel } from '@/lib/api';
import { Button, FormField, ChipGroup, inputStyle, Spinner } from '@/components/Ui';
import { useTheme, FONT, SPACE, RADIUS } from '@/theme';

export default function AddVehicleScreen() {
  const { C } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();

  const FUEL_TYPES: { value: string; label: string }[] = [
    { value: 'PETROL', label: t('fuelType.PETROL') },
    { value: 'DIESEL', label: t('fuelType.DIESEL') },
    { value: 'ELECTRIC', label: t('fuelType.ELECTRIC') },
    { value: 'HYBRID', label: t('fuelType.HYBRID') },
    { value: 'PLUG_IN_HYBRID', label: t('fuelType.PLUG_IN_HYBRID') },
    { value: 'HYDROGEN', label: t('fuelType.HYDROGEN') },
  ];

  const [makes, setMakes] = useState<CarMake[]>([]);
  const [models, setModels] = useState<CarModel[]>([]);
  const [makesLoading, setMakesLoading] = useState(true);
  const [modelsLoading, setModelsLoading] = useState(false);

  const [selectedMake, setSelectedMake] = useState<CarMake | null>(null);
  const [makeQuery, setMakeQuery] = useState('');
  const [modelQuery, setModelQuery] = useState('');
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [licensePlate, setLicensePlate] = useState('');
  const [fuelType, setFuelType] = useState('PETROL');
  const [color, setColor] = useState('');
  const [vin, setVin] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    refApi.makes()
      .then(setMakes)
      .catch(() => Alert.alert('Error', 'Could not load vehicle makes'))
      .finally(() => setMakesLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedMake) { setModels([]); setModelQuery(''); return; }
    setModelsLoading(true);
    refApi.models(selectedMake.id)
      .then(setModels)
      .catch(() => setModels([]))
      .finally(() => setModelsLoading(false));
  }, [selectedMake]);

  const filteredMakes = makeQuery.length > 0
    ? makes.filter((m) => m.name.toLowerCase().startsWith(makeQuery.toLowerCase()))
    : [];

  const filteredModels = modelQuery.length > 0 && models.length > 0
    ? models.filter((m) => m.name.toLowerCase().startsWith(modelQuery.toLowerCase()))
    : [];

  async function handleSubmit() {
    const makeStr = selectedMake?.name ?? makeQuery.trim();
    const modelStr = modelQuery.trim();
    const yearNum = parseInt(year, 10);

    if (!makeStr) return Alert.alert(t('validation.required'), t('validation.enterMake'));
    if (!modelStr) return Alert.alert(t('validation.required'), t('validation.enterModel'));
    if (!licensePlate.trim()) return Alert.alert(t('validation.required'), t('validation.enterLicensePlate'));
    if (isNaN(yearNum) || yearNum < 1886 || yearNum > new Date().getFullYear() + 1)
      return Alert.alert(t('validation.invalidYearTitle'), t('validation.invalidYear'));
    if (vin && vin.length !== 17)
      return Alert.alert(t('validation.invalidVinTitle'), t('validation.invalidVin'));

    setSaving(true);
    try {
      await vehiclesApi.create({
        make: makeStr,
        model: modelStr,
        year: yearNum,
        licensePlate: licensePlate.trim().toUpperCase().replace(/[\s-]/g, ''),
        fuelType,
        color: color.trim() || undefined,
        vin: vin.trim().toUpperCase() || undefined,
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (e: any) {
      Alert.alert(t('common.error'), e.message ?? t('validation.failedToSave'));
    } finally {
      setSaving(false);
    }
  }

  if (makesLoading) return <Spinner />;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
    <ScrollView
      style={{ backgroundColor: C.bg }}
      contentContainerStyle={s.container}
      keyboardShouldPersistTaps="handled"
    >
      {/* Make */}
      <FormField label={t('vehicles.make')}>
        <TextInput
          style={inputStyle(C)}
          placeholder={t('vehicles.makePlaceholder')}
          placeholderTextColor={C.mutedLight}
          value={makeQuery}
          onChangeText={(v) => {
            setMakeQuery(v);
            if (selectedMake && v !== selectedMake.name) setSelectedMake(null);
          }}
          autoCorrect={false}
        />
        {makeQuery.length > 0 && !selectedMake && filteredMakes.length > 0 && (
          <View style={[s.dropdown, { borderColor: C.border, backgroundColor: C.surface }]}>
            {filteredMakes.slice(0, 6).map((m, i) => (
              <Pressable
                key={m.id}
                style={[s.dropdownItem, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border }]}
                onPress={() => { setSelectedMake(m); setMakeQuery(m.name); }}
              >
                <Text style={{ fontSize: FONT.base, color: C.text }}>{m.name}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </FormField>

      {/* Model */}
      <FormField label={t('vehicles.model')}>
        {modelsLoading ? (
          <View style={[inputStyle(C), { justifyContent: 'center' }]}>
            <Text style={{ color: C.muted }}>{t('vehicles.loadingModels')}</Text>
          </View>
        ) : (
          <>
            <TextInput
              style={inputStyle(C)}
              placeholder={selectedMake ? t('vehicles.selectOrTypeModel') : t('vehicles.selectMakeFirst')}
              placeholderTextColor={C.mutedLight}
              value={modelQuery}
              onChangeText={setModelQuery}
              editable={!!selectedMake || makes.length === 0}
              autoCorrect={false}
            />
            {modelQuery.length > 0 && filteredModels.length > 0 && (
              <View style={[s.dropdown, { borderColor: C.border, backgroundColor: C.surface }]}>
                {filteredModels.slice(0, 6).map((m, i) => (
                  <Pressable
                    key={m.id}
                    style={[s.dropdownItem, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border }]}
                    onPress={() => setModelQuery(m.name)}
                  >
                    <Text style={{ fontSize: FONT.base, color: C.text }}>{m.name}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </>
        )}
      </FormField>

      {/* Year + Plate */}
      <View style={{ flexDirection: 'row', gap: SPACE[3] }}>
        <View style={{ flex: 1 }}>
          <FormField label={t('vehicles.year')}>
            <TextInput
              style={inputStyle(C)}
              value={year}
              onChangeText={setYear}
              keyboardType="number-pad"
              maxLength={4}
              placeholderTextColor={C.mutedLight}
            />
          </FormField>
        </View>
        <View style={{ flex: 2 }}>
          <FormField label={t('vehicles.licensePlate')}>
            <TextInput
              style={inputStyle(C)}
              value={licensePlate}
              onChangeText={setLicensePlate}
              placeholder="ABC123"
              placeholderTextColor={C.mutedLight}
              autoCapitalize="characters"
              autoCorrect={false}
            />
          </FormField>
        </View>
      </View>

      {/* Fuel type */}
      <FormField label={t('vehicles.fuelType')}>
        <ChipGroup options={FUEL_TYPES} value={fuelType} onChange={setFuelType} wrap />
      </FormField>

      {/* Color */}
      <FormField label={t('vehicles.color')}>
        <TextInput
          style={inputStyle(C)}
          value={color}
          onChangeText={setColor}
          placeholder="e.g. White"
          placeholderTextColor={C.mutedLight}
        />
      </FormField>

      {/* VIN */}
      <FormField label={t('vehicles.vin')}>
        <TextInput
          style={inputStyle(C)}
          value={vin}
          onChangeText={setVin}
          placeholder={t('vehicles.vinPlaceholder')}
          placeholderTextColor={C.mutedLight}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={17}
        />
      </FormField>

      <Button onPress={handleSubmit} label={t('vehicles.addVehicle')} loading={saving} size="lg" style={{ marginTop: SPACE[2] }} />
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { padding: SPACE[4], paddingBottom: SPACE[8] },
  dropdown: {
    marginTop: 4,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
  },
  dropdownItem: { paddingHorizontal: SPACE[4], paddingVertical: 12 },
});
