import { StyleSheet, View } from 'react-native';

import { colors } from '@/theme';
import { PipText } from './PipText';

const DEFAULT_LINES = [
  'INICIANDO RASTREO',
  'CARGANDO MAPA',
  'ENLACE SATELITAL',
];

type Props = {
  lines?: string[];
};

export function TerminalBootHeader({ lines = DEFAULT_LINES }: Props) {
  return (
    <View style={styles.container}>
      <PipText variant="small" color={colors.textDim} uppercase={false}>
        ROBCO INDUSTRIES (TM) UNIFIED OS
      </PipText>
      <PipText variant="small" color={colors.textDim} uppercase={false}>
        COPYRIGHT 2075-2077 ROBCO IND.
      </PipText>
      <PipText variant="small" color={colors.textDim} uppercase={false} style={styles.protocolLine}>
        - TERMITE-LINK PROTOCOL v2.77 -
      </PipText>

      {lines.map((line) => (
        <View key={line} style={styles.logRow}>
          <PipText variant="small" color={colors.primary}>
            [ OK ]
          </PipText>
          <PipText variant="small" color={colors.textDim}>
            {line}
          </PipText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 18,
    gap: 3,
  },
  protocolLine: {
    marginBottom: 8,
  },
  logRow: {
    flexDirection: 'row',
    gap: 8,
  },
});
