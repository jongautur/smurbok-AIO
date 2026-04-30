import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet,
  RefreshControl, Alert, Modal, Image, TextInput,
  KeyboardAvoidingView, Platform, PanResponder,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { useNavigation } from 'expo-router';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import {
  vehicles as vehicleApi, serviceRecords as srApi,
  reminders as remApi, expenses as expApi, mileageLogs as mlApi,
  documents as docsApi,
  type VehicleOverview, type ServiceRecord, type Reminder,
  type Expense, type MileageLog, type Document, type TimelineEntry,
} from '@/lib/api';
import {
  Badge, Card, SectionHeader, Spinner, EmptyState,
  Divider, DateField, UndoToastSlot, useUndoToast,
  FormField, inputStyle,
} from '@/components/Ui';
import { useTranslation } from 'react-i18next';
import { useTheme, type Colors, FONT, SPACE, RADIUS } from '@/theme';

const FUEL_COLORS: Record<string, string> = {
  PETROL: '#f97316', DIESEL: '#64748b', ELECTRIC: '#22c55e',
  HYBRID: '#0ea5e9', PLUG_IN_HYBRID: '#6366f1', HYDROGEN: '#a855f7',
};

const PAGE_SIZE = 10;

function srLabel(sr: { types: string[]; customType: string | null }, t: (key: string, fallback: string) => string) {
  if (sr.customType) return sr.customType;
  return sr.types.map((tp) => t(`serviceType.${tp}`, tp)).join(' + ');
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}
function fmtShort(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}
function daysUntil(iso: string) {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}
function accentFromColor(color?: string | null): string {
  if (!color) return '#3b82f6';
  const map: Record<string, string> = {
    white: '#94a3b8', black: '#475569', silver: '#94a3b8', gray: '#6b7280',
    grey: '#6b7280', red: '#ef4444', blue: '#3b82f6', green: '#22c55e',
    yellow: '#eab308', orange: '#f97316', brown: '#a16207', purple: '#a855f7',
  };
  const lower = color.toLowerCase();
  for (const [key, val] of Object.entries(map)) {
    if (lower.includes(key)) return val;
  }
  return '#3b82f6';
}

