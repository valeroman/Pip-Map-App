import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { PipButton } from '@/components/PipButton';
import { PipCard } from '@/components/PipCard';
import { PipInput } from '@/components/PipInput';
import { PipScreen } from '@/components/PipScreen';
import { PipText } from '@/components/PipText';
import { TerminalBootHeader } from '@/components/TerminalBootHeader';
import { useGroup } from '@/context/GroupContext';
import { createGroup, joinGroup } from '@/lib/group';
import { colors } from '@/theme';

type Mode = 'crear' | 'unirse';

function translateGroupError(mode: Mode, message?: string): string {
  const normalized = message?.toLowerCase() ?? '';
  if (normalized.includes('network')) return 'ERROR DE CONEXIÓN';
  return mode === 'unirse' ? 'CÓDIGO INVÁLIDO O EXPIRADO' : 'ERROR AL CREAR EL GRUPO';
}

export default function GroupSetupScreen() {
  const { refresh } = useGroup();

  const [mode, setMode] = useState<Mode>('crear');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const switchMode = (nextMode: Mode) => {
    if (submitting) return;
    setMode(nextMode);
    setError(null);
  };

  const handleSubmit = async () => {
    setError(null);

    if (mode === 'crear') {
      const trimmedName = name.trim();
      if (!trimmedName) {
        setError('INGRESÁ UN NOMBRE DE GRUPO');
        return;
      }

      setSubmitting(true);
      try {
        await createGroup(trimmedName);
        await refresh();
      } catch (err) {
        setError(translateGroupError(mode, err instanceof Error ? err.message : undefined));
      } finally {
        setSubmitting(false);
      }
      return;
    }

    const trimmedCode = code.trim().toUpperCase();
    if (trimmedCode.length !== 6) {
      setError('EL CÓDIGO DEBE TENER 6 CARACTERES');
      return;
    }

    setSubmitting(true);
    try {
      await joinGroup(trimmedCode);
      await refresh();
    } catch (err) {
      setError(translateGroupError(mode, err instanceof Error ? err.message : undefined));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PipScreen>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled">
          <TerminalBootHeader lines={['BUSCANDO GRUPO FAMILIAR', 'SIN VÍNCULO ACTIVO']} />

          <View style={styles.titleBlock}>
            <PipText variant="display" color={colors.accent} glow>
              Grupo familiar
            </PipText>
            <PipText variant="label" color={colors.textDim} style={styles.subtitle}>
              Creá un grupo o unite con un código
            </PipText>
          </View>

          <PipText variant="small" color={colors.warning} style={styles.waiting}>
            &gt; ESPERANDO VÍNCULO DE GRUPO
          </PipText>

          <View style={styles.tabs}>
            <PipButton
              label="Crear grupo"
              filled={mode === 'crear'}
              onPress={() => switchMode('crear')}
              style={styles.tabButton}
            />
            <PipButton
              label="Unirse"
              filled={mode === 'unirse'}
              onPress={() => switchMode('unirse')}
              style={styles.tabButton}
            />
          </View>

          {error ? (
            <PipCard borderColor={colors.danger} style={styles.errorCard}>
              <PipText variant="label" color={colors.danger}>
                {error}
              </PipText>
            </PipCard>
          ) : null}

          <View style={styles.form}>
            {mode === 'crear' ? (
              <PipInput
                label="Nombre del grupo"
                value={name}
                onChangeText={setName}
                placeholder="Familia Longfellow"
              />
            ) : (
              <PipInput
                label="Código de invitación"
                value={code}
                onChangeText={(text) => setCode(text.toUpperCase())}
                autoCapitalize="characters"
                maxLength={6}
                placeholder="A3F9K1"
              />
            )}

            <PipButton
              filled
              label={
                submitting ? 'Procesando...' : mode === 'crear' ? 'Crear grupo' : 'Unirse al grupo'
              }
              onPress={handleSubmit}
              disabled={submitting}
              style={styles.submit}
            />
          </View>

          <PipText variant="small" color={colors.textDim} style={styles.footer}>
            VINCULACIÓN REQUERIDA · PROTOCOLO FAMILIAR VAULT-TEC
          </PipText>
        </ScrollView>
      </KeyboardAvoidingView>
    </PipScreen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingBottom: 24,
  },
  titleBlock: {
    marginBottom: 14,
  },
  subtitle: {
    marginTop: 4,
  },
  waiting: {
    marginBottom: 18,
  },
  tabs: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },
  tabButton: {
    flex: 1,
  },
  errorCard: {
    marginBottom: 16,
  },
  form: {
    gap: 14,
  },
  submit: {
    marginTop: 4,
  },
  footer: {
    textAlign: 'center',
    marginTop: 'auto',
    paddingTop: 24,
  },
});
