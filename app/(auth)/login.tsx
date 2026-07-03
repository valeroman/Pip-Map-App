import { Link } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { PipButton } from '@/components/PipButton';
import { PipCard } from '@/components/PipCard';
import { PipInput } from '@/components/PipInput';
import { PipScreen } from '@/components/PipScreen';
import { PipText } from '@/components/PipText';
import { TerminalBootHeader } from '@/components/TerminalBootHeader';
import { translateAuthError } from '@/lib/authErrors';
import { supabase } from '@/lib/supabase';
import { colors } from '@/theme';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setFormError('');

    const isEmailValid = EMAIL_REGEX.test(email);
    const isPasswordValid = password.length >= 6;

    setEmailError(isEmailValid ? '' : 'FORMATO DE EMAIL INVÁLIDO');
    setPasswordError(isPasswordValid ? '' : 'MÍNIMO 6 CARACTERES');

    if (!isEmailValid || !isPasswordValid) return;

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (error) {
      setFormError(translateAuthError(error.message));
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
          <TerminalBootHeader />

          <View style={styles.titleBlock}>
            <PipText variant="display" color={colors.accent} glow>
              Vault-Tec Pip-Map
            </PipText>
            <PipText variant="label" color={colors.textDim} style={styles.subtitle}>
              Sistema de rastreo de grupo
            </PipText>
          </View>

          <PipText variant="small" color={colors.warning} style={styles.waiting}>
            &gt; ESPERANDO CREDENCIALES
          </PipText>

          {formError ? (
            <PipCard borderColor={colors.danger} style={styles.errorCard}>
              <PipText variant="label" color={colors.danger}>
                {formError}
              </PipText>
            </PipCard>
          ) : null}

          <View style={styles.form}>
            <PipInput
              label="Email"
              value={email}
              onChangeText={setEmail}
              error={emailError}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="usuario@vault-tec.com"
            />
            <PipInput
              label="Contraseña"
              value={password}
              onChangeText={setPassword}
              error={passwordError}
              secureTextEntry
              placeholder="••••••••"
            />
            <PipButton
              filled
              label={loading ? 'Verificando...' : 'Conceder acceso'}
              onPress={handleSubmit}
              disabled={loading}
              style={styles.submit}
            />

            <Link href="/(auth)/register" style={styles.link}>
              <PipText variant="small" color={colors.textDim}>
                ¿No tenés cuenta? Registrate
              </PipText>
            </Link>
          </View>

          <PipText variant="small" color={colors.textDim} style={styles.footer}>
            ACCESO RESTRINGIDO · AUTORIZACIÓN VAULT-TEC
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
  errorCard: {
    marginBottom: 16,
  },
  form: {
    gap: 14,
  },
  submit: {
    marginTop: 4,
  },
  link: {
    alignSelf: 'center',
    marginTop: 4,
  },
  footer: {
    textAlign: 'center',
    marginTop: 'auto',
    paddingTop: 24,
  },
});
