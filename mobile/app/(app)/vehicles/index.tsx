import { useCallback, useEffect, useState } from 'react';
import {
  View, Text, FlatList, Pressable, StyleSheet,
  RefreshControl,
} from 'react-native';
import { useNavigation } from 'expo-router';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { vehicles as api, type VehicleListItem } from '@/lib/api';
import { Badge, EmptyState, Skeleton } from '@/components/Ui';
import { useTheme, FONT, SPACE, RADIUS } from '@/theme';

const FUEL_COLORS: Record<string, string> = {
  PETROL: '#f97316', DIESEL: '#64748b', ELECTRIC: '#22c55e',
  HYBRID: '#0ea5e9', PLUG_IN_HYBRID: '#6366f1', HYDROGEN: '#a855f7',
};

// Derive a consistent accent color from the vehicle color name or default to blue
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

export default function VehiclesScreen() {
  const { C } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const navigation = useNavigation();
  const [items, setItems] = useState<VehicleListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const active = await api.list(1, 50, false);
      setItems(active.items);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    load();
    const unsub = navigation.addListener('focus' as any, () => load(true));
    return unsub;
  }, [navigation, load]);

  return (
    <FlatList
      data={loading ? [] : items}
      keyExtractor={(v) => v.id}
      style={{ backgroundColor: C.bg }}
      contentContainerStyle={{ padding: SPACE[4], paddingBottom: SPACE[8] }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} tintColor={C.accent} />}
      ListHeaderComponent={
        <View style={{ marginBottom: SPACE[4] }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACE[4] }}>
            <Text style={{ fontSize: FONT.xl, fontWeight: '700', color: C.text }}>
              {t('vehicles.title')}
            </Text>
            <Pressable
              onPress={() => router.push('/(app)/vehicles/add')}
              style={({ pressed }) => [s.addBtn, { backgroundColor: C.accent, opacity: pressed ? 0.8 : 1 }]}
            >
              <Ionicons name="add" size={20} color="#fff" />
            </Pressable>
          </View>
          {loading && (
            <View style={{ gap: SPACE[3] }}>
              {[0,1,2].map((i) => (
                <View key={i} style={{ backgroundColor: C.surface, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: C.border, overflow: 'hidden' }}>
                  <View style={{ flexDirection: 'row' }}>
                    <View style={{ width: 4, backgroundColor: C.border }} />
                    <View style={{ flex: 1, padding: SPACE[4], gap: SPACE[2] }}>
                      <Skeleton height={16} width="65%" />
                      <Skeleton height={12} width="40%" />
                      <View style={{ flexDirection: 'row', gap: SPACE[3], marginTop: 4 }}>
                        <Skeleton height={11} width={60} />
                        <Skeleton height={11} width={60} />
                      </View>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      }
      ListEmptyComponent={!loading ? (
        <EmptyState
          icon="car-outline"
          title={t('vehicles.empty')}
          message={t('vehicles.emptyHint')}
          action={{ label: t('vehicles.add'), onPress: () => router.push('/(app)/vehicles/add') }}
        />
      ) : null}
      renderItem={({ item: v }) => {
        const accent = accentFromColor((v as any).color);
        return (
          <Pressable
            style={({ pressed }) => [s.card, {
              backgroundColor: C.surface,
              borderColor: C.border,
              opacity: pressed ? 0.8 : 1,
            }]}
            onPress={() => router.push({ pathname: '/(app)/vehicles/[id]', params: { id: v.id } })}
          >
            {/* Left accent bar */}
            <View style={[s.accentBar, { backgroundColor: accent }]} />

            <View style={{ flex: 1, padding: SPACE[4] }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <View style={{ flex: 1, marginRight: SPACE[3] }}>
                  <Text style={{ fontSize: FONT.lg, fontWeight: '700', color: C.text }} numberOfLines={1}>
                    {v.make} {v.model}
                  </Text>
                  <Text style={{ fontSize: FONT.sm, color: C.muted, marginTop: 1 }}>
                    {v.year}
                  </Text>
                </View>
                <View style={[s.plateBadge, { borderColor: C.borderStrong }]}>
                  <Text style={{ fontSize: FONT.xs, color: C.text, fontWeight: '700', fontFamily: 'Courier', letterSpacing: 1 }}>
                    {v.licensePlate}
                  </Text>
                </View>
              </View>

              <View style={s.cardMeta}>
                {v.latestMileage != null && (
                  <View style={s.metaItem}>
                    <Ionicons name="speedometer-outline" size={13} color={C.mutedLight} />
                    <Text style={{ fontSize: FONT.sm, color: C.muted }}>{v.latestMileage.toLocaleString()} km</Text>
                  </View>
                )}
                <View style={s.metaItem}>
                  <Ionicons name="construct-outline" size={13} color={C.mutedLight} />
                  <Text style={{ fontSize: FONT.sm, color: C.muted }}>{t('vehicles.services', { count: v.counts.serviceRecords })}</Text>
                </View>
                {v.counts.reminders > 0 && (
                  <View style={s.metaItem}>
                    <Ionicons name="notifications-outline" size={13} color={C.mutedLight} />
                    <Text style={{ fontSize: FONT.sm, color: C.muted }}>{t('vehicles.reminders', { count: v.counts.reminders })}</Text>
                  </View>
                )}
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: SPACE[3] }}>
                <View style={[s.fuelChip, { backgroundColor: `${FUEL_COLORS[v.fuelType] ?? C.accent}18` }]}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: FUEL_COLORS[v.fuelType] ?? C.accent }} />
                  <Text style={{ fontSize: FONT.xs, color: FUEL_COLORS[v.fuelType] ?? C.accent, fontWeight: '600' }}>
                    {t(`fuelType.${v.fuelType}`, v.fuelType)}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={C.mutedLight} />
              </View>
            </View>
          </Pressable>
        );
      }}
      ItemSeparatorComponent={() => <View style={{ height: SPACE[3] }} />}
    />
  );
}

const s = StyleSheet.create({
  card: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  accentBar: { width: 4 },
  plateBadge: {
    borderWidth: 1,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  cardMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE[3], marginTop: SPACE[3] },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  fuelChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.full },
  addBtn: { width: 32, height: 32, borderRadius: RADIUS.full, alignItems: 'center', justifyContent: 'center' },
});
