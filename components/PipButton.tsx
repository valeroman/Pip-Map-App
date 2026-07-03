import { useState } from 'react';
import { Pressable, PressableProps, StyleSheet } from 'react-native';

import { colors, boxGlow } from '@/theme';
import { PipText } from './PipText';

type Props = PressableProps & {
  label: string;
  color?: string;
  filled?: boolean;
};

export function PipButton({ label, color = colors.primary, filled = false, style, ...rest }: Props) {
  const [pressed, setPressed] = useState(false);
  const isFilled = filled ? !pressed : pressed;

  return (
    <Pressable
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={(state) => [
        styles.base,
        { borderColor: color },
        isFilled ? { backgroundColor: color } : boxGlow(color, 6),
        typeof style === 'function' ? style(state) : style,
      ]}
      {...rest}>
      <PipText variant="label" color={isFilled ? colors.background : color}>
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
