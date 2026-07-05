import { useFonts } from 'expo-font';
import { DarkTheme, Stack, ThemeProvider, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';
import {
  ShareTechMono_400Regular,
} from '@expo-google-fonts/share-tech-mono';
import { VT323_400Regular } from '@expo-google-fonts/vt323';

import { AuthProvider, useAuth } from '@/context/AuthContext';
import { GroupProvider, useGroup } from '@/context/GroupContext';
import { colors } from '@/theme';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const pipTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.background,
    card: colors.background,
    text: colors.textPrimary,
    border: colors.border,
    primary: colors.primary,
  },
};

export default function RootLayout() {
  const [loaded, error] = useFonts({
    ShareTechMono_400Regular,
    VT323_400Regular,
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <AuthProvider>
      <GroupProvider>
        <RootLayoutNav />
      </GroupProvider>
    </AuthProvider>
  );
}

function RootLayoutNav() {
  const { session, loading: authLoading } = useAuth();
  const { groupId, loading: groupLoading } = useGroup();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (authLoading || groupLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inGroupSetup = segments[0] === 'group-setup';

    if (!session && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (session && groupId === null && !inGroupSetup) {
      router.replace('/group-setup');
    } else if (session && groupId !== null && (inAuthGroup || inGroupSetup)) {
      router.replace('/(tabs)');
    }
  }, [session, authLoading, groupId, groupLoading, segments, router]);

  if (authLoading || groupLoading) {
    return null;
  }

  return (
    <ThemeProvider value={pipTheme}>
      <Stack>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="group-setup" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
      </Stack>
    </ThemeProvider>
  );
}
