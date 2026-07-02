import { StyleSheet, View, ViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/theme';
import { CRTOverlay } from './CRTOverlay';

export function PipScreen({ style, children, ...rest }: ViewProps) {
  return (
    <View style={styles.root}>
      <SafeAreaView style={[styles.content, style]} {...rest}>
        {children}
      </SafeAreaView>
      <CRTOverlay />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    padding: 16,
  },
});
