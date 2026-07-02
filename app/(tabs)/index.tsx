import { ScrollView, StyleSheet, View } from 'react-native';

import { PipScreen } from '@/components/PipScreen';
import { PipCard } from '@/components/PipCard';
import { PipText } from '@/components/PipText';
import { PipButton } from '@/components/PipButton';
import { StatBar } from '@/components/StatBar';
import { colors } from '@/theme';

export default function StatusScreen() {
  return (
    <PipScreen>
      <ScrollView contentContainerStyle={styles.content}>
        <PipText variant="display" glow>
          Vault-Tec
        </PipText>
        <PipText variant="label" color={colors.textDim} style={styles.subtitle}>
          Sistema de monitoreo del portador
        </PipText>

        <PipCard style={styles.card}>
          <PipText variant="title" glow>
            Signos vitales
          </PipText>
          <View style={styles.statBlock}>
            <StatBar label="Salud" value={82} color={colors.primary} />
            <StatBar label="Radiación" value={24} color={colors.warning} />
            <StatBar label="Hidratación" value={60} color={colors.accent} />
            <StatBar label="Nivel de amenaza" value={12} color={colors.danger} />
          </View>
        </PipCard>

        <PipCard style={styles.card} borderColor={colors.info}>
          <PipText variant="title" color={colors.accent} glow>
            S.P.E.C.I.A.L.
          </PipText>
          <View style={styles.grid}>
            {SPECIAL.map((stat) => (
              <View key={stat.label} style={styles.gridItem}>
                <PipText variant="label" color={colors.textDim}>
                  {stat.label}
                </PipText>
                <PipText variant="title" glow>
                  {stat.value}
                </PipText>
              </View>
            ))}
          </View>
        </PipCard>

        <PipButton label="Actualizar estado" style={styles.button} />
      </ScrollView>
    </PipScreen>
  );
}

const SPECIAL = [
  { label: 'FUE', value: 5 },
  { label: 'PER', value: 6 },
  { label: 'RES', value: 4 },
  { label: 'CAR', value: 3 },
  { label: 'INT', value: 7 },
  { label: 'AGI', value: 5 },
  { label: 'SUE', value: 4 },
];

const styles = StyleSheet.create({
  content: {
    paddingBottom: 40,
  },
  subtitle: {
    marginTop: -4,
    marginBottom: 20,
  },
  card: {
    marginBottom: 16,
  },
  statBlock: {
    marginTop: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 16,
  },
  gridItem: {
    width: '20%',
    minWidth: 60,
  },
  button: {
    alignSelf: 'flex-start',
    marginTop: 4,
  },
});
