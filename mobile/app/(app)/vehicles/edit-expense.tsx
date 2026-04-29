import { useState } from 'react';
import {
  View, TextInput, ScrollView, Alert,
  StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { expenses as api } from '@/lib/api';
import { Button, FormField, DateField, ChipGroup, inputStyle } from '@/components/Ui';
import { useTheme, SPACE } from '@/theme';

export default function EditExpenseScreen() {
  const { C } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{
    expenseId: string; category: string; amount: string;
    date: string; description?: string;
  }>();

  const CATEGORIES = [
    { value: 'FUEL', label: t('expenseCategory.FUEL') },
    { value: 'SERVICE', label: t('expenseCategory.SERVICE') },
    { value: 'INSURANCE', label: t('expenseCategory.INSURANCE') },
    { value: 'TAX', label: t('expenseCategory.TAX') },
    { value: 'PARKING', label: t('expenseCategory.PARKING') },
    { value: 'TOLL', label: t('expenseCategory.TOLL') },
    { value: 'REPAIR', label: t('expenseCategory.REPAIR') },
    { value: 'OTHER', label: t('expenseCategory.OTHER') },
  ];

  const [category, setCategory] = useState(params.category ?? 'FUEL');
  const [amount, setAmount] = useState(params.amount ?? '');
  const [date, setDate] = useState(() => params.date ? new Date(params.date) : new Date());
  const [description, setDescription] = useState(params.description ?? '');
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    const amountNum = parseFloat(amount.replace(',', '.'));
    if (isNaN(amountNum) || amountNum <= 0) {
      return Alert.alert(t('validation.invalidAmountTitle'), t('validation.invalidAmount'));
    }
    setSaving(true);
    try {
      await api.update(params.expenseId, {
        category,
        amount: amountNum,
        date: date.toISOString().split('T')[0],
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
        <FormField label={t('expenses.categoryLabel')}>
          <ChipGroup options={CATEGORIES} value={category} onChange={setCategory} wrap />
        </FormField>

        <View style={{ flexDirection: 'row', gap: SPACE[3] }}>
          <View style={{ flex: 1 }}>
            <FormField label={t('expenses.amountLabel')}>
              <TextInput
                style={inputStyle(C)}
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                placeholder="e.g. 8500"
                placeholderTextColor={C.mutedLight}
              />
            </FormField>
          </View>
          <View style={{ flex: 1 }}>
            <FormField label={t('expenses.dateLabel')}>
              <DateField value={date} onChange={setDate} />
            </FormField>
          </View>
        </View>

        <FormField label={t('expenses.descriptionLabel')}>
          <TextInput
            style={inputStyle(C)}
            value={description}
            onChangeText={setDescription}
            placeholder="e.g. Full tank at N1"
            placeholderTextColor={C.mutedLight}
          />
        </FormField>

        <Button onPress={handleSubmit} label={t('expenses.saveEdit')} loading={saving} size="lg" style={{ marginTop: SPACE[2] }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { padding: SPACE[4], paddingBottom: SPACE[8] },
});