export default function VehicleDetailScreen() {
  const { C } = useTheme();
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const undoToast = useUndoToast();

  const [overview, setOverview] = useState<VehicleOverview | null>(null);
  const [srs, setSrs] = useState<ServiceRecord[]>([]);
  const [srTotal, setSrTotal] = useState(0);
  const [rems, setRems] = useState<Reminder[]>([]);
  const [exps, setExps] = useState<Expense[]>([]);
  const [expTotal, setExpTotal] = useState(0);
  const [mls, setMls] = useState<MileageLog[]>([]);
  const [mlTotal, setMlTotal] = useState(0);
  const [docs, setDocs] = useState<Document[]>([]);
  const [uploading, setUploading] = useState(false);

  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [timelineTotal, setTimelineTotal] = useState(0);
  const [timelinePage, setTimelinePage] = useState(1);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [srPage, setSrPage] = useState(1);
  const [expPage, setExpPage] = useState(1);
  const [mlPage, setMlPage] = useState(1);
  const [srLoading, setSrLoading] = useState(false);
  const [expLoading, setExpLoading] = useState(false);
  const [mlLoading, setMlLoading] = useState(false);

  const [remFilter, setRemFilter] = useState<'all' | 'pending' | 'done'>('all');

  // Snooze modal state
  const [snoozeReminderId, setSnoozeReminderId] = useState<string | null>(null);
  const [snoozeDate, setSnoozeDate] = useState(() => { const d = new Date(); d.setDate(d.getDate() + 30); return d; });
  const [snoozeSaving, setSnoozeSaving] = useState(false);

  // Service record view modal
  const [viewSr, setViewSr] = useState<ServiceRecord | null>(null);

  // Upload document modal
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [uploadLabelText, setUploadLabelText] = useState('');
  const [pendingFile, setPendingFile] = useState<{ uri: string; name: string; mimeType: string } | null>(null);

  // In-app image viewer
  const [viewingImage, setViewingImage] = useState<string | null>(null);

  // Scroll position preservation
  const scrollRef = useRef<ScrollView>(null);
  const scrollYRef = useRef(0);

  // Drag-to-dismiss pan responders for bottom sheets
  const uploadPan = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => g.dy > 10 && g.dy > Math.abs(g.dx),
    onPanResponderRelease: (_, g) => { if (g.dy > 60 || g.vy > 0.5) setUploadModalVisible(false); },
  })).current;
  const srViewPan = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => g.dy > 10 && g.dy > Math.abs(g.dx),
    onPanResponderRelease: (_, g) => { if (g.dy > 60 || g.vy > 0.5) setViewSr(null); },
  })).current;
  const snoozePan = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => g.dy > 10 && g.dy > Math.abs(g.dx),
    onPanResponderRelease: (_, g) => { if (g.dy > 60 || g.vy > 0.5) setSnoozeReminderId(null); },
  })).current;

  const load = useCallback(async (silent = false) => {
    if (!id) return;
    if (!silent) setLoading(true);
    setError(null);
    try {
      const [ov, sr, rem, exp, ml, docList, tl] = await Promise.all([
        vehicleApi.overview(id),
        srApi.list(id, 1, PAGE_SIZE),
        remApi.list(id, 1, 50),
        expApi.list(id, 1, PAGE_SIZE),
        mlApi.list(id, 1, PAGE_SIZE),
        docsApi.list(id),
        vehicleApi.timeline(id, 1, PAGE_SIZE),
      ]);
      setOverview(ov);
      setSrs(sr.items); setSrTotal(sr.total); setSrPage(1);
      setRems(rem.items);
      setExps(exp.items); setExpTotal(exp.total); setExpPage(1);
      setMls(ml.items); setMlTotal(ml.total); setMlPage(1);
      setDocs(docList.items);
      setTimeline(tl.items); setTimelineTotal(tl.total); setTimelinePage(1);
    } catch (e: any) {
      setError(e.message ?? 'Failed to load');
    }
    setLoading(false);
    setRefreshing(false);
  }, [id]);

  useLayoutEffect(() => {
    if (overview) navigation.setOptions({ title: `${overview.make} ${overview.model}` });
  }, [navigation, overview]);

  useEffect(() => {
    load();
    const unsub = navigation.addListener('focus' as any, () => {
      const savedY = scrollYRef.current;
      load(true);
      if (savedY > 0) {
        requestAnimationFrame(() => {
          scrollRef.current?.scrollTo({ y: savedY, animated: false });
        });
      }
    });
    return unsub;
  }, [navigation, load]);

  if (loading) return <Spinner />;
  if (error || !overview) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACE[6] }}>
        <Text style={{ color: C.danger, fontSize: FONT.base }}>{error ?? 'Vehicle not found'}</Text>
      </View>
    );
  }

  // ── Load more ──────────────────────────────────────────────────────────────

  async function loadMoreSr() {
    if (srLoading || srs.length >= srTotal) return;
    setSrLoading(true);
    const next = srPage + 1;
    try { const r = await srApi.list(id!, next, PAGE_SIZE); setSrs((p) => [...p, ...r.items]); setSrPage(next); } catch {}
    setSrLoading(false);
  }

  async function loadMoreExp() {
    if (expLoading || exps.length >= expTotal) return;
    setExpLoading(true);
    const next = expPage + 1;
    try { const r = await expApi.list(id!, next, PAGE_SIZE); setExps((p) => [...p, ...r.items]); setExpPage(next); } catch {}
    setExpLoading(false);
  }

  async function loadMoreMl() {
    if (mlLoading || mls.length >= mlTotal) return;
    setMlLoading(true);
    const next = mlPage + 1;
    try { const r = await mlApi.list(id!, next, PAGE_SIZE); setMls((p) => [...p, ...r.items]); setMlPage(next); } catch {}
    setMlLoading(false);
  }

  async function loadMoreTimeline() {
    if (timelineLoading || timeline.length >= timelineTotal) return;
    setTimelineLoading(true);
    const next = timelinePage + 1;
    try { const r = await vehicleApi.timeline(id!, next, PAGE_SIZE); setTimeline((p) => [...p, ...r.items]); setTimelinePage(next); } catch {}
    setTimelineLoading(false);
  }

  // ── Actions ────────────────────────────────────────────────────────────────

  async function markDone(reminderId: string) {
    try {
      await remApi.update(reminderId, { status: 'DONE' });
      setRems((prev) => prev.map((r) => r.id === reminderId ? { ...r, status: 'DONE' } : r));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) { Alert.alert('Error', e.message); }
  }

  async function confirmSnooze() {
    if (!snoozeReminderId) return;
    setSnoozeSaving(true);
    try {
      const updated = await remApi.snooze(snoozeReminderId, snoozeDate.toISOString().split('T')[0]);
      setRems((prev) => prev.map((r) => r.id === snoozeReminderId ? updated : r));
      setSnoozeReminderId(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) { Alert.alert('Error', e.message); }
    setSnoozeSaving(false);
  }

  function onSrLongPress(sr: ServiceRecord) {
    Alert.alert(srLabel(sr, t), fmtShort(sr.date), [
      { text: t('common.edit'), onPress: () => router.push({
        pathname: '/(app)/vehicles/edit-service',
        params: { recordId: sr.id, vehicleId: id, types: JSON.stringify(sr.types), customType: sr.customType ?? '',
          mileage: String(sr.mileage), date: sr.date, shop: sr.shop ?? '', cost: sr.cost ?? '', description: sr.description ?? '',
          documentIds: JSON.stringify(sr.documents?.map((d) => d.id) ?? []) },
      })},
      { text: t('common.delete'), style: 'destructive', onPress: () => deleteSr(sr) },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  }

  function deleteSr(sr: ServiceRecord) {
    setSrs((p) => p.filter((s) => s.id !== sr.id));
    setSrTotal((t) => t - 1);
    srApi.delete(sr.id).catch(() => {});
    undoToast.show('Service record deleted', async () => {
      await srApi.undelete(sr.id).catch(() => {});
      load(true);
    });
  }

  function onExpLongPress(exp: Expense) {
    Alert.alert(t(`expenseCategory.${exp.category}`, exp.category), `${parseFloat(exp.amount).toLocaleString()} kr`, [
      { text: t('common.edit'), onPress: () => router.push({
        pathname: '/(app)/vehicles/edit-expense',
        params: {
          expenseId: exp.id, vehicleId: id, category: exp.category, amount: exp.amount, date: exp.date,
          description: exp.description ?? '', customCategory: exp.customCategory ?? '',
          litres: exp.litres ?? '', recurringMonths: exp.recurringMonths != null ? String(exp.recurringMonths) : '',
          documentIds: JSON.stringify(exp.documents?.map((d) => d.id) ?? []),
        },
      })},
      { text: t('common.delete'), style: 'destructive', onPress: () => deleteExp(exp) },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  }

  function deleteExp(exp: Expense) {
    setExps((p) => p.filter((e) => e.id !== exp.id));
    setExpTotal((t) => t - 1);
    expApi.delete(exp.id).catch(() => {});
    undoToast.show('Expense deleted', async () => {
      await expApi.undelete(exp.id).catch(() => {});
      load(true);
    });
  }

  function onMlLongPress(ml: MileageLog) {
    Alert.alert(`${ml.mileage.toLocaleString()} km`, fmtShort(ml.date), [
      { text: t('common.delete'), style: 'destructive', onPress: () => deleteMl(ml) },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  }

  function deleteMl(ml: MileageLog) {
    setMls((p) => p.filter((m) => m.id !== ml.id));
    setMlTotal((t) => t - 1);
    mlApi.delete(ml.id).catch(() => {});
    undoToast.show('Mileage entry deleted', async () => {
      await mlApi.undelete(ml.id).catch(() => {});
      load(true);
    });
  }

  function onRemLongPress(r: Reminder) {
    const isDone = r.status === 'DONE';
    Alert.alert(t(`reminderType.${r.type}`, r.type), r.dueDate ? fmtDate(r.dueDate) : '', [
      { text: t('common.edit'), onPress: () => router.push({
        pathname: '/(app)/vehicles/edit-reminder',
        params: { reminderId: r.id, type: r.type, dueDate: r.dueDate ?? '',
          dueMileage: r.dueMileage != null ? String(r.dueMileage) : '',
          note: r.note ?? '', recurrenceMonths: r.recurrenceMonths != null ? String(r.recurrenceMonths) : '' },
      })},
      ...(!isDone ? [{ text: t('reminders.snooze'), onPress: () => { setSnoozeDate(() => { const d = new Date(); d.setDate(d.getDate() + 30); return d; }); setSnoozeReminderId(r.id); } }] : []),
      { text: t('common.delete'), style: 'destructive' as const, onPress: () => deleteReminder(r) },
      { text: t('common.cancel'), style: 'cancel' as const },
    ]);
  }

  function deleteReminder(r: Reminder) {
    setRems((p) => p.filter((rem) => rem.id !== r.id));
    remApi.delete(r.id).catch(() => {});
    undoToast.show('Reminder deleted', async () => {
      await remApi.undelete(r.id).catch(() => {});
      load(true);
    });
  }

  function onDocLongPress(doc: Document) {
    Alert.alert(doc.label || doc.id, fmtDate(doc.createdAt), [
      { text: t('documents.view'), onPress: () => openDoc(doc) },
      { text: t('common.delete'), style: 'destructive', onPress: () => deleteDoc(doc) },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  }

  async function openDoc(doc: Document) {
    try {
      const { url } = await docsApi.getLink(doc.id);
      const isImage = /\.(jpg|jpeg|png|webp|gif|heic)$/i.test(doc.label);
      if (isImage) {
        setViewingImage(url);
      } else {
        await WebBrowser.openBrowserAsync(url);
      }
    } catch (e: any) { Alert.alert('Error', e.message); }
  }

  function deleteDoc(doc: Document) {
    setDocs((p) => p.filter((d) => d.id !== doc.id));
    docsApi.delete(doc.id).catch(() => {});
    undoToast.show('Document deleted', async () => {
      await load(true);
    });
  }

  function promptUpload() {
    setUploadLabelText('');
    setPendingFile(null);
    setUploadModalVisible(true);
  }

  async function pickFromPhotos() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permission denied', 'Photo library access is required.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images', quality: 0.85, allowsMultipleSelection: false });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    const name = asset.fileName ?? `photo_${Date.now()}.jpg`;
    setPendingFile({ uri: asset.uri, name, mimeType: asset.mimeType ?? 'image/jpeg' });
    setUploadLabelText((prev) => prev || name.replace(/\.[^.]+$/, ''));
  }

  async function pickFromCamera() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permission denied', 'Camera access is required.'); return; }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: 'images', quality: 0.85 });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    const name = asset.fileName ?? `photo_${Date.now()}.jpg`;
    setPendingFile({ uri: asset.uri, name, mimeType: asset.mimeType ?? 'image/jpeg' });
    setUploadLabelText((prev) => prev || name.replace(/\.[^.]+$/, ''));
  }

  async function pickFromFiles() {
    const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setPendingFile({ uri: asset.uri, name: asset.name, mimeType: asset.mimeType ?? 'application/octet-stream' });
    setUploadLabelText((prev) => prev || asset.name.replace(/\.[^.]+$/, ''));
  }

  async function confirmUpload() {
    if (!pendingFile || !id) return;
    setUploadModalVisible(false);
    setUploading(true);
    try {
      const doc = await docsApi.upload(id, {
        uri: pendingFile.uri,
        name: pendingFile.name,
        type: pendingFile.mimeType,
        label: uploadLabelText.trim() || pendingFile.name,
        docType: 'OTHER',
      });
      setDocs((p) => [doc, ...p]);
    } catch (e: any) {
      Alert.alert('Upload failed', e.message);
    } finally {
      setUploading(false);
      setPendingFile(null);
    }
  }

  const isArchived = !!overview.archivedAt;
  const accent = accentFromColor(overview.color);
  const push = (name: string) => router.push({ pathname: name as any, params: { vehicleId: id } });

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        ref={scrollRef}
        style={{ backgroundColor: C.bg }}
        contentContainerStyle={{ paddingBottom: SPACE[8] }}
        onScroll={(e) => { scrollYRef.current = e.nativeEvent.contentOffset.y; }}
        scrollEventThrottle={100}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} tintColor={C.accent} />}
      >
        {/* Hero */}
        <View style={{ backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border }}>
          <View style={{ height: 4, backgroundColor: accent }} />
          <View style={{ padding: SPACE[5] }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: FONT['2xl'], fontWeight: '800', color: C.text, letterSpacing: -0.5 }}>
                  {overview.make} {overview.model}
                </Text>
                <Text style={{ fontSize: FONT.base, color: C.muted, marginTop: 2, fontWeight: '500' }}>{overview.year}</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: SPACE[2], alignItems: 'center' }}>
                {isArchived && <Badge label={t('vehicles.archivedTitle')} variant="warning" />}
                <Pressable
                  onPress={() => router.push({
                    pathname: '/(app)/vehicles/edit-vehicle',
                    params: {
                      vehicleId: id!, make: overview.make, model: overview.model,
                      year: String(overview.year), licensePlate: overview.licensePlate,
                      fuelType: overview.fuelType, color: overview.color ?? '',
                      vin: overview.vin ?? '',
                    },
                  })}
                  style={({ pressed }) => [s.editBtn, { borderColor: C.borderStrong, opacity: pressed ? 0.7 : 1 }]}
                  hitSlop={8}
                >
                  <Ionicons name="pencil-outline" size={14} color={C.muted} />
                </Pressable>
              </View>
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE[2], marginTop: SPACE[3] }}>
              <View style={[s.plateBadge, { borderColor: C.borderStrong }]}>
                <Text style={{ fontSize: FONT.sm, color: C.text, fontWeight: '700', fontFamily: 'Courier', letterSpacing: 1.5 }}>
                  {overview.licensePlate}
                </Text>
              </View>
              {overview.vin && (
                <View style={[s.plateBadge, { borderColor: C.borderSubtle }]}>
                  <Text style={{ fontSize: FONT.xs, color: C.muted, fontFamily: 'Courier' }}>{overview.vin}</Text>
                </View>
              )}
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE[2], marginTop: SPACE[3] }}>
              <View style={[s.chip, { backgroundColor: `${FUEL_COLORS[overview.fuelType] ?? accent}18` }]}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: FUEL_COLORS[overview.fuelType] ?? accent }} />
                <Text style={{ fontSize: FONT.xs, color: FUEL_COLORS[overview.fuelType] ?? accent, fontWeight: '600' }}>
                  {t(`fuelType.${overview.fuelType}`, overview.fuelType)}
                </Text>
              </View>
              {overview.latestMileage != null && (
                <View style={[s.chip, { backgroundColor: C.overlay }]}>
                  <Ionicons name="speedometer-outline" size={12} color={C.muted} />
                  <Text style={{ fontSize: FONT.xs, color: C.muted, fontWeight: '500' }}>
                    {overview.latestMileage.toLocaleString()} km
                  </Text>
                </View>
              )}
              {overview.estimatedMileage != null && overview.estimatedMileage !== overview.latestMileage && (
                <View style={[s.chip, { backgroundColor: C.overlay }]}>
                  <Ionicons name="analytics-outline" size={12} color={C.mutedLight} />
                  <Text style={{ fontSize: FONT.xs, color: C.mutedLight, fontWeight: '500' }}>
                    ~{overview.estimatedMileage.toLocaleString()} km {t('vehicles.estAbbrev')}
                  </Text>
                </View>
              )}
            </View>
          </View>

        </View>

        {/* Quick actions + counts */}
        <View style={[s.actionsGrid, { backgroundColor: C.surfaceRaised, borderBottomWidth: 1, borderBottomColor: C.border }]}>
          <ActionBtn C={C} icon="construct-outline" label={t('serviceRecords.add')} onPress={() => push('/(app)/vehicles/add-service')} accent={C.accent} count={overview.counts.serviceRecords} />
          <ActionBtn C={C} icon="notifications-outline" label={t('reminders.add')} onPress={() => push('/(app)/vehicles/add-reminder')} accent={C.warning} count={overview.counts.reminders} />
          <ActionBtn C={C} icon="speedometer-outline" label={t('mileage.add')} onPress={() => push('/(app)/vehicles/add-mileage')} accent={C.success} count={mlTotal} />
          <ActionBtn C={C} icon="card-outline" label={t('expenses.add')} onPress={() => push('/(app)/vehicles/add-expense')} accent={C.danger} count={overview.counts.expenses} />
        </View>

        <View style={{ paddingHorizontal: SPACE[4] }}>
          {/* Reminders */}
          <View style={s.section}>
            <SectionHeader
              title={t('reminders.title')}
              count={overview.counts.reminders}
              action={{ label: '+ Add', onPress: () => push('/(app)/vehicles/add-reminder') }}
            />
            {rems.length > 0 && (
              <View style={{ flexDirection: 'row', gap: SPACE[2], marginBottom: SPACE[3] }}>
                {(['all', 'pending', 'done'] as const).map((f) => (
                  <Pressable
                    key={f}
                    onPress={() => setRemFilter(f)}
                    style={[s.filterChip, {
                      backgroundColor: remFilter === f ? C.accent : C.surface,
                      borderColor: remFilter === f ? C.accent : C.borderStrong,
                    }]}
                  >
                    <Text style={{ fontSize: FONT.xs, fontWeight: '600', color: remFilter === f ? '#fff' : C.muted, textTransform: 'capitalize' }}>
                      {f}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
            {(() => {
              const filtered = rems.filter((r) =>
                remFilter === 'all' ? true :
                remFilter === 'done' ? r.status === 'DONE' :
                r.status !== 'DONE'
              );
              return filtered.length === 0 ? (
                <EmptyState icon="notifications-outline" title="No reminders"
                  message="Add reminders for upcoming services, insurance, or inspections."
                  action={{ label: 'Add Reminder', onPress: () => push('/(app)/vehicles/add-reminder') }} />
              ) : (
              <Card padding={0}>
                {filtered.map((r, i) => {
                  const overdue = r.dueDate ? new Date(r.dueDate) < new Date() : false;
                  const days = r.dueDate ? daysUntil(r.dueDate) : null;
                  const isDone = r.status === 'DONE';
                  const isSnoozed = r.status === 'SNOOZED';
                  return (
                    <View key={r.id} style={{
                      borderTopWidth: i === 0 ? 0 : StyleSheet.hairlineWidth,
                      borderTopColor: C.borderSubtle,
                      backgroundColor: overdue && !isDone ? C.dangerSubtle : 'transparent',
                    }}>
                      <Pressable
                        style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', padding: SPACE[4], backgroundColor: pressed ? C.overlay : 'transparent' }]}
                        onLongPress={() => onRemLongPress(r)}
                      >
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE[2], flexWrap: 'wrap' }}>
                            <Text style={{ fontSize: FONT.base, color: isDone ? C.muted : C.text, fontWeight: '600', textDecorationLine: isDone ? 'line-through' : 'none' }}>
                              {t(`reminderType.${r.type}`, r.type)}
                            </Text>
                            {isDone && <Badge label={t('reminders.doneStatus')} variant="success" />}
                            {isSnoozed && <Badge label={t('reminders.snoozed')} variant="info" />}
                            {overdue && !isDone && <Badge label={t('reminders.overdue')} variant="danger" />}
                            {!overdue && !isDone && days === 0 && <Badge label={t('reminders.today')} variant="danger" />}
                            {!overdue && !isDone && days !== null && days > 0 && days <= 7 && (
                              <Badge label={`${days}d`} variant={days <= 3 ? 'warning' : 'default'} />
                            )}
                          </View>
                          <View style={{ flexDirection: 'row', gap: SPACE[3], marginTop: 4 }}>
                            {r.dueDate && <Text style={{ fontSize: FONT.sm, color: overdue && !isDone ? C.danger : C.muted }}>{fmtDate(r.dueDate)}</Text>}
                            {r.dueMileage != null && <Text style={{ fontSize: FONT.sm, color: C.muted }}>{r.dueMileage.toLocaleString()} km</Text>}
                            {r.recurrenceMonths && <Text style={{ fontSize: FONT.sm, color: C.muted }}>↻ {r.recurrenceMonths}mo</Text>}
                          </View>
                          {r.note && <Text style={{ fontSize: FONT.xs, color: C.mutedLight, marginTop: 2 }} numberOfLines={1}>{r.note}</Text>}
                        </View>
                        {!isDone && (
                          <Pressable onPress={() => markDone(r.id)} style={[s.doneBtn, { backgroundColor: overdue ? C.danger : C.success }]} hitSlop={8}>
                            <Ionicons name="checkmark" size={16} color="#fff" />
                          </Pressable>
                        )}
                      </Pressable>
                    </View>
                  );
                })}
              </Card>
              );
            })()}
          </View>

          {/* Service Records */}
          <View style={s.section}>
            <SectionHeader title={t('serviceRecords.title')} count={srTotal}
              action={{ label: '+ Log', onPress: () => push('/(app)/vehicles/add-service') }} />
            {srs.length === 0 ? (
              <EmptyState icon="construct-outline" title={t('serviceRecords.empty')}
                message={t('serviceRecords.empty')}
                action={{ label: t('serviceRecords.add'), onPress: () => push('/(app)/vehicles/add-service') }} />
            ) : (
              <Card padding={0}>
                {srs.map((sr, i) => (
                  <Pressable
                    key={sr.id}
                    style={({ pressed }) => [{ padding: SPACE[4], borderTopWidth: i === 0 ? 0 : StyleSheet.hairlineWidth, borderTopColor: C.borderSubtle, backgroundColor: pressed ? C.overlay : 'transparent' }]}
                    onPress={() => setViewSr(sr)}
                    onLongPress={() => onSrLongPress(sr)}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                      <View style={[s.recordIcon, { backgroundColor: C.accentSubtle }]}>
                        <Ionicons name="construct-outline" size={14} color={C.accent} />
                      </View>
                      <View style={{ flex: 1, marginLeft: SPACE[3], marginRight: SPACE[3] }}>
                        <Text style={{ fontSize: FONT.base, color: C.text, fontWeight: '600' }}>{srLabel(sr, t)}</Text>
                        {sr.shop && <Text style={{ fontSize: FONT.sm, color: C.muted, marginTop: 1 }}>{sr.shop}</Text>}
                        {sr.description && <Text style={{ fontSize: FONT.xs, color: C.mutedLight, marginTop: 1 }} numberOfLines={1}>{sr.description}</Text>}
                        {sr.documents && sr.documents.length > 0 && (
                          <View style={{ flexDirection: 'row', gap: SPACE[1], marginTop: SPACE[1], flexWrap: 'wrap' }}>
                            {sr.documents.map((doc) => (
                              <View key={doc.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: C.accentSubtle, borderRadius: RADIUS.sm, paddingHorizontal: 5, paddingVertical: 2 }}>
                                <Ionicons name="document-outline" size={10} color={C.accent} />
                                <Text style={{ fontSize: 10, color: C.accent }} numberOfLines={1}>{doc.label}</Text>
                              </View>
                            ))}
                          </View>
                        )}
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={{ fontSize: FONT.xs, color: C.muted }}>{fmtShort(sr.date)}</Text>
                        <Text style={{ fontSize: FONT.xs, color: C.mutedLight, marginTop: 1 }}>{sr.mileage.toLocaleString()} km</Text>
                        {sr.cost && <Text style={{ fontSize: FONT.sm, color: C.text, marginTop: 2, fontWeight: '700' }}>{parseFloat(sr.cost).toLocaleString()} kr</Text>}
                      </View>
                    </View>
                  </Pressable>
                ))}
                {srs.length < srTotal && (
                  <Pressable style={({ pressed }) => [s.loadMoreBtn, { borderTopColor: C.borderSubtle, opacity: pressed ? 0.6 : 1 }]} onPress={loadMoreSr} disabled={srLoading}>
                    <Text style={{ fontSize: FONT.sm, color: C.accent, fontWeight: '600' }}>
                      {srLoading ? t('common.loading') : `${t('common.loadMore')} (${t('vehicles.remaining', { count: srTotal - srs.length })})`}
                    </Text>
                  </Pressable>
                )}
              </Card>
            )}
          </View>

          {/* Expenses */}
          <View style={s.section}>
            <SectionHeader title={t('expenses.title')} count={expTotal}
              action={{ label: '+ Log', onPress: () => push('/(app)/vehicles/add-expense') }} />
            {exps.length === 0 ? (
              <EmptyState icon="card-outline" title={t('expenses.empty')}
                message={t('expenses.empty')}
                action={{ label: t('expenses.add'), onPress: () => push('/(app)/vehicles/add-expense') }} />
            ) : (
              <Card padding={0}>
                {exps.map((exp, i) => (
                  <Pressable
                    key={exp.id}
                    style={({ pressed }) => [{ padding: SPACE[4], borderTopWidth: i === 0 ? 0 : StyleSheet.hairlineWidth, borderTopColor: C.borderSubtle, backgroundColor: pressed ? C.overlay : 'transparent' }]}
                    onLongPress={() => onExpLongPress(exp)}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View style={[s.recordIcon, { backgroundColor: C.dangerBg }]}>
                        <Ionicons name="card-outline" size={14} color={C.danger} />
                      </View>
                      <View style={{ flex: 1, marginLeft: SPACE[3], marginRight: SPACE[3] }}>
                        <Text style={{ fontSize: FONT.base, color: C.text, fontWeight: '600' }}>{t(`expenseCategory.${exp.category}`, exp.category)}</Text>
                        {exp.description && <Text style={{ fontSize: FONT.xs, color: C.mutedLight, marginTop: 1 }} numberOfLines={1}>{exp.description}</Text>}
                        {exp.documents && exp.documents.length > 0 && (
                          <View style={{ flexDirection: 'row', gap: SPACE[1], marginTop: SPACE[1], flexWrap: 'wrap' }}>
                            {exp.documents.map((doc) => (
                              <View key={doc.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: C.dangerBg, borderRadius: RADIUS.sm, paddingHorizontal: 5, paddingVertical: 2 }}>
                                <Ionicons name="document-outline" size={10} color={C.danger} />
                                <Text style={{ fontSize: 10, color: C.danger }} numberOfLines={1}>{doc.label}</Text>
                              </View>
                            ))}
                          </View>
                        )}
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={{ fontSize: FONT.base, color: C.text, fontWeight: '800' }}>{parseFloat(exp.amount).toLocaleString()} kr</Text>
                        <Text style={{ fontSize: FONT.xs, color: C.muted, marginTop: 1 }}>{fmtShort(exp.date)}</Text>
                      </View>
                    </View>
                  </Pressable>
                ))}
                {exps.length < expTotal && (
                  <Pressable style={({ pressed }) => [s.loadMoreBtn, { borderTopColor: C.borderSubtle, opacity: pressed ? 0.6 : 1 }]} onPress={loadMoreExp} disabled={expLoading}>
                    <Text style={{ fontSize: FONT.sm, color: C.accent, fontWeight: '600' }}>
                      {expLoading ? t('common.loading') : `${t('common.loadMore')} (${t('vehicles.remaining', { count: expTotal - exps.length })})`}
                    </Text>
                  </Pressable>
                )}
              </Card>
            )}
          </View>


          {/* Documents */}
          <View style={s.section}>
            <SectionHeader
              title={t('documents.title')}
              count={docs.length}
              action={{ label: uploading ? t('common.loading') : '+ Upload', onPress: promptUpload }}
            />
            {docs.length === 0 ? (
              <EmptyState icon="document-outline" title={t('documents.empty')}
                message={t('documents.empty')}
                action={{ label: t('documents.upload'), onPress: promptUpload }} />
            ) : (
              <Card padding={0}>
                {docs.map((doc, i) => {
                  const isImage = doc.label.match(/\.(jpg|jpeg|png|gif|heic|webp)$/i) || doc.fileUrl?.match(/image/);
                  const isPdf = doc.label.match(/\.pdf$/i);
                  const iconName = isPdf ? 'document-text-outline' : isImage ? 'image-outline' : 'document-attach-outline';
                  const sizeKb = doc.fileSizeBytes != null ? (doc.fileSizeBytes / 1024).toFixed(0) : null;
                  return (
                    <Pressable
                      key={doc.id}
                      style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', padding: SPACE[4], borderTopWidth: i === 0 ? 0 : StyleSheet.hairlineWidth, borderTopColor: C.borderSubtle, backgroundColor: pressed ? C.overlay : 'transparent' }]}
                      onPress={() => openDoc(doc)}
                      onLongPress={() => onDocLongPress(doc)}
                    >
                      <View style={[s.recordIcon, { backgroundColor: C.accentSubtle }]}>
                        <Ionicons name={iconName} size={16} color={C.accent} />
                      </View>
                      <View style={{ flex: 1, marginLeft: SPACE[3] }}>
                        <Text style={{ fontSize: FONT.base, color: C.text, fontWeight: '600' }} numberOfLines={1}>
                          {doc.label || 'Document'}
                        </Text>
                        <Text style={{ fontSize: FONT.xs, color: C.mutedLight, marginTop: 1 }}>
                          {fmtDate(doc.createdAt)}{sizeKb ? ` · ${sizeKb} KB` : ''}
                        </Text>
                      </View>
                      <Ionicons name="open-outline" size={16} color={C.mutedLight} />
                    </Pressable>
                  );
                })}
              </Card>
            )}
          </View>

          {/* View all logs */}
          <View style={{ marginTop: SPACE[5] }}>
            <Pressable
              style={({ pressed }) => [{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                gap: SPACE[2], paddingVertical: SPACE[4],
                borderWidth: 1, borderColor: C.borderStrong, borderRadius: RADIUS.lg,
                backgroundColor: C.surface, opacity: pressed ? 0.7 : 1,
              }]}
              onPress={() => router.push({ pathname: '/(app)/vehicles/logs' as any, params: { vehicleId: id } })}
            >
              <Ionicons name="time-outline" size={18} color={C.accent} />
              <Text style={{ fontSize: FONT.base, color: C.accent, fontWeight: '600' }}>{t('vehicles.viewAllLogs')}</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      {/* Image Viewer */}
      <Modal visible={!!viewingImage} transparent animationType="fade" statusBarTranslucent>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' }} onPress={() => setViewingImage(null)}>
          {viewingImage ? (
            <Image source={{ uri: viewingImage }} style={{ width: '100%', height: '80%' }} resizeMode="contain" />
          ) : null}
          <Pressable
            style={{ position: 'absolute', top: 56, right: 20, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: RADIUS.full, padding: SPACE[2] }}
            onPress={() => setViewingImage(null)}
          >
            <Ionicons name="close" size={24} color="#fff" />
          </Pressable>
        </Pressable>
      </Modal>

      {/* Upload Document Modal */}
      <Modal visible={uploadModalVisible} transparent animationType="slide">
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' }} onPress={() => setUploadModalVisible(false)} />
          <View {...uploadPan.panHandlers} style={{ backgroundColor: C.surface, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, padding: SPACE[5], paddingBottom: 36 }}>
          <View style={{ alignItems: 'center', marginBottom: SPACE[4] }}>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: C.borderStrong, marginBottom: SPACE[4] }} />
            <Text style={{ fontSize: FONT.lg, fontWeight: '700', color: C.text }}>{t('documents.upload')}</Text>
          </View>
          <FormField label={t('documents.nameLabel')}>
            <TextInput
              style={inputStyle(C)}
              value={uploadLabelText}
              onChangeText={setUploadLabelText}
              placeholder="e.g. Insurance 2025"
              placeholderTextColor={C.mutedLight}
            />
          </FormField>
          <View style={{ flexDirection: 'row', gap: SPACE[2], marginTop: SPACE[3] }}>
            {([
              { label: 'Photos', icon: 'image-outline', onPress: pickFromPhotos },
              { label: 'Camera', icon: 'camera-outline', onPress: pickFromCamera },
              { label: 'Files', icon: 'document-outline', onPress: pickFromFiles },
            ] as const).map(({ label, icon, onPress }) => (
              <Pressable
                key={label}
                onPress={onPress}
                style={({ pressed }) => [{
                  flex: 1, borderRadius: RADIUS.md, borderWidth: 1,
                  borderColor: C.borderStrong, paddingVertical: SPACE[3],
                  alignItems: 'center', gap: 4,
                  opacity: pressed ? 0.7 : 1,
                  backgroundColor: C.bg,
                }]}
              >
                <Ionicons name={icon} size={22} color={C.accent} />
                <Text style={{ fontSize: FONT.xs, color: C.muted, fontWeight: '600' }}>{label}</Text>
              </Pressable>
            ))}
          </View>
          {pendingFile ? (
            <Pressable
              style={{ flexDirection: 'row', alignItems: 'center', marginTop: SPACE[3], padding: SPACE[3], backgroundColor: C.accentSubtle, borderRadius: RADIUS.md }}
              onPress={() => setPendingFile(null)}
            >
              <Ionicons name="checkmark-circle" size={16} color={C.accent} />
              <Text style={{ flex: 1, marginLeft: SPACE[2], fontSize: FONT.sm, color: C.text }} numberOfLines={1}>{pendingFile.name}</Text>
              <Ionicons name="close" size={16} color={C.muted} />
            </Pressable>
          ) : null}
          <View style={{ flexDirection: 'row', gap: SPACE[3], marginTop: SPACE[5] }}>
            <Pressable
              style={({ pressed }) => [{ flex: 1, borderRadius: RADIUS.md, borderWidth: 1, borderColor: C.borderStrong, padding: 14, alignItems: 'center', opacity: pressed ? 0.7 : 1 }]}
              onPress={() => setUploadModalVisible(false)}
            >
              <Text style={{ fontSize: FONT.base, color: C.muted, fontWeight: '600' }}>{t('common.cancel')}</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [{ flex: 1, borderRadius: RADIUS.md, backgroundColor: C.accent, padding: 14, alignItems: 'center', opacity: (pressed || !pendingFile || uploading) ? 0.5 : 1 }]}
              onPress={confirmUpload}
              disabled={!pendingFile || uploading}
            >
              <Text style={{ fontSize: FONT.base, color: '#fff', fontWeight: '700' }}>{uploading ? t('common.loading') : t('documents.upload')}</Text>
            </Pressable>
          </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Service Record View Modal */}
      <Modal visible={!!viewSr} transparent animationType="slide">
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' }} onPress={() => setViewSr(null)} />
        {viewSr && (
          <View {...srViewPan.panHandlers} style={{ backgroundColor: C.surface, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, padding: SPACE[5], paddingBottom: 36 }}>
            <View style={{ alignItems: 'center', marginBottom: SPACE[4] }}>
              <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: C.borderStrong, marginBottom: SPACE[4] }} />
              <View style={[s.recordIcon, { backgroundColor: C.accentSubtle, marginBottom: SPACE[3] }]}>
                <Ionicons name="construct-outline" size={18} color={C.accent} />
              </View>
              <Text style={{ fontSize: FONT.xl, fontWeight: '700', color: C.text }}>{srLabel(viewSr, t)}</Text>
              <Text style={{ fontSize: FONT.sm, color: C.muted, marginTop: 4 }}>{fmtDate(viewSr.date)}</Text>
            </View>
            <View style={{ gap: SPACE[3], borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.borderSubtle, paddingTop: SPACE[4] }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: FONT.sm, color: C.muted, fontWeight: '500' }}>{t('serviceRecords.mileageLabel')}</Text>
                <Text style={{ fontSize: FONT.sm, color: C.text, fontWeight: '600' }}>{viewSr.mileage.toLocaleString()} km</Text>
              </View>
              {viewSr.shop ? (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: FONT.sm, color: C.muted, fontWeight: '500' }}>{t('serviceRecords.shopLabel')}</Text>
                  <Text style={{ fontSize: FONT.sm, color: C.text, fontWeight: '600' }}>{viewSr.shop}</Text>
                </View>
              ) : null}
              {viewSr.cost ? (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: FONT.sm, color: C.muted, fontWeight: '500' }}>{t('serviceRecords.costLabel')}</Text>
                  <Text style={{ fontSize: FONT.sm, color: C.text, fontWeight: '600' }}>{parseFloat(viewSr.cost).toLocaleString()} kr</Text>
                </View>
              ) : null}
              {viewSr.description ? (
                <View>
                  <Text style={{ fontSize: FONT.sm, color: C.muted, fontWeight: '500', marginBottom: 6 }}>{t('serviceRecords.notesLabel')}</Text>
                  <Text style={{ fontSize: FONT.sm, color: C.text, lineHeight: 20 }}>{viewSr.description}</Text>
                </View>
              ) : null}
              {viewSr.documents && viewSr.documents.length > 0 && (
                <View>
                  <Text style={{ fontSize: FONT.sm, color: C.muted, fontWeight: '500', marginBottom: 6 }}>{t('documents.title')}</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE[2] }}>
                    {viewSr.documents.map((doc) => (
                      <Pressable
                        key={doc.id}
                        onPress={() => openDoc(doc)}
                        style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: SPACE[1], backgroundColor: C.accentSubtle, borderRadius: RADIUS.md, paddingHorizontal: SPACE[2], paddingVertical: SPACE[1], opacity: pressed ? 0.7 : 1 }]}
                      >
                        <Ionicons name="document-outline" size={12} color={C.accent} />
                        <Text style={{ fontSize: FONT.xs, color: C.accent, maxWidth: 120 }} numberOfLines={1}>{doc.label}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}
            </View>
            <View style={{ flexDirection: 'row', gap: SPACE[3], marginTop: SPACE[5] }}>
              <Pressable
                style={({ pressed }) => [{ flex: 1, borderRadius: RADIUS.md, borderWidth: 1, borderColor: C.borderStrong, padding: 14, alignItems: 'center', opacity: pressed ? 0.7 : 1 }]}
                onPress={() => setViewSr(null)}
              >
                <Text style={{ fontSize: FONT.base, color: C.muted, fontWeight: '600' }}>{t('common.cancel')}</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [{ flex: 1, borderRadius: RADIUS.md, backgroundColor: C.accent, padding: 14, alignItems: 'center', opacity: pressed ? 0.7 : 1 }]}
                onPress={() => {
                  const sr = viewSr;
                  setViewSr(null);
                  router.push({
                    pathname: '/(app)/vehicles/edit-service',
                    params: { recordId: sr.id, vehicleId: id, types: JSON.stringify(sr.types), customType: sr.customType ?? '',
                      mileage: String(sr.mileage), date: sr.date, shop: sr.shop ?? '', cost: sr.cost ?? '', description: sr.description ?? '',
                      documentIds: JSON.stringify(sr.documents?.map((d) => d.id) ?? []) },
                  });
                }}
              >
                <Text style={{ fontSize: FONT.base, color: '#fff', fontWeight: '700' }}>{t('common.edit')}</Text>
              </Pressable>
            </View>
          </View>
        )}
      </Modal>

      {/* Snooze Modal */}
      <Modal visible={!!snoozeReminderId} transparent animationType="slide">
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' }} onPress={() => setSnoozeReminderId(null)} />
        <View {...snoozePan.panHandlers} style={{ backgroundColor: C.surface, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, padding: SPACE[5], paddingBottom: 36 }}>
          <View style={{ alignItems: 'center', marginBottom: SPACE[4] }}>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: C.borderStrong, marginBottom: SPACE[4] }} />
            <Text style={{ fontSize: FONT.lg, fontWeight: '700', color: C.text }}>{t('reminders.snoozeTitle')}</Text>
            <Text style={{ fontSize: FONT.sm, color: C.muted, marginTop: 4 }}>{t('reminders.snoozeDate')}</Text>
          </View>
          <DateField value={snoozeDate} onChange={setSnoozeDate} minimumDate={new Date()} />
          <View style={{ flexDirection: 'row', gap: SPACE[3], marginTop: SPACE[5] }}>
            <Pressable
              style={({ pressed }) => [{ flex: 1, borderRadius: RADIUS.md, borderWidth: 1, borderColor: C.borderStrong, padding: 14, alignItems: 'center', opacity: pressed ? 0.7 : 1 }]}
              onPress={() => setSnoozeReminderId(null)}
            >
              <Text style={{ fontSize: FONT.base, color: C.muted, fontWeight: '600' }}>{t('common.cancel')}</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [{ flex: 1, borderRadius: RADIUS.md, backgroundColor: C.accent, padding: 14, alignItems: 'center', opacity: (pressed || snoozeSaving) ? 0.7 : 1 }]}
              onPress={confirmSnooze}
              disabled={snoozeSaving}
            >
              <Text style={{ fontSize: FONT.base, color: '#fff', fontWeight: '700' }}>
                {snoozeSaving ? t('common.loading') : t('reminders.snooze')}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Undo toast */}
      <UndoToastSlot toast={undoToast.toast} onDismiss={undoToast.dismiss} />
    </View>
  );
}

