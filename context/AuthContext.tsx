import { Session } from '@supabase/supabase-js';
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';

type AuthContextValue = {
  session: Session | null;
  loading: boolean;
};

const AuthContext = createContext<AuthContextValue>({ session: null, loading: true });

// El registro guarda display_name en los metadatos del usuario (disponibles al instante)
// en vez de insertar en `profiles` durante el signUp, porque si el proyecto tiene
// confirmación de email activada no hay sesión todavía y el insert falla por RLS.
// Acá, con una sesión ya autenticada, se asegura que exista la fila en `profiles`.
async function ensureProfile(session: Session) {
  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', session.user.id)
    .maybeSingle();

  if (existing) return;

  const displayName =
    session.user.user_metadata?.display_name ?? session.user.email?.split('@')[0] ?? 'Usuario';

  await supabase.from('profiles').insert({ id: session.user.id, display_name: displayName });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
      if (data.session) ensureProfile(data.session);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setLoading(false);
      if (newSession) ensureProfile(newSession);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  return <AuthContext.Provider value={{ session, loading }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
