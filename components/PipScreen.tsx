import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, ViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/theme';
import { CRTOverlay } from './CRTOverlay';

const FLICKER_CYCLE_MS = 8000;
const FLICKER_DIP_MS = 90;
const FLICKER_HOLD_BEFORE_MS = FLICKER_CYCLE_MS * 0.96;
const FLICKER_HOLD_AFTER_MS = FLICKER_CYCLE_MS - FLICKER_HOLD_BEFORE_MS - FLICKER_DIP_MS * 2;

export function PipScreen({ style, children, ...rest }: ViewProps) {
  const flicker = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(FLICKER_HOLD_BEFORE_MS),
        Animated.timing(flicker, {
          toValue: 0.85,
          duration: FLICKER_DIP_MS,
          useNativeDriver: true,
        }),
        Animated.timing(flicker, {
          toValue: 1,
          duration: FLICKER_DIP_MS,
          useNativeDriver: true,
        }),
        Animated.delay(FLICKER_HOLD_AFTER_MS),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [flicker]);

  return (
    <Animated.View style={[styles.root, { opacity: flicker }]}>
      <SafeAreaView style={[styles.content, style]} {...rest}>
        {children}
      </SafeAreaView>
      <CRTOverlay />
    </Animated.View>
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
