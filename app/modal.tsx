import { StatusBar } from 'expo-status-bar';
import { Platform, StyleSheet } from 'react-native';

import { PipScreen } from '@/components/PipScreen';
import { PipText } from '@/components/PipText';
import { colors } from '@/theme';

export default function ModalScreen() {
  return (
    <PipScreen style={styles.container}>
      <PipText variant="title" glow>
        Terminal de acceso
      </PipText>
      <PipText variant="body" color={colors.textDim} style={styles.body}>
        Pip-Map App — sistema de navegación estilo Vault-Tec.
      </PipText>

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
});
