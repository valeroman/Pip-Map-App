import { useState } from 'react';
import { Pressable, PressableProps, StyleSheet } from 'react-native';

import { colors, boxGlow } from '@/theme';
import { PipText } from './PipText';

type Props = PressableProps & {
  label: string;
  color?: string;
};

export function PipButton({ label, color = colors.primary, style, ...rest }: Props) {
  const [pressed, setPressed] = useState(false);

  return (
    <Pressable
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={(state) => [
        styles.base,
        { borderColor: color },
        pressed ? { backgroundColor: color } : boxGlow(color, 6),
        typeof style === 'function' ? style(state) : style,
      ]}
      {...rest}>
      <PipText variant="label" color={pressed ? colors.background : color}>
        {label}
      </PipText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
});
