import { useState } from 'react';
import {
  View, Text, TextInput, ScrollView, Alert, Pressable,
  StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { expenses as api, documents as docsApi } from '@/lib/api';
import { Button, FormField, DateField, ChipGroup, inputStyle } from '@/components/Ui';
import { useTheme, SPACE, FONT } from '@/theme';

export default function AddExpenseScreen() {
  const { C } = useTheme();
  const { t } = useTranslation();
  const { vehicleId } = useLocalSearchParams<{ vehicleId: string }>();
  const router = useRouter();

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

  const [category, setCategory] = useState('FUEL');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date());
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [attachedFile, setAttachedFile] = useState<{ uri: string; name: string; mimeType: string } | null>(null);

  function pickAttachment() {
    Alert.alert('Attach file', 'Choose a source', [
      { text: 'Photos', onPress: async () => {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) { Alert.alert('Permission denied', 'Photo library access is required.'); return; }
        const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images', quality: 0.85, allowsMultipleSelection: false });
        if (!result.canceled && result.assets[0]) {
          const a = result.assets[0];
          setAttachedFile({ uri: a.uri, name: a.fileName ?? `photo_${Date.now()}.jpg`, mimeType: a.mimeType ?? 'image/jpeg' });
        }
      }},
      { text: 'Camera', onPress: async () => {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) { Alert.alert('Permission denied', 'Camera access is required.'); return; }
        const result = await ImagePicker.launchCameraAsync({ mediaTypes: 'images', quality: 0.85 });
        if (!result.canceled && result.assets[0]) {
          const a = result.assets[0];
          setAttachedFile({ uri: a.uri, name: a.fileName ?? `photo_${Date.now()}.jpg`, mimeType: a.mimeType ?? 'image/jpeg' });
        }
      }},
      { text: 'Files', onPress: async () => {
        const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
        if (!result.canceled && result.assets[0]) {
          const a = result.assets[0];
          setAttachedFile({ uri: a.uri, name: a.name, mimeType: a.mimeType ?? 'application/octet-stream' });
        }
      }},
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  }

  async function handleSubmit() {
    if (!vehicleId) return;
    const amountNum = parseFloat(amount.replace(',', '.'));
    if (isNaN(amountNum) || amountNum <= 0) {
      return Alert.alert(t('validation.invalidAmountTitle'), t('validation.invalidAmount'));
    }
    setSaving(true);
    try {
      await api.create(vehicleId, {
        category,
        amount: amountNum,
        date: date.toISOString().split('T')[0],
        description: description.trim() || undefined,
      });
      if (attachedFile) {
        await docsApi.upload(vehicleId, {
          uri: attachedFile.uri,
          name: attachedFile.name,
          type: attachedFile.mimeType,
          label: attachedFile.name.replace(/\.[^.]+$/, ''),
          docType: 'RECEIPT',
        }).catch(() => {});
      }
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
                autoFocus
              />
            </FormField>
          </View>
          <View style={{ flex: 1 }}>
            <FormField label={t('expenses.dateLabel')}>
              <DateField value={date} onChange={setDate} maximumDate={new Date()} />
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

        <FormField label={t('documents.attach')}>
          {!attachedFile ? (
            <Pressable
              style={[inputStyle(C), { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
              onPress={pickAttachment}
            >
              <Text style={{ color: C.mutedLight, fontSize: FONT.base }}>No file selected</Text>
              <Ionicons name="attach-outline" size={18} color={C.mutedLight} />
            </Pressable>
          ) : (
            <View style={[inputStyle(C), { flexDirection: 'row', alignItems: 'center' }]}>
              <Ionicons name="document-attach-outline" size={16} color={C.accent} />
              <Text style={{ flex: 1, marginLeft: SPACE[2], color: C.text, fontSize: FONT.sm }} numberOfLines={1}>{attachedFile.name}</Text>
              <Pressable onPress={() => setAttachedFile(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close-circle" size={18} color={C.muted} />
              </Pressable>
            </View>
          )}
        </FormField>

        <Button onPress={handleSubmit} label={t('expenses.save')} loading={saving} size="lg" style={{ marginTop: SPACE[2] }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { padding: SPACE[4], paddingBottom: SPACE[8] },
});
