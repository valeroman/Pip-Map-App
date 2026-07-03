import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Platform, StyleSheet } from 'react-native';

import { PipButton } from '@/components/PipButton';
import { PipScreen } from '@/components/PipScreen';
import { PipText } from '@/components/PipText';
import { supabase } from '@/lib/supabase';
import { colors } from '@/theme';

export default function ModalScreen() {
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setLoading(false);
  };

  return (
    <PipScreen style={styles.container}>
      <PipText variant="title" glow>
        Terminal de acceso
      </PipText>
      <PipText variant="body" color={colors.textDim} style={styles.body}>
        Pip-Map App — sistema de navegación estilo Vault-Tec.
      </PipText>

      <PipButton
        label={loading ? 'Cerrando sesión...' : 'Cerrar sesión'}
        color={colors.danger}
        onPress={handleLogout}
        disabled={loading}
        style={styles.logoutButton}
      />

      <StatusBar style={Platform.OS === 'ios' ? 'light' : 'auto'} />
    </PipScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    marginTop: 12,
    textAlign: 'center',
  },
  logoutButton: {
    marginTop: 24,
  },
});
