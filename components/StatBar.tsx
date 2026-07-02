import { View, StyleSheet } from 'react-native';

import { colors } from '@/theme';
import { PipText } from './PipText';

type Props = {
  label: string;
  value: number;
  color?: string;
};

export function StatBar({ label, value, color = colors.primary }: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.labelRow}>
        <PipText variant="label" color={color}>
          {label}
        </PipText>
        <PipText variant="label" color={color}>
          {`${value}%`}
        </PipText>
      </View>
      <View style={[styles.track, { borderColor: color }]}>
        <View style={[styles.fill, { width: `${value}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    marginBottom: 14,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  track: {
    height: 10,
    borderWidth: 1,
  },
  fill: {
    height: '100%',
  },
});
