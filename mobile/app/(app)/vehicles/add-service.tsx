import { useState } from 'react';
import {
  View, Text, TextInput, ScrollView, Alert, Pressable,
  StyleSheet, KeyboardAvoidingView, Platform, Modal, FlatList, Switch,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { serviceRecords as api, documents as docsApi, type Document } from '@/lib/api';
import { Button, FormField, DateField, inputStyle } from '@/components/Ui';
import { useTheme, SPACE, FONT, RADIUS } from '@/theme';

const INSPECTION_TYPES = new Set(['INSPECTION', 'MAIN_INSPECTION', 'RE_INSPECTION']);
const INSPECTION_STATIONS = ['Aðalskoðun', 'Frumherji', 'Betri skoðun', 'Tékkland'];

type CategoryNode =
  | { id: string; isGroup: true; children: string[] }
  | { id: string; isGroup: false; children: [] };

const CATEGORY_TREE: CategoryNode[] = [
  { id: 'OIL_GROUP',        isGroup: true,  children: ['ENGINE_OIL_CHANGE', 'TRANSMISSION_OIL_CHANGE'] },
  { id: 'TIRES_GROUP',      isGroup: true,  children: ['TIRE_CHANGE', 'TIRE_ROTATION'] },
  { id: 'BRAKE_GROUP',      isGroup: true,  children: ['BRAKE_DISCS', 'BRAKE_PADS', 'BRAKE_BANDS', 'HANDBRAKE'] },
  { id: 'FILTER_GROUP',     isGroup: true,  children: ['OIL_FILTER', 'FUEL_FILTER', 'TRANSMISSION_FILTER', 'AIR_FILTER', 'CABIN_FILTER'] },
  { id: 'INSPECTION_GROUP', isGroup: true,  children: ['MAIN_INSPECTION', 'RE_INSPECTION'] },
  { id: 'TRANSMISSION_SERVICE', isGroup: false, children: [] },
  { id: 'COOLANT_FLUSH',    isGroup: false, children: [] },
  { id: 'BATTERY_REPLACEMENT', isGroup: false, children: [] },
  { id: 'WINDSHIELD_GROUP', isGroup: true,  children: ['WINDSHIELD_REPAIR', 'WINDSHIELD_REPLACEMENT'] },
  { id: 'OTHER',            isGroup: false, children: [] },
];

const GROUP_TO_CAT: Record<string, string> = {
  OIL_GROUP: 'OIL', TIRES_GROUP: 'TIRES', BRAKE_GROUP: 'BRAKE_GROUP',
  FILTER_GROUP: 'FILTER_GROUP', INSPECTION_GROUP: 'INSPECTION_GROUP', WINDSHIELD_GROUP: 'WINDSHIELD_GROUP',
};

export default function AddServiceScreen() {
  const { C } = useTheme();
  const { t } = useTranslation();
  const { vehicleId } = useLocalSearchParams<{ vehicleId: string }>();
  const router = useRouter();

  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [customType, setCustomType] = useState('');
  const [mileage, setMileage] = useState('');
  const [date, setDate] = useState(new Date());
  const [shop, setShop] = useState('');
  const [cost, setCost] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [attachedFile, setAttachedFile] = useState<{ uri: string; name: string; mimeType: string } | null>(null);
  const [linkedDocIds, setLinkedDocIds] = useState<string[]>([]);

  // Vehicle docs for linking
  const [vehicleDocs, setVehicleDocs] = useState<Document[]>([]);
  const [docsLoaded, setDocsLoaded] = useState(false);

  // Modals
  const [pickerVisible, setPickerVisible] = useState(false);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [otherInput, setOtherInput] = useState('');
  const [docLinkVisible, setDocLinkVisible] = useState(false);

  const hasInspection = selectedTypes.some((t) => INSPECTION_TYPES.has(t));

  function getGroupLabel(id: string) {
    if (id in GROUP_TO_CAT) return t(`serviceCategory.${GROUP_TO_CAT[id]}`);
    return t(`serviceType.${id}`, id);
  }

  function getTypeLabel(type: string) {
    if (type === 'OTHER' && customType) return customType;
    return t(`serviceType.${type}`, type);
  }

  function toggleType(type: string) {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((x) => x !== type) : [...prev, type]
    );
  }

  function removeType(type: string) {
    setSelectedTypes((prev) => prev.filter((x) => x !== type));
    if (type === 'OTHER') setCustomType('');
  }

  function addOther() {
    const name = otherInput.trim();
    if (!name) return;
    setCustomType(name);
    if (!selectedTypes.includes('OTHER')) setSelectedTypes((p) => [...p, 'OTHER']);
    setOtherInput('');
    setExpandedGroup(null);
  }

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
    if (selectedTypes.length === 0) {
      return Alert.alert(t('validation.missingInfo'), t('validation.selectServiceType'));
    }
    const mileageNum = parseInt(mileage, 10);
    if (isNaN(mileageNum) || mileageNum < 0) {
      return Alert.alert(t('validation.invalidMileageTitle'), t('validation.invalidMileage'));
    }
    setSaving(true);
    try {
      const record = await api.create(vehicleId, {
        types: selectedTypes,
        customType: customType.trim() || undefined,
        mileage: mileageNum,
        date: date.toISOString().split('T')[0],
        shop: shop.trim() || undefined,
        cost: cost.trim() ? parseFloat(cost.replace(',', '.')) : undefined,
        description: description.trim() || undefined,
        documentIds: linkedDocIds.length > 0 ? linkedDocIds : undefined,
      });
      if (attachedFile) {
        await docsApi.upload(vehicleId, {
          uri: attachedFile.uri,
          name: attachedFile.name,
          type: attachedFile.mimeType,
          label: attachedFile.name.replace(/\.[^.]+$/, ''),
          docType: 'RECEIPT',
          serviceRecordId: record.id,
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
        {/* Selected types chips */}
        <FormField label={t('serviceRecords.typeLabel')}>
          {selectedTypes.length > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE[2], marginBottom: SPACE[2] }}>
              {selectedTypes.map((type) => (
                <View key={type} style={[s.chip, { backgroundColor: C.accent }]}>
                  <Text style={{ fontSize: FONT.xs, color: '#fff', fontWeight: '600' }}>{getTypeLabel(type)}</Text>
                  <Pressable onPress={() => removeType(type)} hitSlop={8}>
                    <Ionicons name="close" size={12} color="rgba(255,255,255,0.8)" />
                  </Pressable>
                </View>
              ))}
            </View>
          )}
          <Pressable
            style={({ pressed }) => [inputStyle(C), { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', opacity: pressed ? 0.7 : 1 }]}
            onPress={() => setPickerVisible(true)}
          >
            <Text style={{ color: C.mutedLight, fontSize: FONT.base }}>{t('serviceRecords.selectTypes')}</Text>
            <Ionicons name="add-circle-outline" size={18} color={C.accent} />
          </Pressable>
        </FormField>

        {/* Inspection station (shown when inspection type selected) */}
        {hasInspection && (
          <FormField label={t('serviceRecords.inspectionStation')}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', gap: SPACE[2] }}>
                {INSPECTION_STATIONS.map((station) => (
                  <Pressable
                    key={station}
                    onPress={() => setShop((prev) => prev === station ? '' : station)}
                    style={[s.stationChip, {
                      backgroundColor: shop === station ? C.accent : C.surface,
                      borderColor: shop === station ? C.accent : C.borderStrong,
                    }]}
                  >
                    <Text style={{ fontSize: FONT.xs, fontWeight: '600', color: shop === station ? '#fff' : C.muted }}>
                      {station}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </FormField>
        )}

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
              <DateField value={date} onChange={setDate} maximumDate={new Date()} />
            </FormField>
          </View>
        </View>

        {!hasInspection && (
          <FormField label={t('serviceRecords.shopLabel')}>
            <TextInput
              style={inputStyle(C)}
              value={shop}
              onChangeText={setShop}
              placeholder="e.g. Speedy Service"
              placeholderTextColor={C.mutedLight}
            />
          </FormField>
        )}

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
            placeholder="Any notes about this service"
            placeholderTextColor={C.mutedLight}
          />
        </FormField>

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

        <Button onPress={handleSubmit} label={t('serviceRecords.save')} loading={saving} size="lg" style={{ marginTop: SPACE[2] }} />
      </ScrollView>

      {/* Service type picker modal */}
      <Modal visible={pickerVisible} transparent animationType="slide">
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' }} onPress={() => { setPickerVisible(false); setExpandedGroup(null); }} />
        <View style={{ backgroundColor: C.surface, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, maxHeight: '75%' }}>
          <View style={{ alignItems: 'center', padding: SPACE[4], borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.borderSubtle }}>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: C.borderStrong, marginBottom: SPACE[3] }} />
            <Text style={{ fontSize: FONT.lg, fontWeight: '700', color: C.text }}>{t('serviceRecords.typeLabel')}</Text>
          </View>
          <FlatList
            data={CATEGORY_TREE}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingBottom: 36 }}
            renderItem={({ item }) => {
              const isExpanded = expandedGroup === item.id;
              if (item.isGroup) {
                const anyChildSelected = item.children.some((c) => selectedTypes.includes(c));
                return (
                  <View>
                    <Pressable
                      style={({ pressed }) => [{
                        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                        paddingHorizontal: SPACE[5], paddingVertical: 14,
                        backgroundColor: pressed ? C.overlay : 'transparent',
                        borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.borderSubtle,
                      }]}
                      onPress={() => setExpandedGroup(isExpanded ? null : item.id)}
                    >
                      <Text style={{ fontSize: FONT.base, color: anyChildSelected ? C.accent : C.text, fontWeight: anyChildSelected ? '700' : '500' }}>
                        {getGroupLabel(item.id)}
                      </Text>
                      <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-forward'} size={16} color={C.mutedLight} />
                    </Pressable>
                    {isExpanded && item.children.map((child) => {
                      const isSelected = selectedTypes.includes(child);
                      return (
                        <Pressable
                          key={child}
                          style={({ pressed }) => [{
                            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                            paddingHorizontal: SPACE[6], paddingVertical: 12,
                            backgroundColor: isSelected ? C.accentSubtle : pressed ? C.overlay : C.surfaceRaised,
                            borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.borderSubtle,
                          }]}
                          onPress={() => toggleType(child)}
                        >
                          <Text style={{ fontSize: FONT.sm, color: isSelected ? C.accent : C.text, fontWeight: isSelected ? '600' : '400' }}>
                            {t(`serviceType.${child}`, child)}
                          </Text>
                          {isSelected && <Ionicons name="checkmark" size={16} color={C.accent} />}
                        </Pressable>
                      );
                    })}
                  </View>
                );
              }
              // Leaf item
              if (item.id === 'OTHER') {
                const isExpanded2 = expandedGroup === 'OTHER';
                return (
                  <View>
                    <Pressable
                      style={({ pressed }) => [{
                        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                        paddingHorizontal: SPACE[5], paddingVertical: 14,
                        backgroundColor: pressed ? C.overlay : 'transparent',
                        borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.borderSubtle,
                      }]}
                      onPress={() => setExpandedGroup(isExpanded2 ? null : 'OTHER')}
                    >
                      <Text style={{ fontSize: FONT.base, color: selectedTypes.includes('OTHER') ? C.accent : C.text, fontWeight: selectedTypes.includes('OTHER') ? '700' : '500' }}>
                        {t('serviceType.OTHER')}
                      </Text>
                      <Ionicons name={isExpanded2 ? 'chevron-up' : 'chevron-forward'} size={16} color={C.mutedLight} />
                    </Pressable>
                    {isExpanded2 && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE[2], paddingHorizontal: SPACE[5], paddingVertical: SPACE[3], backgroundColor: C.surfaceRaised, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.borderSubtle }}>
                        <TextInput
                          style={[inputStyle(C), { flex: 1 }]}
                          value={otherInput}
                          onChangeText={setOtherInput}
                          placeholder={t('serviceRecords.otherPlaceholder')}
                          placeholderTextColor={C.mutedLight}
                          returnKeyType="done"
                          onSubmitEditing={addOther}
                          autoFocus
                        />
                        <Pressable
                          onPress={addOther}
                          style={[{ backgroundColor: C.accent, borderRadius: RADIUS.md, padding: SPACE[3] }, !otherInput.trim() && { opacity: 0.4 }]}
                          disabled={!otherInput.trim()}
                        >
                          <Ionicons name="add" size={18} color="#fff" />
                        </Pressable>
                      </View>
                    )}
                  </View>
                );
              }
              const isSelected = selectedTypes.includes(item.id);
              return (
                <Pressable
                  style={({ pressed }) => [{
                    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                    paddingHorizontal: SPACE[5], paddingVertical: 14,
                    backgroundColor: isSelected ? C.accentSubtle : pressed ? C.overlay : 'transparent',
                    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.borderSubtle,
                  }]}
                  onPress={() => toggleType(item.id)}
                >
                  <Text style={{ fontSize: FONT.base, color: isSelected ? C.accent : C.text, fontWeight: isSelected ? '600' : '500' }}>
                    {t(`serviceType.${item.id}`, item.id)}
                  </Text>
                  {isSelected && <Ionicons name="checkmark" size={16} color={C.accent} />}
                </Pressable>
              );
            }}
          />
          <View style={{ padding: SPACE[4], borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.borderSubtle }}>
            <Pressable
              style={({ pressed }) => [{ backgroundColor: C.accent, borderRadius: RADIUS.md, padding: 14, alignItems: 'center', opacity: pressed ? 0.8 : 1 }]}
              onPress={() => { setPickerVisible(false); setExpandedGroup(null); }}
            >
              <Text style={{ fontSize: FONT.base, color: '#fff', fontWeight: '700' }}>Done</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

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
  chip: { flexDirection: 'row', alignItems: 'center', gap: SPACE[1], paddingHorizontal: SPACE[3], paddingVertical: SPACE[1], borderRadius: RADIUS.full },
  stationChip: { paddingHorizontal: SPACE[3], paddingVertical: SPACE[2], borderRadius: RADIUS.full, borderWidth: 1 },
});
