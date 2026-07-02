import { SymbolView } from 'expo-symbols';
import { Link, Tabs } from 'expo-router';
import { Pressable } from 'react-native';

import { colors, fonts } from '@/theme';
import { useClientOnlyValue } from '@/components/useClientOnlyValue';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.primaryDim,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
        },
        tabBarLabelStyle: {
          fontFamily: fonts.mono,
          fontSize: 10,
          letterSpacing: 1,
          textTransform: 'uppercase',
        },
        headerStyle: { backgroundColor: colors.background },
        headerTitleStyle: { fontFamily: fonts.display, fontSize: 22, color: colors.primary },
        headerTintColor: colors.primary,
        // Disable the static render of the header on web
        // to prevent a hydration error in React Navigation v6.
        headerShown: useClientOnlyValue(false, true),
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'STATUS',
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: 'waveform.path.ecg', android: 'monitor_heart', web: 'monitor_heart' }}
              tintColor={color}
              size={24}
            />
          ),
          headerRight: () => (
            <Link href="/modal" asChild>
              <Pressable style={{ marginRight: 15 }}>
                {({ pressed }) => (
                  <SymbolView
                    name={{ ios: 'info.circle', android: 'info', web: 'info' }}
                    size={22}
                    tintColor={colors.primary}
                    style={{ opacity: pressed ? 0.5 : 1 }}
                  />
                )}
              </Pressable>
            </Link>
          ),
        }}
      />
      <Tabs.Screen
        name="two"
        options={{
          title: 'DATA',
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: 'list.bullet.rectangle', android: 'list_alt', web: 'list_alt' }}
              tintColor={color}
              size={24}
            />
          ),
        }}
      />
    </Tabs>
  );
}
