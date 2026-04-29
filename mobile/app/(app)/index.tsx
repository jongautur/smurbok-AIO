import { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet,
  RefreshControl,
} from 'react-native';
import { useNavigation, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { dashboard as dashApi, type DashboardSummary } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Card, Skeleton, SectionHeader, Badge } from '@/components/Ui';
import { useTheme, FONT, SPACE, RADIUS } from '@/theme';

const FUEL_COLORS: Record<string, string> = {
  PETROL: '#f97316', DIESEL: '#64748b', ELECTRIC: '#22c55e',
  HYBRID: '#0ea5e9', PLUG_IN_HYBRID: '#6366f1', HYDROGEN: '#a855f7',
};

const SERVICE_ICONS: Record<string, React.ComponentProps<typeof Ionicons>['name']> = {
  OIL_CHANGE: 'water-outline',
  TIRE_ROTATION: 'sync-outline',
  TIRE_CHANGE: 'ellipse-outline',
  BRAKE_SERVICE: 'hand-left-outline',
  FILTER_CHANGE: 'funnel-outline',
  INSPECTION: 'search-outline',
  TRANSMISSION_SERVICE: 'settings-outline',
  COOLANT_FLUSH: 'thermometer-outline',
  BATTERY_REPLACEMENT: 'battery-charging-outline',
  WINDSHIELD: 'shield-outline',
  OTHER: 'construct-outline',
};

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

function vehicleAccent(v: DashboardSummary['vehicles'][0]): string {
  if (v.fuelType && FUEL_COLORS[v.fuelType]) return FUEL_COLORS[v.fuelType];
  return accentFromColor(v.color);
}

