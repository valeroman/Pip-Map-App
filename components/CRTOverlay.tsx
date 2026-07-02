import { useMemo } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { colors } from '@/theme';

const LINE_SPACING = 4;

export function CRTOverlay() {
  const { height } = Dimensions.get('window');
  const lineCount = useMemo(() => Math.ceil(height / LINE_SPACING), [height]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {Array.from({ length: lineCount }, (_, i) => (
        <View
          key={i}
          style={[styles.line, { top: i * LINE_SPACING }]}
        />
      ))}
      <LinearGradient
        colors={[colors.overlayShadow, 'transparent']}
        style={styles.vignetteTop}
      />
      <LinearGradient
        colors={['transparent', colors.overlayShadow]}
        style={styles.vignetteBottom}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  line: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.scanline,
  },
  vignetteTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 60,
  },
  vignetteBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
  },
});
