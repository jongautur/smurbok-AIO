import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, Pressable, Switch,
  StyleSheet, Alert, TextInput, Modal, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { auth as api, storage as storageApi, authExtras, type StorageInfo } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Divider, Spinner } from '@/components/Ui';
import { useTheme, type ThemePref, FONT, SPACE, RADIUS } from '@/theme';

function fmtBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ProfileScreen() {
  const { C, pref: themePref, setTheme } = useTheme();
  const { user, setUser, logout } = useAuth();
  const { t } = useTranslation();

  const THEME_OPTIONS: { value: ThemePref; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
    { value: 'light', label: t('theme.light'), icon: 'sunny-outline' },
    { value: 'dark', label: t('theme.dark'), icon: 'moon-outline' },
    { value: 'system', label: t('theme.system'), icon: 'phone-portrait-outline' },
  ];
  const [notifSaving, setNotifSaving] = useState(false);
  const [langSaving, setLangSaving] = useState(false);

  const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null);
  const [storageLoading, setStorageLoading] = useState(true);

  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    storageApi.info()
      .then(setStorageInfo)
      .catch(() => {})
      .finally(() => setStorageLoading(false));
  }, []);

  if (!user) return <Spinner />;

  const initials = (user.displayName ?? user.email)
    .split(' ')
    .map((w: string) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const memberSince = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
    : null;

  async function toggleNotifications() {
    setNotifSaving(true);
    try {
      const updated = await api.updateNotifications(!user!.emailNotifications);
      setUser({ ...user!, emailNotifications: updated.emailNotifications });
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setNotifSaving(false);
    }
  }

  async function switchLanguage(lang: 'is' | 'en') {
    if (lang === (user!.language ?? 'en')) return;
    setLangSaving(true);
    try {
      const updated = await api.updateLanguage(lang);
      setUser({ ...user!, language: updated.language });
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLangSaving(false);
    }
  }

  function confirmLogout() {
    Alert.alert(t('profile.signOutTitle'), t('profile.signOutConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('profile.signOut'), style: 'destructive', onPress: logout },
    ]);
  }

  function handleExport() {
    const url = authExtras.exportData();
    Linking.openURL(url).catch(() => Alert.alert('Error', 'Could not open export URL.'));
  }

  async function handleDeleteAccount() {
    if (deleteConfirmText.trim().toLowerCase() !== 'delete') return;
    setDeleting(true);
    try {
      await authExtras.deleteAccount();
      logout();
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Failed to delete account');
    } finally {
      setDeleting(false);
      setDeleteModalVisible(false);
    }
  }

  const storageBarColor = storageInfo
    ? storageInfo.files.percent > 90 ? C.danger
    : storageInfo.files.percent > 70 ? C.warning
    : C.success
    : C.success;

  return (
    <ScrollView style={{ backgroundColor: C.bg }} contentContainerStyle={s.container}>
      {/* Profile card */}
      <View style={[s.profileCard, { backgroundColor: C.surface, borderColor: C.border }]}>
        <View style={[s.avatar, { backgroundColor: C.accentSubtle }]}>
          <Text style={{ fontSize: FONT.xl, fontWeight: '800', color: C.accent }}>
            {initials}
          </Text>
        </View>
        <Text style={{ fontSize: FONT.lg, fontWeight: '700', color: C.text, textAlign: 'center', marginTop: SPACE[3] }}>
          {user.displayName ?? user.email}
        </Text>
        {user.displayName && (
          <Text style={{ fontSize: FONT.sm, color: C.muted, textAlign: 'center', marginTop: 2 }}>{user.email}</Text>
        )}
        {memberSince && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: SPACE[2] }}>
            <Ionicons name="calendar-outline" size={12} color={C.mutedLight} />
            <Text style={{ fontSize: FONT.xs, color: C.mutedLight }}>
              {t('profile.memberSince', { date: memberSince })}
            </Text>
          </View>
        )}
      </View>

      {/* Appearance */}
      <SectionLabel label={t('profile.appearance')} C={C} />
      <View style={[s.card, { backgroundColor: C.surface, borderColor: C.border }]}>
        <View style={s.cardRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE[3], flex: 1 }}>
            <View style={[s.rowIcon, { backgroundColor: C.accentSubtle }]}>
              <Ionicons name="contrast-outline" size={16} color={C.accent} />
            </View>
            <Text style={{ fontSize: FONT.base, color: C.text, fontWeight: '500' }}>{t('profile.theme')}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: SPACE[2] }}>
            {THEME_OPTIONS.map((opt) => (
              <Pressable
                key={opt.value}
                onPress={() => setTheme(opt.value)}
                style={[s.segBtn, {
                  borderColor: themePref === opt.value ? C.accent : C.border,
                  backgroundColor: themePref === opt.value ? C.accent : C.surface,
                }]}
              >
                <Ionicons name={opt.icon} size={14} color={themePref === opt.value ? '#fff' : C.muted} />
                <Text style={{ fontSize: FONT.xs, color: themePref === opt.value ? '#fff' : C.muted, fontWeight: '600' }}>
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>

      {/* Preferences */}
      <SectionLabel label={t('profile.preferences')} C={C} />
      <View style={[s.card, { backgroundColor: C.surface, borderColor: C.border }]}>
        <View style={s.cardRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE[3], flex: 1 }}>
            <View style={[s.rowIcon, { backgroundColor: C.accentSubtle }]}>
              <Ionicons name="language-outline" size={16} color={C.accent} />
            </View>
            <View>
              <Text style={{ fontSize: FONT.base, color: C.text, fontWeight: '500' }}>{t('profile.language')}</Text>
              <Text style={{ fontSize: FONT.xs, color: C.muted, marginTop: 1 }}>
                {(user.language ?? 'en') === 'is' ? 'Íslenska' : 'English'}
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: SPACE[2] }}>
            {(['is', 'en'] as const).map((lang) => (
              <Pressable
                key={lang}
                disabled={langSaving}
                onPress={() => switchLanguage(lang)}
                style={[s.segBtn, {
                  borderColor: (user.language ?? 'en') === lang ? C.accent : C.border,
                  backgroundColor: (user.language ?? 'en') === lang ? C.accent : C.surface,
                }]}
              >
                <Text style={{ fontSize: FONT.sm, color: (user.language ?? 'en') === lang ? '#fff' : C.muted, fontWeight: '700' }}>
                  {lang === 'is' ? 'IS' : 'EN'}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <Divider />

        <View style={s.cardRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE[3], flex: 1 }}>
            <View style={[s.rowIcon, { backgroundColor: C.warningBg }]}>
              <Ionicons name="notifications-outline" size={16} color={C.warning} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: FONT.base, color: C.text, fontWeight: '500' }}>{t('profile.notifications')}</Text>
              <Text style={{ fontSize: FONT.xs, color: C.muted, marginTop: 1 }}>
                {t('profile.notificationsHint')}
              </Text>
            </View>
          </View>
          <Switch
            value={user.emailNotifications}
            onValueChange={toggleNotifications}
            disabled={notifSaving}
            trackColor={{ true: C.accent, false: C.border }}
            thumbColor="#fff"
          />
        </View>
      </View>

      {/* Storage */}
      <SectionLabel label={t('profile.storage')} C={C} />
      <View style={[s.card, { backgroundColor: C.surface, borderColor: C.border }]}>
        {storageLoading || !storageInfo ? (
          <View style={[s.cardRow, { justifyContent: 'center' }]}>
            <Text style={{ fontSize: FONT.sm, color: C.mutedLight }}>{t('common.loading')}</Text>
          </View>
        ) : (
          <View style={{ padding: SPACE[4], gap: SPACE[3] }}>
            {/* Usage bar */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={{ fontSize: FONT.sm, color: C.text, fontWeight: '600' }}>
                {fmtBytes(storageInfo.files.usedBytes)} {t('profile.storageUsed')}
              </Text>
              <Text style={{ fontSize: FONT.xs, color: C.muted }}>
                {t('profile.storageOf', { limit: storageInfo.files.limitMB })}
              </Text>
            </View>
            <View style={{ height: 8, borderRadius: 4, backgroundColor: C.overlay, overflow: 'hidden' }}>
              <View style={{
                height: '100%',
                width: `${Math.min(storageInfo.files.percent, 100)}%` as any,
                backgroundColor: storageBarColor,
                borderRadius: 4,
              }} />
            </View>
            <View style={{ flexDirection: 'row', gap: SPACE[4], marginTop: SPACE[1] }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <Ionicons name="document-outline" size={13} color={C.muted} />
                <Text style={{ fontSize: FONT.xs, color: C.muted }}>
                  {storageInfo.documents.count} / {storageInfo.documents.limit} docs
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <Ionicons name="car-outline" size={13} color={C.muted} />
                <Text style={{ fontSize: FONT.xs, color: C.muted }}>
                  {storageInfo.vehicles.count} / {storageInfo.vehicles.limit} vehicles
                </Text>
              </View>
            </View>
            {storageInfo.topDocuments.length > 0 && (
              <View style={{ gap: SPACE[2], marginTop: SPACE[1] }}>
                <Text style={{ fontSize: FONT.xs, color: C.mutedLight, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 }}>
                  {t('profile.topDocuments')}
                </Text>
                {storageInfo.topDocuments.map((doc) => (
                  <View key={doc.id} style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="document-attach-outline" size={13} color={C.mutedLight} style={{ marginRight: 6 }} />
                    <Text style={{ fontSize: FONT.xs, color: C.muted, flex: 1 }} numberOfLines={1}>
                      {doc.label} · {doc.vehicleLabel}
                    </Text>
                    <Text style={{ fontSize: FONT.xs, color: C.mutedLight, marginLeft: SPACE[2] }}>
                      {fmtBytes(doc.fileSizeBytes)}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </View>

      {/* Account */}
      <SectionLabel label={t('profile.account')} C={C} />
      <View style={[s.card, { backgroundColor: C.surface, borderColor: C.border }]}>
        <Pressable
          style={({ pressed }) => [s.cardRow, { opacity: pressed ? 0.6 : 1 }]}
          onPress={handleExport}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE[3] }}>
            <View style={[s.rowIcon, { backgroundColor: C.successBg }]}>
              <Ionicons name="download-outline" size={16} color={C.success} />
            </View>
            <View>
              <Text style={{ fontSize: FONT.base, color: C.text, fontWeight: '500' }}>{t('profile.exportData')}</Text>
              <Text style={{ fontSize: FONT.xs, color: C.muted, marginTop: 1 }}>{t('profile.exportDataHint')}</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={16} color={C.mutedLight} />
        </Pressable>

        <Divider />

        <Pressable
          style={({ pressed }) => [s.cardRow, { opacity: pressed ? 0.6 : 1 }]}
          onPress={confirmLogout}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE[3] }}>
            <View style={[s.rowIcon, { backgroundColor: C.dangerBg }]}>
              <Ionicons name="log-out-outline" size={16} color={C.danger} />
            </View>
            <Text style={{ fontSize: FONT.base, color: C.danger, fontWeight: '600' }}>{t('profile.signOut')}</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={C.mutedLight} />
        </Pressable>
      </View>

      {/* Danger zone */}
      <SectionLabel label={t('profile.dangerZone')} C={C} />
      <View style={[s.card, { backgroundColor: C.surface, borderColor: C.dangerSubtle }]}>
        <Pressable
          style={({ pressed }) => [s.cardRow, { opacity: pressed ? 0.6 : 1 }]}
          onPress={() => { setDeleteConfirmText(''); setDeleteModalVisible(true); }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE[3] }}>
            <View style={[s.rowIcon, { backgroundColor: C.dangerSubtle }]}>
              <Ionicons name="trash-outline" size={16} color={C.danger} />
            </View>
            <View>
              <Text style={{ fontSize: FONT.base, color: C.danger, fontWeight: '600' }}>{t('profile.deleteAccount')}</Text>
              <Text style={{ fontSize: FONT.xs, color: C.muted, marginTop: 1 }}>{t('profile.deleteAccountHint')}</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={16} color={C.mutedLight} />
        </Pressable>
      </View>

      {/* Delete account modal */}
      <Modal visible={deleteModalVisible} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: SPACE[5] }}>
          <View style={{ backgroundColor: C.surface, borderRadius: RADIUS.xl, padding: SPACE[5] }}>
            <View style={[s.rowIcon, { backgroundColor: C.dangerSubtle, marginBottom: SPACE[3] }]}>
              <Ionicons name="warning-outline" size={20} color={C.danger} />
            </View>
            <Text style={{ fontSize: FONT.lg, fontWeight: '700', color: C.text, marginBottom: SPACE[2] }}>{t('profile.deleteTitle')}</Text>
            <Text style={{ fontSize: FONT.sm, color: C.muted, marginBottom: SPACE[4], lineHeight: 20 }}>
              {t('profile.deleteBody')}
            </Text>
            <Text style={{ fontSize: FONT.sm, color: C.text, marginBottom: SPACE[2], fontWeight: '500' }}>
              {t('profile.deleteTypePrompt')} <Text style={{ color: C.danger, fontWeight: '700' }}>{t('profile.deleteTypeWord')}</Text> {t('profile.deleteTypeConfirm')}
            </Text>
            <TextInput
              style={[s.deleteInput, { backgroundColor: C.bg, borderColor: C.borderStrong, color: C.text }]}
              value={deleteConfirmText}
              onChangeText={setDeleteConfirmText}
              placeholder="delete"
              placeholderTextColor={C.mutedLight}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <View style={{ flexDirection: 'row', gap: SPACE[3], marginTop: SPACE[4] }}>
              <Pressable
                style={({ pressed }) => [{ flex: 1, borderRadius: RADIUS.md, borderWidth: 1, borderColor: C.borderStrong, padding: 14, alignItems: 'center', opacity: pressed ? 0.7 : 1 }]}
                onPress={() => setDeleteModalVisible(false)}
              >
                <Text style={{ fontSize: FONT.base, color: C.muted, fontWeight: '600' }}>{t('common.cancel')}</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [{
                  flex: 1, borderRadius: RADIUS.md, backgroundColor: C.danger, padding: 14, alignItems: 'center',
                  opacity: (pressed || deleting || deleteConfirmText.trim().toLowerCase() !== 'delete') ? 0.5 : 1,
                }]}
                onPress={handleDeleteAccount}
                disabled={deleting || deleteConfirmText.trim().toLowerCase() !== 'delete'}
              >
                <Text style={{ fontSize: FONT.base, color: '#fff', fontWeight: '700' }}>
                  {deleting ? t('profile.deleting') : t('common.delete')}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function SectionLabel({ label, C }: { label: string; C: ReturnType<typeof useTheme>['C'] }) {
  return (
    <Text style={{ fontSize: FONT.xs, fontWeight: '700', color: C.muted, textTransform: 'uppercase', letterSpacing: 0.9, marginBottom: SPACE[2], marginTop: SPACE[1] }}>
      {label}
    </Text>
  );
}

const s = StyleSheet.create({
  container: { padding: SPACE[4], paddingBottom: SPACE[8] },
  profileCard: {
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    padding: SPACE[5],
    alignItems: 'center',
    marginBottom: SPACE[5],
  },
  avatar: {
    width: 72, height: 72, borderRadius: RADIUS.full,
    alignItems: 'center', justifyContent: 'center',
  },
  card: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: SPACE[4],
  },
  cardRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACE[4], paddingVertical: SPACE[4],
  },
  rowIcon: {
    width: 32, height: 32, borderRadius: RADIUS.md,
    alignItems: 'center', justifyContent: 'center',
  },
  segBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: SPACE[3], paddingVertical: 6,
    borderRadius: RADIUS.sm, borderWidth: 1,
  },
  deleteInput: {
    borderWidth: 1, borderRadius: RADIUS.md,
    paddingHorizontal: SPACE[4], paddingVertical: 12,
    fontSize: FONT.base,
  },
});
