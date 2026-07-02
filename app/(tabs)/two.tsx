import { FlatList, StyleSheet, View } from 'react-native';

import { PipScreen } from '@/components/PipScreen';
import { PipCard } from '@/components/PipCard';
import { PipText } from '@/components/PipText';
import { colors } from '@/theme';

type LogEntry = {
  id: string;
  title: string;
  detail: string;
  status: 'ok' | 'warning' | 'alert' | 'danger';
};

const STATUS_COLOR: Record<LogEntry['status'], string> = {
  ok: colors.primary,
  warning: colors.warning,
  alert: colors.accent,
  danger: colors.danger,
};

const LOG_ENTRIES: LogEntry[] = [
  { id: '1', title: 'Inventario sincronizado', detail: 'Todos los objetos catalogados', status: 'ok' },
  { id: '2', title: 'Radiación detectada', detail: 'Zona norte, nivel bajo', status: 'warning' },
  { id: '3', title: 'Cápsula localizada', detail: 'Chatarra Vault-Tec disponible', status: 'alert' },
  { id: '4', title: 'Señal hostil', detail: 'Contacto no identificado cerca', status: 'danger' },
  { id: '5', title: 'Ruta calculada', detail: 'Destino: Refugio 111', status: 'ok' },
];

export default function DataScreen() {
  return (
    <PipScreen style={styles.screen}>
      <PipText variant="title" glow style={styles.header}>
        Registro de datos
      </PipText>
      <FlatList
        data={LOG_ENTRIES}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <PipCard borderColor={STATUS_COLOR[item.status]} style={styles.entry}>
            <View style={styles.entryHeader}>
              <PipText variant="label" color={STATUS_COLOR[item.status]}>
                {item.status}
              </PipText>
            </View>
            <PipText variant="body">{item.title}</PipText>
            <PipText variant="small" color={colors.textDim}>
              {item.detail}
            </PipText>
          </PipCard>
        )}
      />
    </PipScreen>
  );
}

const styles = StyleSheet.create({
  screen: {
    padding: 0,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  list: {
    padding: 16,
    gap: 12,
  },
  entry: {
    gap: 4,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
});
