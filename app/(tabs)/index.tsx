import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { PipScreen } from '@/components/PipScreen';
import { PipText } from '@/components/PipText';
import { StatusBarHeader } from '@/components/StatusBarHeader';
import { TransmitSwitch } from '@/components/TransmitSwitch';
import { supabase } from '@/lib/supabase';
import { colors } from '@/theme';

export default function MapScreen() {
  const [transmitting, setTransmitting] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    await supabase.auth.signOut();
    setLoggingOut(false);
  };

  return (
    <PipScreen style={styles.screen}>
      <StatusBarHeader onLogout={handleLogout} loggingOut={loggingOut} />

      <View style={styles.mapPlaceholder}>
        <View style={[styles.pill, styles.pillTopLeft]}>
          <PipText variant="small" color={colors.primary}>
            SEÑAL: ESTABLE
          </PipText>
        </View>
        <View style={[styles.pill, styles.pillTopRight, { borderColor: colors.warning }]}>
          <PipText variant="small" color={colors.warning}>
            SUJETOS: 00
          </PipText>
        </View>

        <View style={styles.mapCenter}>
          <PipText variant="title" color={colors.textDim}>
            Mapa no disponible
          </PipText>
          <PipText variant="small" color={colors.textDim} style={styles.mapCenterSub}>
            POSICIÓN NO ADQUIRIDA · SPEC 02
          </PipText>
        </View>
      </View>

      <TransmitSwitch value={transmitting} onToggle={() => setTransmitting((v) => !v)} />
    </PipScreen>
  );
}

const styles = StyleSheet.create({
  screen: {
    gap: 16,
  },
  mapPlaceholder: {
    position: 'relative',
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapCenter: {
    alignItems: 'center',
    gap: 4,
  },
  mapCenterSub: {
    textAlign: 'center',
  },
  pill: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: colors.primary,
    paddingVertical: 4,
    paddingHorizontal: 7,
    backgroundColor: colors.background,
  },
  pillTopLeft: {
    top: 10,
    left: 10,
  },
  pillTopRight: {
    top: 10,
    right: 10,
  },
});
