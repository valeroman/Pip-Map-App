import { useEffect, useRef } from 'react';
import { Animated, Easing, ViewStyle } from 'react-native';

import { colors } from '@/theme';

type Props = {
  color?: string;
  size?: number;
  style?: ViewStyle;
};

export function PulsingDot({ color = colors.primary, size = 10, style }: Props) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <Animated.View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          shadowColor: color,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.9,
          shadowRadius: 6,
          elevation: 6,
          opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }),
          transform: [
            { scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.15] }) },
          ],
        },
        style,
      ]}
    />
  );
}
