import { useState } from 'react';
import {
  View, Text, TextInput, ScrollView, Alert,
  StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { reminders as api } from '@/lib/api';
import { Button, FormField, DateField, ChipGroup, inputStyle } from '@/components/Ui';
import { useTheme, FONT, SPACE } from '@/theme';

export default function EditReminderScreen() {
  const { C } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{
    reminderId: string; type: string; dueDate?: string;
    dueMileage?: string; note?: string; recurrenceMonths?: string;
  }>();

  const TYPES = [
    { value: 'OIL_CHANGE', label: t('reminderType.OIL_CHANGE') },
    { value: 'INSPECTION', label: t('reminderType.INSPECTION') },
    { value: 'INSURANCE_RENEWAL', label: t('reminderType.INSURANCE_RENEWAL') },
    { value: 'TAX_DUE', label: t('reminderType.TAX_DUE') },
    { value: 'TIRE_CHANGE', label: t('reminderType.TIRE_CHANGE') },
    { value: 'OTHER', label: t('reminderType.OTHER') },
  ];

  const [type, setType] = useState(params.type ?? 'INSPECTION');
  const [useDueDate, setUseDueDate] = useState(!!params.dueDate);
  const [dueDate, setDueDate] = useState(() =>
    params.dueDate ? new Date(params.dueDate) : (() => { const d = new Date(); d.setMonth(d.getMonth() + 6); return d; })()
  );
  const [dueMileage, setDueMileage] = useState(params.dueMileage ?? '');
  const [note, setNote] = useState(params.note ?? '');
  const [recurrenceMonths, setRecurrenceMonths] = useState(params.recurrenceMonths ?? '');
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    if (!useDueDate && !dueMileage) {
      return Alert.alert(t('validation.missingInfo'), t('reminders.missingInfo'));
    }
    const mileageNum = dueMileage ? parseInt(dueMileage, 10) : undefined;
    if (dueMileage && (isNaN(mileageNum!) || mileageNum! < 0)) {
      return Alert.alert(t('validation.invalidMileageTitle'), t('validation.invalidMileage'));
    }
    const recNum = recurrenceMonths ? parseInt(recurrenceMonths, 10) : null;
    setSaving(true);
    try {
      await api.update(params.reminderId, {
        type,
        dueDate: useDueDate ? dueDate.toISOString().split('T')[0] : null,
        dueMileage: mileageNum ?? null,
        note: note.trim() || null,
        recurrenceMonths: recNum,
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
        <FormField label={t('reminders.typeLabel')}>
          <ChipGroup options={TYPES} value={type} onChange={setType} wrap />
        </FormField>

        <FormField label={t('reminders.dueDateLabel')}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE[3], marginBottom: SPACE[2] }}>
            <ChipGroup
              options={[{ value: 'on', label: t('reminders.setDate') }, { value: 'off', label: t('reminders.noDate') }]}
              value={useDueDate ? 'on' : 'off'}
              onChange={(v) => setUseDueDate(v === 'on')}
            />
          </View>
          {useDueDate && (
            <DateField value={dueDate} onChange={setDueDate} />
          )}
        </FormField>

        <FormField label={t('reminders.dueMileageLabel')}>
          <TextInput
            style={inputStyle(C)}
            value={dueMileage}
            onChangeText={setDueMileage}
            keyboardType="number-pad"
            placeholder="e.g. 100000 km"
            placeholderTextColor={C.mutedLight}
          />
          <Text style={{ fontSize: FONT.xs, color: C.mutedLight, marginTop: 4 }}>
            {t('reminders.dueMileageHint')}
          </Text>
        </FormField>

        <FormField label={t('reminders.recurrenceLabel')}>
          <TextInput
            style={inputStyle(C)}
            value={recurrenceMonths}
            onChangeText={setRecurrenceMonths}
            keyboardType="number-pad"
            placeholder="e.g. 12 for annual"
            placeholderTextColor={C.mutedLight}
          />
        </FormField>

        <FormField label={t('reminders.noteLabel')}>
          <TextInput
            style={inputStyle(C)}
            value={note}
            onChangeText={setNote}
            placeholder="Any notes"
            placeholderTextColor={C.mutedLight}
          />
        </FormField>

        <Button onPress={handleSubmit} label={t('reminders.saveEdit')} loading={saving} size="lg" style={{ marginTop: SPACE[2] }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { padding: SPACE[4], paddingBottom: SPACE[8] },
});
