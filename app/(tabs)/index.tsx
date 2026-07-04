import { useEffect, useMemo, useState, type ComponentProps, type ComponentType } from 'react';
import { Linking, StyleSheet, View } from 'react-native';

import { PipButton } from '@/components/PipButton';
import type { default as PipMapType } from '@/components/PipMap';
import { PipScreen } from '@/components/PipScreen';
import { PipText } from '@/components/PipText';
import { StatusBarHeader } from '@/components/StatusBarHeader';
import { TransmitSwitch } from '@/components/TransmitSwitch';
import { useLocation } from '@/hooks/useLocation';
import { useLocationTransmission } from '@/hooks/useLocationTransmission';
import { supabase } from '@/lib/supabase';
import { colors } from '@/theme';

const STABLE_ACCURACY_THRESHOLD_METERS = 30;

function statusMessage(status: ReturnType<typeof useLocation>['status']) {
  switch (status) {
    case 'idle':
    case 'requesting':
      return 'SOLICITANDO PERMISO…';
    case 'denied':
      return 'PERMISO DENEGADO';
    case 'unavailable':
      return 'SIN SEÑAL';
    case 'granted':
      return 'ADQUIRIENDO POSICIÓN…';
  }
}

export default function MapScreen() {
  const [transmitting, setTransmitting] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const location = useLocation();
  const { coords, accuracy, status } = location;
  const { routePoints, error: transmissionError } = useLocationTransmission(
    location,
    transmitting
  );

  // Loaded lazily on mount (never during Node-side SSR): PipMap pulls in
  // leaflet, which touches `window` at import time and would crash the
  // web static-render pass if imported eagerly.
  const [PipMap, setPipMap] = useState<ComponentType<ComponentProps<typeof PipMapType>> | null>(
    null
  );

  useEffect(() => {
    let mounted = true;
    import('@/components/PipMap').then((mod) => {
      if (mounted) setPipMap(() => mod.default);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const handleLogout = async () => {
    setLoggingOut(true);
    await supabase.auth.signOut();
    setLoggingOut(false);
  };

  const hasFix = status === 'granted' && coords != null;

  const signal = useMemo(() => {
    if (!hasFix || accuracy == null) {
      return { label: '—', color: colors.textDim };
    }
    return accuracy <= STABLE_ACCURACY_THRESHOLD_METERS
      ? { label: 'ESTABLE', color: colors.primary }
      : { label: 'DÉBIL', color: colors.warning };
  }, [hasFix, accuracy]);

  return (
    <PipScreen style={styles.screen}>
      <StatusBarHeader onLogout={handleLogout} loggingOut={loggingOut} />

      <View style={styles.mapPlaceholder}>
        <View style={[styles.pill, styles.pillTopLeft, { borderColor: signal.color }]}>
          <PipText variant="small" color={signal.color}>
            SEÑAL: {signal.label}
          </PipText>
        </View>
        <View style={[styles.pill, styles.pillTopRight, { borderColor: colors.warning }]}>
          <PipText variant="small" color={colors.warning}>
            SUJETOS: 00
          </PipText>
        </View>

        {hasFix && coords && PipMap ? (
          <PipMap
            lat={coords.lat}
            lng={coords.lng}
            accuracy={accuracy}
            follow
            routePoints={routePoints}
            dom={{ scrollEnabled: false, style: styles.mapDom }}
          />
        ) : (
          <View style={styles.mapCenter}>
            <PipText variant="title" color={colors.textDim}>
              {hasFix ? 'CARGANDO MAPA…' : statusMessage(status)}
            </PipText>
            {status === 'denied' && (
              <PipButton
                label="ABRIR AJUSTES"
                color={colors.warning}
                onPress={() => Linking.openSettings()}
                style={styles.settingsButton}
              />
            )}
          </View>
        )}
      </View>

      <TransmitSwitch value={transmitting} onToggle={() => setTransmitting((v) => !v)} />
      {transmitting && transmissionError && (
        <PipText variant="small" color={colors.warning}>
          {transmissionError}
        </PipText>
      )}
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
    justifyContent: 'center',
    overflow: 'hidden',
  },
  mapDom: {
    width: '100%',
    height: '100%',
  },
  mapCenter: {
    alignItems: 'center',
    gap: 4,
  },
  settingsButton: {
    marginTop: 12,
  },
  pill: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: colors.primary,
    paddingVertical: 4,
    paddingHorizontal: 7,
    backgroundColor: colors.background,
    zIndex: 1,
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
