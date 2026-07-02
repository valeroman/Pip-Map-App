import { Link } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { PipButton } from '@/components/PipButton';
import { PipCard } from '@/components/PipCard';
import { PipInput } from '@/components/PipInput';
import { PipScreen } from '@/components/PipScreen';
import { PipText } from '@/components/PipText';
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
      <PipText variant="title" glow style={styles.header}>
        Acceso Vault-Tec
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
          label={loading ? 'Verificando...' : 'Ingresar'}
          onPress={handleSubmit}
          disabled={loading}
        />

        <Link href="/(auth)/register" style={styles.link}>
          <PipText variant="small" color={colors.textDim}>
            ¿No tenés cuenta? Registrate
          </PipText>
        </Link>
      </View>
    </PipScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: 20,
  },
  errorCard: {
    marginBottom: 16,
  },
  form: {
    gap: 14,
  },
  link: {
    alignSelf: 'center',
    marginTop: 4,
  },
});