function StatPill({ C, icon, value, label }: { C: Colors; icon: any; value: number; label: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', paddingVertical: SPACE[3], gap: 3 }}>
      <Ionicons name={icon} size={15} color={C.mutedLight} />
      <Text style={{ fontSize: FONT.lg, fontWeight: '800', color: C.text }}>{value}</Text>
      <Text style={{ fontSize: 10, color: C.mutedLight, fontWeight: '500' }}>{label}</Text>
    </View>
  );
}

function ActionBtn({ C, icon, label, onPress, accent, count }: { C: Colors; icon: any; label: string; onPress: () => void; accent: string; count?: number }) {
  return (
    <Pressable style={({ pressed }) => [s.actionBtn, { opacity: pressed ? 0.7 : 1 }]} onPress={onPress}>
      <View style={[s.actionIcon, { backgroundColor: `${accent}15` }]}>
        <Ionicons name={icon} size={20} color={accent} />
      </View>
      {count !== undefined && (
        <Text style={{ fontSize: FONT.base, color: C.text, fontWeight: '700', marginTop: 3, textAlign: 'center' }}>{count}</Text>
      )}
      <Text style={{ fontSize: FONT.xs, color: C.muted, fontWeight: '600', marginTop: count !== undefined ? 1 : 4, textAlign: 'center' }}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  section: { marginTop: SPACE[5] },
  statsRow: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth },
  actionsGrid: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: SPACE[4], paddingHorizontal: SPACE[2] },
  plateBadge: { borderWidth: 1, borderRadius: RADIUS.sm, paddingHorizontal: 10, paddingVertical: 5 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.full },
  doneBtn: { width: 34, height: 34, borderRadius: RADIUS.full, alignItems: 'center', justifyContent: 'center' },
  archiveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACE[2], paddingVertical: SPACE[3], marginBottom: SPACE[4] },
  actionBtn: { flex: 1, alignItems: 'center' },
  actionIcon: { width: 50, height: 50, borderRadius: RADIUS.lg, alignItems: 'center', justifyContent: 'center' },
  recordIcon: { width: 32, height: 32, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center' },
  loadMoreBtn: { borderTopWidth: StyleSheet.hairlineWidth, paddingVertical: SPACE[3], alignItems: 'center' },
  editBtn: { width: 30, height: 30, borderRadius: RADIUS.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  filterChip: { paddingHorizontal: SPACE[3], paddingVertical: 5, borderRadius: RADIUS.full, borderWidth: 1 },
});
