import { useState } from 'react';
import {
  View, TextInput, ScrollView, Alert,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { mileageLogs as api } from '@/lib/api';
import { Button, FormField, DateField, inputStyle } from '@/components/Ui';
import { useTheme, SPACE } from '@/theme';

export default function AddMileageScreen() {
  const { C } = useTheme();
  const { t } = useTranslation();
  const { vehicleId } = useLocalSearchParams<{ vehicleId: string }>();
  const router = useRouter();

  const [mileage, setMileage] = useState('');
  const [date, setDate] = useState(new Date());
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    if (!vehicleId) return;
    const mileageNum = parseInt(mileage, 10);
    if (isNaN(mileageNum) || mileageNum < 0) {
      return Alert.alert(t('validation.invalidMileageTitle'), t('validation.invalidMileage'));
    }
    setSaving(true);
    try {
      await api.create(vehicleId, {
        mileage: mileageNum,
        date: date.toISOString().split('T')[0],
        note: note.trim() || undefined,
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
        contentContainerStyle={{ padding: SPACE[4], paddingBottom: SPACE[8] }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ flexDirection: 'row', gap: SPACE[3] }}>
          <View style={{ flex: 1 }}>
            <FormField label={t('mileage.currentLabel')}>
              <TextInput
                style={inputStyle(C)}
                value={mileage}
                onChangeText={setMileage}
                keyboardType="number-pad"
                placeholder="e.g. 87500"
                placeholderTextColor={C.mutedLight}
                autoFocus
              />
            </FormField>
          </View>
          <View style={{ flex: 1 }}>
            <FormField label={t('mileage.dateLabel')}>
              <DateField value={date} onChange={setDate} maximumDate={new Date()} />
            </FormField>
          </View>
        </View>

        <FormField label={t('mileage.noteLabel')}>
          <TextInput
            style={inputStyle(C)}
            value={note}
            onChangeText={setNote}
            placeholder="e.g. Before road trip"
            placeholderTextColor={C.mutedLight}
          />
        </FormField>

        <Button onPress={handleSubmit} label={t('mileage.save')} loading={saving} size="lg" style={{ marginTop: SPACE[2] }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
