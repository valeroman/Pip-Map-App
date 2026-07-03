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

export default function RegisterScreen() {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [formError, setFormError] = useState('');
  const [formInfo, setFormInfo] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setFormError('');
    setFormInfo('');

    const isNameValid = displayName.trim().length > 0;
    const isEmailValid = EMAIL_REGEX.test(email);
    const isPasswordValid = password.length >= 6;

    setNameError(isNameValid ? '' : 'INGRESÁ UN NOMBRE');
    setEmailError(isEmailValid ? '' : 'FORMATO DE EMAIL INVÁLIDO');
    setPasswordError(isPasswordValid ? '' : 'MÍNIMO 6 CARACTERES');

    if (!isNameValid || !isEmailValid || !isPasswordValid) return;

    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName.trim() } },
    });

    setLoading(false);

    if (error || !data.user) {
      setFormError(translateAuthError(error?.message));
      return;
    }

    // Sin sesión inmediata significa que el proyecto de Supabase requiere confirmar
    // el email antes de loguear. La fila en `profiles` se crea recién en el primer
    // login exitoso (ver AuthContext), ya que el insert necesita una sesión activa.
    if (!data.session) {
      setFormInfo('CUENTA CREADA. REVISÁ TU EMAIL PARA CONFIRMARLA.');
    }
  };

  return (
    <PipScreen>
      <PipText variant="title" glow style={styles.header}>
        Registro Vault-Tec
      </PipText>

      {formError ? (
        <PipCard borderColor={colors.danger} style={styles.errorCard}>
          <PipText variant="label" color={colors.danger}>
            {formError}
          </PipText>
        </PipCard>
      ) : null}

      {formInfo ? (
        <PipCard borderColor={colors.primary} style={styles.errorCard}>
          <PipText variant="label" color={colors.primary}>
            {formInfo}
          </PipText>
        </PipCard>
      ) : null}

      <View style={styles.form}>
        <PipInput
          label="Nombre"
          value={displayName}
          onChangeText={setDisplayName}
          error={nameError}
          placeholder="Morador 111"
        />
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
          label={loading ? 'Registrando...' : 'Registrarse'}
          onPress={handleSubmit}
          disabled={loading}
        />

        <Link href="/(auth)/login" style={styles.link}>
          <PipText variant="small" color={colors.textDim}>
            ¿Ya tenés cuenta? Iniciá sesión
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