function daysUntil(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

export default function DashboardScreen() {
  const { C } = useTheme();
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const navigation = useNavigation();
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      setData(await dashApi.getSummary());
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    load();
    const unsub = navigation.addListener('focus' as any, () => load(true));
    return unsub;
  }, [navigation, load]);

  const locale = i18n.language === 'is' ? 'is-IS' : 'en-GB';
  const name = user?.displayName?.split(' ')[0] ?? null;

  function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString(locale, { day: 'numeric', month: 'short' });
  }

  return (
    <ScrollView
      style={{ backgroundColor: C.bg }}
      contentContainerStyle={s.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} tintColor={C.accent} />}
    >
      {/* Greeting */}
      <View style={{ marginBottom: SPACE[6] }}>
        <Text style={{ fontSize: FONT['2xl'], fontWeight: '800', color: C.text, letterSpacing: -0.5 }}>
          {name ? t('dashboard.greeting', { name }) : t('dashboard.title')}
        </Text>
        {data && (
          <Text style={{ fontSize: FONT.sm, color: C.muted, marginTop: 4, fontWeight: '500' }}>
            {data.counts.vehicles} {t('dashboard.vehicles').toLowerCase()} · {data.counts.pendingReminders} {t('dashboard.pendingReminders').toLowerCase()}
          </Text>
        )}
      </View>

      {/* Stat grid 2×2 */}
      {loading ? (
        <View style={{ gap: SPACE[2], marginBottom: SPACE[5] }}>
          <View style={{ flexDirection: 'row', gap: SPACE[2] }}>
            {[0, 1].map((i) => (
              <View key={i} style={[s.stat, { backgroundColor: C.surface, borderColor: C.border }]}>
                <Skeleton height={28} width={32} borderRadius={6} style={{ alignSelf: 'center' }} />
                <Skeleton height={10} width={52} borderRadius={4} style={{ alignSelf: 'center', marginTop: 6 }} />
              </View>
            ))}
          </View>
          <View style={{ flexDirection: 'row', gap: SPACE[2] }}>
            {[0, 1].map((i) => (
              <View key={i} style={[s.stat, { backgroundColor: C.surface, borderColor: C.border }]}>
                <Skeleton height={28} width={32} borderRadius={6} style={{ alignSelf: 'center' }} />
                <Skeleton height={10} width={52} borderRadius={4} style={{ alignSelf: 'center', marginTop: 6 }} />
              </View>
            ))}
          </View>
        </View>
      ) : data && (
        <View style={{ gap: SPACE[2], marginBottom: SPACE[5] }}>
          <View style={{ flexDirection: 'row', gap: SPACE[2] }}>
            <StatBox C={C} icon="car-outline" value={data.counts.vehicles} label={t('dashboard.vehicles')} />
            <StatBox C={C} icon="construct-outline" value={data.counts.totalServiceRecords} label={t('dashboard.serviceRecords')} />
          </View>
          <View style={{ flexDirection: 'row', gap: SPACE[2] }}>
            <StatBox
              C={C}
              icon="notifications-outline"
              value={data.counts.pendingReminders}
              label={t('dashboard.pendingReminders')}
              alert={data.counts.pendingReminders > 0 ? 'warn' : undefined}
            />
            <StatBox
              C={C}
              icon="warning-outline"
              value={data.counts.overdueReminders}
              label={t('dashboard.overdue')}
              alert={data.counts.overdueReminders > 0 ? 'danger' : undefined}
            />
          </View>
        </View>
      )}

      {/* Vehicles strip */}
      {loading ? (
        <View style={s.section}>
          <SectionHeader title={t('dashboard.yourVehicles')} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -SPACE[4] }}>
            <View style={{ flexDirection: 'row', gap: SPACE[3], paddingHorizontal: SPACE[4] }}>
              {[0, 1, 2].map((i) => (
                <View key={i} style={{ backgroundColor: C.surface, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: C.border, padding: SPACE[4], width: 160 }}>
                  <Skeleton height={14} width="80%" />
                  <Skeleton height={11} width="50%" style={{ marginTop: 6 }} />
                  <Skeleton height={11} width="40%" style={{ marginTop: 4 }} />
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      ) : data && (
        <View style={s.section}>
          <SectionHeader
            title={t('dashboard.yourVehicles')}
            action={data.vehicles.length > 0 ? { label: t('common.seeAll'), onPress: () => router.push('/(app)/vehicles') } : undefined}
          />
          {data.vehicles.length === 0 ? (
            <Pressable
              style={({ pressed }) => [{
                borderWidth: 1.5, borderColor: C.borderStrong, borderStyle: 'dashed',
                borderRadius: RADIUS.lg, paddingVertical: SPACE[6], paddingHorizontal: SPACE[4],
                alignItems: 'center', gap: SPACE[2],
                opacity: pressed ? 0.7 : 1,
                backgroundColor: C.surface,
              }]}
              onPress={() => router.push('/(app)/vehicles')}
            >
              <View style={{ width: 48, height: 48, borderRadius: RADIUS.full, backgroundColor: C.accentSubtle, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="add" size={26} color={C.accent} />
              </View>
              <Text style={{ fontSize: FONT.base, fontWeight: '700', color: C.text }}>{t('vehicles.add')}</Text>
              <Text style={{ fontSize: FONT.sm, color: C.muted, textAlign: 'center' }}>{t('vehicles.emptyHint')}</Text>
            </Pressable>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -SPACE[4] }}>
              <View style={{ flexDirection: 'row', gap: SPACE[3], paddingHorizontal: SPACE[4] }}>
                {data.vehicles.map((v) => {
                  const accent = vehicleAccent(v);
                  return (
                    <Pressable
                      key={v.id}
                      style={({ pressed }) => [{
                        backgroundColor: C.surface,
                        borderRadius: RADIUS.lg,
                        borderWidth: 1,
                        borderColor: C.border,
                        borderTopWidth: 3,
                        borderTopColor: accent,
                        padding: SPACE[4],
                        minWidth: 160,
                        opacity: pressed ? 0.7 : 1,
                      }]}
                      onPress={() => router.push({ pathname: '/(app)/vehicles/[id]', params: { id: v.id } })}
                    >
                      <Text style={{ fontSize: FONT.xs, color: accent, fontWeight: '700', fontFamily: 'Courier', letterSpacing: 1 }} numberOfLines={1}>
                        {v.licensePlate}
                      </Text>
                      <Text style={{ fontSize: FONT.base, fontWeight: '700', color: C.text, marginTop: 4 }} numberOfLines={1}>
                        {v.make} {v.model}
                      </Text>
                      <Text style={{ fontSize: FONT.xs, color: C.muted, marginTop: 2 }}>{v.year}</Text>
                      {v.latestMileage != null && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: SPACE[2] }}>
                          <Ionicons name="speedometer-outline" size={12} color={C.mutedLight} />
                          <Text style={{ fontSize: FONT.xs, color: C.mutedLight }}>
                            {v.latestMileage.toLocaleString()} km
                          </Text>
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
          )}
        </View>
      )}

      {/* Upcoming reminders */}
      <View style={s.section}>
        <SectionHeader title={t('dashboard.upcomingReminders')} />
        {loading ? (
          <Card padding={0}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={{ padding: SPACE[4], borderTopWidth: i === 0 ? 0 : StyleSheet.hairlineWidth, borderTopColor: C.border, gap: SPACE[2] }}>
                <Skeleton height={14} width="55%" />
                <Skeleton height={11} width="35%" />
              </View>
            ))}
          </Card>
        ) : !data || data.upcomingReminders.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: SPACE[5] }}>
            <Ionicons name="checkmark-circle-outline" size={28} color={C.success} style={{ marginBottom: 6 }} />
            <Text style={{ fontSize: FONT.sm, color: C.mutedLight, textAlign: 'center' }}>
              {t('dashboard.noReminders')}
            </Text>
          </View>
        ) : (
          <Card padding={0}>
            {data.upcomingReminders.map((r, i) => {
              const days = r.dueDate ? daysUntil(r.dueDate) : null;
              const soon = days !== null && days > 3 && days <= 7;
              return (
                <Pressable
                  key={r.id}
                  style={({ pressed }) => [{
                    padding: SPACE[4],
                    borderTopWidth: i === 0 ? 0 : StyleSheet.hairlineWidth,
                    borderTopColor: C.borderSubtle,
                    backgroundColor: r.isOverdue ? C.dangerSubtle : pressed ? C.overlay : 'transparent',
                    flexDirection: 'row', alignItems: 'center',
                  }]}
                  onPress={() => router.push({ pathname: '/(app)/vehicles/[id]', params: { id: r.vehicleId } })}
                >
                  <View style={{ flex: 1, marginRight: SPACE[3] }}>
                    <Text style={{ fontSize: FONT.base, fontWeight: '600', color: C.text }}>
                      {t(`reminderType.${r.type}`, r.type)}
                    </Text>
                    <Text style={{ fontSize: FONT.sm, color: C.muted, marginTop: 2 }}>{r.vehicleName}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 4, marginRight: SPACE[2] }}>
                    {r.isOverdue ? (
                      <Badge label={t('reminders.overdue')} variant="danger" />
                    ) : days !== null && days === 0 ? (
                      <Badge label={t('reminders.today')} variant="danger" />
                    ) : days !== null && days <= 3 ? (
                      <Badge label={`${days}d`} variant="warning" />
                    ) : days !== null ? (
                      <Text style={{ fontSize: FONT.xs, color: soon ? C.warning : C.muted }}>{days}d</Text>
                    ) : null}
                    {r.dueDate && !r.isOverdue && <Text style={{ fontSize: FONT.xs, color: C.mutedLight }}>{fmtDate(r.dueDate)}</Text>}
                    {r.dueMileage != null && <Text style={{ fontSize: FONT.xs, color: C.mutedLight }}>{r.dueMileage.toLocaleString()} km</Text>}
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={C.mutedLight} />
                </Pressable>
              );
            })}
          </Card>
        )}
      </View>

      {/* Recent activity */}
      <View style={s.section}>
        <SectionHeader title={t('dashboard.recentActivity')} />
        {loading ? (
          <Card padding={0}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={{ padding: SPACE[4], borderTopWidth: i === 0 ? 0 : StyleSheet.hairlineWidth, borderTopColor: C.border, flexDirection: 'row', gap: SPACE[3] }}>
                <Skeleton width={36} height={36} borderRadius={RADIUS.md} />
                <View style={{ flex: 1, gap: SPACE[2] }}>
                  <Skeleton height={14} width="50%" />
                  <Skeleton height={11} width="35%" />
                </View>
              </View>
            ))}
          </Card>
        ) : !data || data.recentActivity.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: SPACE[5] }}>
            <Text style={{ fontSize: FONT.sm, color: C.mutedLight, textAlign: 'center' }}>
              {t('dashboard.noActivity')}
            </Text>
          </View>
        ) : (
          <Card padding={0}>
            {data.recentActivity.map((a, i) => {
              const icon = SERVICE_ICONS[a.type] ?? 'construct-outline';
              return (
                <Pressable
                  key={a.id}
                  style={({ pressed }) => [{
                    padding: SPACE[4],
                    borderTopWidth: i === 0 ? 0 : StyleSheet.hairlineWidth,
                    borderTopColor: C.borderSubtle,
                    backgroundColor: pressed ? C.overlay : 'transparent',
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: SPACE[3],
                  }]}
                  onPress={() => router.push({ pathname: '/(app)/vehicles/[id]', params: { id: a.vehicleId } })}
                >
                  <View style={[s.activityIcon, { backgroundColor: C.accentSubtle }]}>
                    <Ionicons name={icon} size={16} color={C.accent} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: FONT.base, fontWeight: '600', color: C.text }}>
                      {t(`serviceType.${a.type}`, a.type)}
                    </Text>
                    <Text style={{ fontSize: FONT.sm, color: C.muted, marginTop: 1 }}>{a.vehicleName}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', marginRight: SPACE[2] }}>
                    <Text style={{ fontSize: FONT.xs, color: C.muted }}>{fmtDate(a.date)}</Text>
                    <Text style={{ fontSize: FONT.xs, color: C.mutedLight, marginTop: 2 }}>{a.mileage.toLocaleString()} km</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={C.mutedLight} />
                </Pressable>
              );
            })}
          </Card>
        )}
      </View>
    </ScrollView>
  );
}

