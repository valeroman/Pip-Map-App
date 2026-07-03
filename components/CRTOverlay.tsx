import { useEffect, useMemo, useRef } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { colors } from '@/theme';

const LINE_SPACING = 4;
const SCROLL_DURATION_MS = 350;
// How far each corner's darkening reaches along the diagonal before fading
// to fully transparent (0 = the corner itself, 1 = the opposite corner).
// Kept short so the four corners don't overlap into a hazy center — at 0.62
// they stacked and darkened the whole screen instead of just the corners.
const CORNER_REACH = 0.38;
const VIGNETTE_COLOR = 'rgba(0, 0, 0, 0.25)';

export function CRTOverlay() {
  const { height } = Dimensions.get('window');
  // Extra rows beyond the screen height so the loop can shift by one
  // LINE_SPACING without ever revealing a gap at the bottom edge.
  const lineCount = useMemo(() => Math.ceil(height / LINE_SPACING) + 2, [height]);
  const scroll = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(scroll, {
        toValue: 1,
        duration: SCROLL_DURATION_MS,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [scroll]);

  const translateY = scroll.interpolate({
    inputRange: [0, 1],
    outputRange: [0, LINE_SPACING],
  });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ translateY }] }]}>
        {Array.from({ length: lineCount }, (_, i) => (
          <View key={i} style={[styles.line, { top: i * LINE_SPACING - LINE_SPACING }]} />
        ))}
      </Animated.View>

      {/*
        Corner vignette: approximates the mockup's radial-gradient without SVG.
        Each gradient spans the FULL screen (no partial width/height box) so
        there's no internal edge where two boxes meet — that previously showed
        up as a faint seam down the middle of the screen. Every corner fades
        from `overlayShadow` at its own corner to fully transparent partway
        along the diagonal, then stays transparent the rest of the way.
      */}
      <LinearGradient
        colors={[VIGNETTE_COLOR, 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: CORNER_REACH, y: CORNER_REACH }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={[VIGNETTE_COLOR, 'transparent']}
        start={{ x: 1, y: 0 }}
        end={{ x: 1 - CORNER_REACH, y: CORNER_REACH }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={[VIGNETTE_COLOR, 'transparent']}
        start={{ x: 0, y: 1 }}
        end={{ x: CORNER_REACH, y: 1 - CORNER_REACH }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={[VIGNETTE_COLOR, 'transparent']}
        start={{ x: 1, y: 1 }}
        end={{ x: 1 - CORNER_REACH, y: 1 - CORNER_REACH }}
        style={StyleSheet.absoluteFill}
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
});
