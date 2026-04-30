import { useState } from 'react';
import {
  View, Text, TextInput, ScrollView, Alert, Pressable, Switch,
  StyleSheet, KeyboardAvoidingView, Platform, Modal, FlatList,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { expenses as api, documents as docsApi, type Document } from '@/lib/api';
import { Button, FormField, DateField, ChipGroup, inputStyle } from '@/components/Ui';
import { useTheme, SPACE, FONT, RADIUS } from '@/theme';

const CATEGORIES = [
  'FUEL', 'SERVICE', 'INSURANCE', 'TAX', 'PARKING', 'TOLL', 'REPAIR', 'THRIF', 'OTHER',
] as const;

export default function AddExpenseScreen() {
  const { C } = useTheme();
  const { t } = useTranslation();
  const { vehicleId } = useLocalSearchParams<{ vehicleId: string }>();
  const router = useRouter();

  const categoryOptions = CATEGORIES.map((c) => ({ value: c, label: t(`expenseCategory.${c}`) }));

  const [category, setCategory] = useState<string>('FUEL');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date());
  const [description, setDescription] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [litres, setLitres] = useState('');
  const [recurring, setRecurring] = useState(false);
  const [recurringMonths, setRecurringMonths] = useState('1');
  const [saving, setSaving] = useState(false);
  const [attachedFile, setAttachedFile] = useState<{ uri: string; name: string; mimeType: string } | null>(null);
  const [linkedDocIds, setLinkedDocIds] = useState<string[]>([]);

  const [vehicleDocs, setVehicleDocs] = useState<Document[]>([]);
  const [docsLoaded, setDocsLoaded] = useState(false);
  const [docLinkVisible, setDocLinkVisible] = useState(false);

  async function loadDocs() {
    if (docsLoaded || !vehicleId) return;
    try {
      const res = await docsApi.list(vehicleId);
      setVehicleDocs(res.items.filter((d) => !d.serviceRecordId && !d.expenseId));
      setDocsLoaded(true);
    } catch {}
  }

  function openDocLinker() {
    loadDocs();
    setDocLinkVisible(true);
  }

  function toggleDocLink(id: string) {
    setLinkedDocIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  function pickAttachment() {
    Alert.alert(t('documents.attach'), 'Choose a source', [
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
      const expense = await api.create(vehicleId, {
        category,
        amount: amountNum,
        date: date.toISOString().split('T')[0],
        description: description.trim() || undefined,
        customCategory: category === 'OTHER' && customCategory.trim() ? customCategory.trim() : undefined,
        litres: category === 'FUEL' && litres.trim() ? parseFloat(litres.replace(',', '.')) : undefined,
        recurringMonths: recurring ? (parseInt(recurringMonths, 10) || 1) : undefined,
        documentIds: linkedDocIds.length > 0 ? linkedDocIds : undefined,
      });
      if (attachedFile) {
        await docsApi.upload(vehicleId, {
          uri: attachedFile.uri,
          name: attachedFile.name,
          type: attachedFile.mimeType,
          label: attachedFile.name.replace(/\.[^.]+$/, ''),
          docType: 'RECEIPT',
          expenseId: expense.id,
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
          <ChipGroup options={categoryOptions} value={category} onChange={setCategory} wrap />
        </FormField>

        {category === 'OTHER' && (
          <FormField label="">
            <TextInput
              style={inputStyle(C)}
              value={customCategory}
              onChangeText={setCustomCategory}
              placeholder={t('expenses.customCategoryPlaceholder')}
              placeholderTextColor={C.mutedLight}
            />
          </FormField>
        )}

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

        {category === 'FUEL' && (
          <FormField label={t('expenses.litresLabel')}>
            <TextInput
              style={inputStyle(C)}
              value={litres}
              onChangeText={setLitres}
              keyboardType="decimal-pad"
              placeholder="e.g. 50"
              placeholderTextColor={C.mutedLight}
            />
          </FormField>
        )}

        <FormField label={t('expenses.descriptionLabel')}>
          <TextInput
            style={inputStyle(C)}
            value={description}
            onChangeText={setDescription}
            placeholder="e.g. Full tank at N1"
            placeholderTextColor={C.mutedLight}
          />
        </FormField>

        {/* Recurring toggle */}
        <View style={[s.row, { backgroundColor: C.surfaceRaised, borderRadius: RADIUS.md, padding: SPACE[4], marginBottom: SPACE[4] }]}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: FONT.base, color: C.text, fontWeight: '600' }}>{t('expenses.recurring')}</Text>
            <Text style={{ fontSize: FONT.xs, color: C.muted, marginTop: 2 }}>{t('expenses.recurringHint')}</Text>
          </View>
          <Switch value={recurring} onValueChange={setRecurring} trackColor={{ true: C.accent }} />
        </View>

        {recurring && (
          <FormField label={t('expenses.recurringMonths')}>
            <TextInput
              style={inputStyle(C)}
              value={recurringMonths}
              onChangeText={setRecurringMonths}
              keyboardType="number-pad"
              placeholder={t('expenses.recurringMonthsPlaceholder')}
              placeholderTextColor={C.mutedLight}
            />
          </FormField>
        )}

        {/* Link existing docs */}
        <FormField label={t('documents.linkExisting')}>
          <Pressable
            style={({ pressed }) => [inputStyle(C), { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', opacity: pressed ? 0.7 : 1 }]}
            onPress={openDocLinker}
          >
            <Text style={{ color: linkedDocIds.length > 0 ? C.text : C.mutedLight, fontSize: FONT.base }}>
              {linkedDocIds.length > 0 ? `${linkedDocIds.length} linked` : t('documents.noExisting')}
            </Text>
            <Ionicons name="link-outline" size={18} color={C.mutedLight} />
          </Pressable>
        </FormField>

        {/* Attach new file */}
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

      {/* Document link modal */}
      <Modal visible={docLinkVisible} transparent animationType="slide">
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' }} onPress={() => setDocLinkVisible(false)} />
        <View style={{ backgroundColor: C.surface, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, maxHeight: '60%' }}>
          <View style={{ alignItems: 'center', padding: SPACE[4], borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.borderSubtle }}>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: C.borderStrong, marginBottom: SPACE[3] }} />
            <Text style={{ fontSize: FONT.lg, fontWeight: '700', color: C.text }}>{t('documents.linkExisting')}</Text>
          </View>
          {vehicleDocs.length === 0 ? (
            <View style={{ padding: SPACE[6], alignItems: 'center' }}>
              <Text style={{ fontSize: FONT.sm, color: C.muted }}>{t('documents.noExisting')}</Text>
            </View>
          ) : (
            <FlatList
              data={vehicleDocs}
              keyExtractor={(d) => d.id}
              contentContainerStyle={{ paddingBottom: 36 }}
              renderItem={({ item: doc }) => {
                const linked = linkedDocIds.includes(doc.id);
                return (
                  <Pressable
                    style={({ pressed }) => [{
                      flexDirection: 'row', alignItems: 'center', gap: SPACE[3],
                      paddingHorizontal: SPACE[5], paddingVertical: 14,
                      backgroundColor: linked ? C.accentSubtle : pressed ? C.overlay : 'transparent',
                      borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.borderSubtle,
                    }]}
                    onPress={() => toggleDocLink(doc.id)}
                  >
                    <Ionicons name={linked ? 'checkbox' : 'square-outline'} size={20} color={linked ? C.accent : C.mutedLight} />
                    <Ionicons name="document-outline" size={16} color={C.muted} />
                    <Text style={{ flex: 1, fontSize: FONT.sm, color: C.text }} numberOfLines={1}>{doc.label}</Text>
                  </Pressable>
                );
              }}
            />
          )}
          <View style={{ padding: SPACE[4], borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.borderSubtle }}>
            <Pressable
              style={({ pressed }) => [{ backgroundColor: C.accent, borderRadius: RADIUS.md, padding: 14, alignItems: 'center', opacity: pressed ? 0.8 : 1 }]}
              onPress={() => setDocLinkVisible(false)}
            >
              <Text style={{ fontSize: FONT.base, color: '#fff', fontWeight: '700' }}>Done</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { padding: SPACE[4], paddingBottom: SPACE[8] },
  row: { flexDirection: 'row', alignItems: 'center' },
});