type StatBoxProps = {
  C: ReturnType<typeof useTheme>['C'];
  icon: React.ComponentProps<typeof Ionicons>['name'];
  value: number;
  label: string;
  alert?: 'warn' | 'danger';
};

function StatBox({ C, icon, value, label, alert }: StatBoxProps) {
  const bg = alert === 'danger' ? C.dangerBg : alert === 'warn' ? C.warningBg : C.surface;
  const fg = alert === 'danger' ? C.danger : alert === 'warn' ? C.warning : C.accent;
  const textColor = alert === 'danger' ? C.danger : alert === 'warn' ? C.warning : C.text;
  const borderColor = alert === 'danger' ? C.danger : alert === 'warn' ? C.warning : C.border;
  return (
    <View style={[s.stat, { backgroundColor: bg, borderColor }]}>
      <View style={[s.statIconWrap, { backgroundColor: alert ? bg : C.accentSubtle }]}>
        <Ionicons name={icon} size={16} color={fg} />
      </View>
      <Text style={{ fontSize: FONT['2xl'], fontWeight: '800', color: textColor, marginTop: SPACE[1] }}>{value}</Text>
      <Text style={{ fontSize: FONT.xs, color: C.muted, marginTop: 1, textAlign: 'center', fontWeight: '500' }}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { padding: SPACE[4], paddingBottom: SPACE[8] },
  stat: { flex: 1, borderRadius: RADIUS.lg, borderWidth: 1, padding: SPACE[4], alignItems: 'center' },
  statIconWrap: { width: 32, height: 32, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center' },
  section: { marginBottom: SPACE[6] },
  activityIcon: { width: 36, height: 36, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center' },
});
