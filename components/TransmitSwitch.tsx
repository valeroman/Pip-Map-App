import { Pressable, StyleSheet, View } from 'react-native';

import { colors, boxGlow } from '@/theme';
import { PipText } from './PipText';
import { PulsingDot } from './PulsingDot';

type Props = {
  value: boolean;
  onToggle: () => void;
};

export function TransmitSwitch({ value, onToggle }: Props) {
  const color = value ? colors.primary : colors.danger;

  return (
    <Pressable
      onPress={onToggle}
      style={[styles.base, { borderColor: color }, value ? boxGlow(color, 10) : null]}>
      {value ? (
        <PulsingDot color={color} size={14} />
      ) : (
        <View style={[styles.staticDot, { borderColor: color }]} />
      )}

      <View style={styles.copy}>
        <PipText variant="title" color={color} glow={value}>
          {value ? 'Transmitiendo posición' : 'Inactivo'}
        </PipText>
        <PipText variant="small" color={colors.textDim} style={styles.subLabel}>
          {value ? 'ENLACE ACTIVO · TOCAR PARA DETENER' : 'SIN TRANSMITIR · TOCAR PARA COMPARTIR'}
        </PipText>
      </View>

      <View style={[styles.track, { borderColor: color }, { alignItems: value ? 'flex-end' : 'flex-start' }]}>
        <View
          style={[
            styles.knob,
            value
              ? { backgroundColor: color }
              : { backgroundColor: colors.surface, borderWidth: 1, borderColor: color },
          ]}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 2,
    padding: 16,
    backgroundColor: colors.surface,
  },
  staticDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
    backgroundColor: colors.background,
  },
  copy: {
    flex: 1,
  },
  subLabel: {
    marginTop: 3,
  },
  track: {
    width: 54,
    height: 30,
    borderWidth: 1,
    padding: 2,
    justifyContent: 'center',
  },
  knob: {
    width: 24,
    height: 24,
    borderRadius: 2,
  },
});
