import { Stack, useRouter } from 'expo-router';
import { Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme';

function BackButton() {
  const router = useRouter();
  const { C } = useTheme();
  return (
    <Pressable
      onPress={() => router.back()}
      style={{ paddingLeft: 8, paddingRight: 4, paddingVertical: 8 }}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <Ionicons name="chevron-back" size={26} color={C.accent} />
    </Pressable>
  );
}

export default function VehiclesLayout() {
  const { C } = useTheme();
  const { t } = useTranslation();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: C.surface },
        headerTitleStyle: { color: C.text, fontWeight: '700', fontSize: 17 } as any,
        headerShadowVisible: false,
        headerStatusBarHeight: undefined,
        headerBackVisible: false,
        headerLeft: () => <BackButton />,
      }}
    >
      <Stack.Screen name="index" options={{ title: t('vehicles.title'), headerLeft: undefined }} />
      <Stack.Screen name="[id]" options={{ title: '' }} />
      <Stack.Screen name="add" options={{ title: t('vehicles.addVehicle') }} />
      <Stack.Screen name="add-service" options={{ title: t('serviceRecords.add') }} />
      <Stack.Screen name="add-expense" options={{ title: t('expenses.add') }} />
      <Stack.Screen name="add-mileage" options={{ title: t('mileage.add') }} />
      <Stack.Screen name="add-reminder" options={{ title: t('reminders.add') }} />
      <Stack.Screen name="edit-vehicle" options={{ title: t('vehicles.editVehicle') }} />
      <Stack.Screen name="edit-service" options={{ title: t('serviceRecords.edit') }} />
      <Stack.Screen name="edit-expense" options={{ title: t('expenses.edit') }} />
      <Stack.Screen name="edit-reminder" options={{ title: t('reminders.edit') }} />
      <Stack.Screen name="logs" options={{ title: t('common.seeAll') }} />
    </Stack>
  );
}
