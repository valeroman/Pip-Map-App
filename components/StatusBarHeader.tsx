import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors } from '@/theme';
import { PipText } from './PipText';

const CLOCK_TICK_MS = 30_000;
const SIGNAL_BAR_COUNT = 4;

type Props = {
  title?: string;
  userName?: string;
  onLogout?: () => void;
  loggingOut?: boolean;
};

export function StatusBarHeader({
  title = 'Vault-Tec Pip-Map',
  userName,
  onLogout,
  loggingOut,
}: Props) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), CLOCK_TICK_MS);
    return () => clearInterval(id);
  }, []);

  const hhmm = now.toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  return (
    <View style={styles.row}>
      <PipText variant="small" color={colors.primary}>
        {hhmm}
      </PipText>
      <View style={styles.center}>
        <PipText variant="label" color={colors.accent} glow>
          {title}
        </PipText>
        {userName ? (
          <PipText variant="small" color={colors.textDim} numberOfLines={1}>
            {userName}
          </PipText>
        ) : null}
      </View>
      <View style={styles.right}>
        <View style={styles.signalBars}>
          {Array.from({ length: SIGNAL_BAR_COUNT }, (_, i) => (
            <View
              key={i}
              style={[
                styles.signalBar,
                {
                  height: 4 + i * 3,
                  backgroundColor: i < 3 ? colors.primary : colors.primaryDim,
                },
              ]}
            />
          ))}
        </View>

        {onLogout ? (
          <Pressable
            onPress={onLogout}
            disabled={loggingOut}
            hitSlop={8}
            style={({ pressed }) => [styles.logoutButton, pressed ? { opacity: 0.5 } : null]}>
            <SymbolView
              name={{
                ios: 'rectangle.portrait.and.arrow.right',
                android: 'logout',
                web: 'logout',
              }}
              tintColor={colors.danger}
              size={18}
            />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  center: {
    alignItems: 'center',
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  signalBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
  },
  signalBar: {
    width: 4,
  },
  logoutButton: {
    padding: 2,
  },
});
