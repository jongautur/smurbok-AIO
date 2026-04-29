import { useState } from 'react';
import {
  View, TextInput, ScrollView, Alert,
  StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { serviceRecords as api } from '@/lib/api';
import { Button, FormField, DateField, ChipGroup, inputStyle } from '@/components/Ui';
import { useTheme, SPACE } from '@/theme';

export default function EditServiceScreen() {
  const { C } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{
    recordId: string; type: string; mileage: string;
    date: string; shop?: string; cost?: string; description?: string;
  }>();

  const TYPES = [
    { value: 'OIL_CHANGE', label: t('serviceType.OIL_CHANGE') },
    { value: 'TIRE_ROTATION', label: t('serviceType.TIRE_ROTATION') },
    { value: 'TIRE_CHANGE', label: t('serviceType.TIRE_CHANGE') },
    { value: 'BRAKE_SERVICE', label: t('serviceType.BRAKE_SERVICE') },
    { value: 'FILTER_CHANGE', label: t('serviceType.FILTER_CHANGE') },
    { value: 'INSPECTION', label: t('serviceType.INSPECTION') },
    { value: 'TRANSMISSION_SERVICE', label: t('serviceType.TRANSMISSION_SERVICE') },
    { value: 'COOLANT_FLUSH', label: t('serviceType.COOLANT_FLUSH') },
    { value: 'BATTERY_REPLACEMENT', label: t('serviceType.BATTERY_REPLACEMENT') },
    { value: 'WINDSHIELD', label: t('serviceType.WINDSHIELD') },
    { value: 'OTHER', label: t('serviceType.OTHER') },
  ];

  const [type, setType] = useState(params.type ?? 'OIL_CHANGE');
  const [mileage, setMileage] = useState(params.mileage ?? '');
  const [date, setDate] = useState(() => params.date ? new Date(params.date) : new Date());
  const [shop, setShop] = useState(params.shop ?? '');
  const [cost, setCost] = useState(params.cost ?? '');
  const [description, setDescription] = useState(params.description ?? '');
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    const mileageNum = parseInt(mileage, 10);
    if (isNaN(mileageNum) || mileageNum < 0) {
      return Alert.alert(t('validation.invalidMileageTitle'), t('validation.invalidMileage'));
    }
    setSaving(true);
    try {
      await api.update(params.recordId, {
        type,
        mileage: mileageNum,
        date: date.toISOString().split('T')[0],
        shop: shop.trim() || null,
        cost: cost.trim() ? parseFloat(cost.replace(',', '.')) : null,
        description: description.trim() || null,
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (e: any) {
      Alert.alert(t('common.error'), e.message ?? t('validation.failedToSave'));
    } finally {
      setSaving(false);
    }
  }

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
        <FormField label={t('serviceRecords.typeLabel')}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -2 }}>
            <ChipGroup options={TYPES} value={type} onChange={setType} />
          </ScrollView>
        </FormField>

        <View style={{ flexDirection: 'row', gap: SPACE[3] }}>
          <View style={{ flex: 1 }}>
            <FormField label={t('serviceRecords.mileageLabel')}>
              <TextInput
                style={inputStyle(C)}
                value={mileage}
                onChangeText={setMileage}
                keyboardType="number-pad"
                placeholder="e.g. 85000"
                placeholderTextColor={C.mutedLight}
              />
            </FormField>
          </View>
          <View style={{ flex: 1 }}>
            <FormField label={t('serviceRecords.dateLabel')}>
              <DateField value={date} onChange={setDate} />
            </FormField>
          </View>
        </View>

        <FormField label={t('serviceRecords.shopLabel')}>
          <TextInput
            style={inputStyle(C)}
            value={shop}
            onChangeText={setShop}
            placeholder="e.g. Speedy Service"
            placeholderTextColor={C.mutedLight}
          />
        </FormField>

        <FormField label={t('serviceRecords.costLabel')}>
          <TextInput
            style={inputStyle(C)}
            value={cost}
            onChangeText={setCost}
            keyboardType="decimal-pad"
            placeholder="e.g. 15000"
            placeholderTextColor={C.mutedLight}
          />
        </FormField>

        <FormField label={t('serviceRecords.notesLabel')}>
          <TextInput
            style={[inputStyle(C), { minHeight: 80, textAlignVertical: 'top' }]}
            value={description}
            onChangeText={setDescription}
            multiline
            placeholder="Any notes"
            placeholderTextColor={C.mutedLight}
          />
        </FormField>

        <Button onPress={handleSubmit} label={t('serviceRecords.saveEdit')} loading={saving} size="lg" style={{ marginTop: SPACE[2] }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { padding: SPACE[4], paddingBottom: SPACE[8] },
});
