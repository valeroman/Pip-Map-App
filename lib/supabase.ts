import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_KEY!;

// En web, expo-router renderiza en el servidor (Node) donde `window` no existe.
// AsyncStorage asume `window` en su implementación web, así que solo se usa en nativo;
// en web se deja que supabase-js resuelva su propio storage (localStorage o memoria en SSR).
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: Platform.OS === 'web' ? undefined : AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
