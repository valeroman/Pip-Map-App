import { Link, Stack } from 'expo-router';
import { StyleSheet } from 'react-native';

import { PipScreen } from '@/components/PipScreen';
import { PipText } from '@/components/PipText';
import { colors } from '@/theme';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Error 404' }} />
      <PipScreen style={styles.container}>
        <PipText variant="title" color={colors.danger} glow>
          Señal perdida
        </PipText>
        <PipText variant="body" color={colors.textDim} style={styles.body}>
          Esta terminal no existe.
        </PipText>

        <Link href="/" style={styles.link}>
          <PipText variant="label" color={colors.primary}>
            Volver al inicio
          </PipText>
        </Link>
      </PipScreen>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    marginTop: 8,
  },
  link: {
    marginTop: 20,
    paddingVertical: 12,
  },
});
