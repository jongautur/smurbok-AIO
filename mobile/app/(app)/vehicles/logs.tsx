import { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet, RefreshControl,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { vehicles as vehicleApi, type TimelineEntry } from '@/lib/api';
import { Card, Spinner } from '@/components/Ui';
import { useTheme, FONT, SPACE, RADIUS } from '@/theme';

const PAGE_SIZE = 30;

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function VehicleLogsScreen() {
  const { C } = useTheme();
  const { t } = useTranslation();
  const { vehicleId } = useLocalSearchParams<{ vehicleId: string }>();

  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!vehicleId) return;
    if (!silent) setLoading(true);
    try {
      const r = await vehicleApi.timeline(vehicleId, 1, PAGE_SIZE);
      setTimeline(r.items);
      setTotal(r.total);
      setPage(1);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, [vehicleId]);

  useEffect(() => { load(); }, [load]);

  async function loadMore() {
    if (loadingMore || timeline.length >= total || !vehicleId) return;
    setLoadingMore(true);
    const next = page + 1;
    try {
      const r = await vehicleApi.timeline(vehicleId, next, PAGE_SIZE);
      setTimeline((p) => [...p, ...r.items]);
      setPage(next);
    } catch {}
    setLoadingMore(false);
  }

  if (loading) return <Spinner />;

  const groups: { date: string; entries: TimelineEntry[] }[] = [];
  for (const entry of timeline) {
    const d = entry.date.split('T')[0];
    const last = groups[groups.length - 1];
    if (last && last.date === d) last.entries.push(entry);
    else groups.push({ date: d, entries: [entry] });
  }

  return (
    <ScrollView
      style={{ backgroundColor: C.bg }}
      contentContainerStyle={{ padding: SPACE[4], paddingBottom: SPACE[8] }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} tintColor={C.accent} />}
    >
      {groups.length === 0 ? (
        <View style={{ alignItems: 'center', paddingTop: SPACE[8] }}>
          <Ionicons name="time-outline" size={40} color={C.mutedLight} />
          <Text style={{ fontSize: FONT.base, color: C.muted, marginTop: SPACE[3] }}>{t('vehicles.noHistory')}</Text>
        </View>
      ) : groups.map((g) => (
        <View key={g.date} style={{ marginBottom: SPACE[4] }}>
          <Text style={{ fontSize: FONT.xs, color: C.mutedLight, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: SPACE[2] }}>
            {fmtDate(g.date)}
          </Text>
          <Card padding={0}>
            {g.entries.map((entry, i) => {
              const isService = entry.entryType === 'SERVICE';
              const isExpense = entry.entryType === 'EXPENSE';
              const isMileage = entry.entryType === 'MILEAGE';
              const iconName = isService ? 'construct-outline' : isExpense ? 'card-outline' : 'speedometer-outline';
              const iconBg = isService ? C.accentSubtle : isExpense ? C.dangerBg : C.successBg;
              const iconColor = isService ? C.accent : isExpense ? C.danger : C.success;
              const title = isService
                ? t(`serviceType.${entry.type ?? ''}`, entry.type ?? 'Service')
                : isExpense
                  ? t(`expenseCategory.${entry.category ?? ''}`, entry.category ?? 'Expense')
                  : `${(entry.mileage ?? 0).toLocaleString()} km`;
              const sub = isService
                ? (entry.shop ?? entry.description ?? null)
                : isExpense
                  ? (entry.description ?? null)
                  : (entry.note ?? null);
              return (
                <View
                  key={entry.id}
                  style={{ flexDirection: 'row', alignItems: 'center', padding: SPACE[4], borderTopWidth: i === 0 ? 0 : StyleSheet.hairlineWidth, borderTopColor: C.borderSubtle }}
                >
                  <View style={{ width: 32, height: 32, borderRadius: RADIUS.md, backgroundColor: iconBg, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name={iconName} size={14} color={iconColor} />
                  </View>
                  <View style={{ flex: 1, marginLeft: SPACE[3] }}>
                    <Text style={{ fontSize: FONT.sm, color: C.text, fontWeight: '600' }}>{title}</Text>
                    {sub ? <Text style={{ fontSize: FONT.xs, color: C.mutedLight, marginTop: 1 }} numberOfLines={1}>{sub}</Text> : null}
                  </View>
                  {isService && entry.cost ? (
                    <Text style={{ fontSize: FONT.sm, color: C.text, fontWeight: '700' }}>{parseFloat(entry.cost).toLocaleString()} kr</Text>
                  ) : isExpense && entry.amount ? (
                    <Text style={{ fontSize: FONT.sm, color: C.danger, fontWeight: '700' }}>{parseFloat(entry.amount).toLocaleString()} kr</Text>
                  ) : isMileage ? (
                    <Text style={{ fontSize: FONT.xs, color: C.mutedLight }}>{(entry.mileage ?? 0).toLocaleString()} km</Text>
                  ) : null}
                </View>
              );
            })}
          </Card>
        </View>
      ))}
      {timeline.length < total && (
        <Pressable
          style={({ pressed }) => [{ alignItems: 'center', paddingVertical: SPACE[4], opacity: pressed ? 0.6 : 1 }]}
          onPress={loadMore}
          disabled={loadingMore}
        >
          <Text style={{ fontSize: FONT.sm, color: C.accent, fontWeight: '600' }}>
            {loadingMore ? t('common.loading') : `${t('common.loadMore')} (${t('vehicles.remaining', { count: total - timeline.length })})`}
          </Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({});
