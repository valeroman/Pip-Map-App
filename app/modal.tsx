import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { PipButton } from '@/components/PipButton';
import { PipCard } from '@/components/PipCard';
import { PipScreen } from '@/components/PipScreen';
import { PipText } from '@/components/PipText';
import { useGroup } from '@/context/GroupContext';
import { supabase } from '@/lib/supabase';
import { colors } from '@/theme';

export default function ModalScreen() {
  const [loading, setLoading] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const { groupName, joinCode, members, leaveGroup } = useGroup();

  const handleLogout = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setLoading(false);
  };

  const handleLeaveGroup = async () => {
    setLeaving(true);
    await leaveGroup();
    setLeaving(false);
  };

  const confirmLeaveGroup = () => {
    Alert.alert('Salir del grupo', '¿Seguro que querés salir de tu grupo familiar?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Salir', style: 'destructive', onPress: handleLeaveGroup },
    ]);
  };

  return (
    <PipScreen>
      <ScrollView contentContainerStyle={styles.container}>
        <PipText variant="title" glow>
          Terminal de acceso
        </PipText>
        <PipText variant="body" color={colors.textDim} style={styles.body}>
          Pip-Map App — sistema de navegación estilo Vault-Tec.
        </PipText>

        {groupName ? (
          <PipCard style={styles.groupCard}>
            <PipText variant="label" color={colors.accent}>
              Mi grupo
            </PipText>

            <View style={styles.groupRow}>
              <PipText variant="small" color={colors.textDim}>
                Nombre
              </PipText>
              <PipText variant="body">{groupName}</PipText>
            </View>

            <View style={styles.groupRow}>
              <PipText variant="small" color={colors.textDim}>
                Código de invitación
              </PipText>
              <PipText variant="body" color={colors.warning} selectable>
                {joinCode}
              </PipText>
            </View>

            <View style={styles.groupRow}>
              <PipText variant="small" color={colors.textDim}>
                Miembros
              </PipText>
              {members.map((member) => (
                <PipText key={member.user_id} variant="body">
                  {member.display_name}
                </PipText>
              ))}
            </View>

            <PipButton
              label={leaving ? 'Saliendo...' : 'Salir del grupo'}
              color={colors.danger}
              onPress={confirmLeaveGroup}
              disabled={leaving}
              style={styles.leaveButton}
            />
          </PipCard>
        ) : null}

        <PipButton
          label={loading ? 'Cerrando sesión...' : 'Cerrar sesión'}
          color={colors.danger}
          onPress={handleLogout}
          disabled={loading}
          style={styles.logoutButton}
        />
      </ScrollView>

      <StatusBar style={Platform.OS === 'ios' ? 'light' : 'auto'} />
    </PipScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  body: {
    marginTop: 12,
    textAlign: 'center',
  },
  groupCard: {
    marginTop: 24,
    width: '100%',
    gap: 12,
  },
  groupRow: {
    gap: 2,
  },
  leaveButton: {
    marginTop: 4,
  },
  logoutButton: {
    marginTop: 24,
  },
});
