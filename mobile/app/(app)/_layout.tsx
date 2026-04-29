import { Tabs } from 'expo-router';
import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { auth } from '@/lib/api';
import { useTheme, RADIUS } from '@/theme';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function registerForPushNotifications() {
  if (!Device.isDevice || Constants.executionEnvironment === 'storeClient') return;
  const { status: existing } = await Notifications.getPermissionsAsync();
  const { status } = existing === 'granted'
    ? { status: existing }
    : await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return;
  const token = (await Notifications.getExpoPushTokenAsync({
    projectId: '54785a48-627a-4992-9d7f-fcdcb1de8609',
  })).data;
  await auth.registerPushToken(token).catch(() => {});
}

type TabIconProps = {
  name: React.ComponentProps<typeof Ionicons>['name'];
  focused: boolean;
  color: string;
  size: number;
};

function TabIcon({ name, focused, color, size }: TabIconProps) {
  const { C } = useTheme();
  return (
    <View style={[s.iconWrap, focused && { backgroundColor: C.accentSubtle }]}>
      <Ionicons name={name} size={size - 2} color={color} />
    </View>
  );
}

const tabHaptic = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

export default function AppLayout() {
  const { C } = useTheme();
  const { t } = useTranslation();

  useEffect(() => { registerForPushNotifications(); }, []);

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: C.accent,
        tabBarInactiveTintColor: C.mutedLight,
        tabBarStyle: {
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: C.borderStrong,
          backgroundColor: C.surface,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: 0.2,
        },
        headerStyle: { backgroundColor: C.surface },
        headerTitleStyle: { color: C.text, fontWeight: '700', fontSize: 17 },
        headerShadowVisible: false,
        headerStatusBarHeight: undefined,
      }}
    >
      <Tabs.Screen
        name="index"
        listeners={{ tabPress: tabHaptic }}
        options={{
          title: t('nav.dashboard'),
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon name={focused ? 'home' : 'home-outline'} focused={focused} color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="vehicles"
        listeners={{ tabPress: tabHaptic }}
        options={{
          title: t('nav.vehicles'),
          headerShown: false,
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon name={focused ? 'car' : 'car-outline'} focused={focused} color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        listeners={{ tabPress: tabHaptic }}
        options={{
          title: t('nav.profile'),
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon name={focused ? 'person' : 'person-outline'} focused={focused} color={color} size={size} />
          ),
        }}
      />

    </Tabs>
  );
}

const s = StyleSheet.create({
  iconWrap: {
    width: 36,
    height: 28,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
