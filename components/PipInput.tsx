import { useState } from 'react';
import { StyleSheet, TextInput, TextInputProps, View } from 'react-native';

import { colors, boxGlow, fonts, typography } from '@/theme';
import { PipText } from './PipText';

type Props = TextInputProps & {
  label?: string;
  error?: string;
  color?: string;
};

export function PipInput({ label, error, color = colors.primary, style, ...rest }: Props) {
  const [focused, setFocused] = useState(false);
  const borderColor = error ? colors.danger : color;

  return (
    <View style={styles.container}>
      {label ? (
        <PipText variant="label" color={color}>
          {label}
        </PipText>
      ) : null}
      <TextInput
        onFocus={(e) => {
          setFocused(true);
          rest.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          rest.onBlur?.(e);
        }}
        placeholderTextColor={colors.textDim}
        style={[
          styles.base,
          { borderColor, color },
          focused ? boxGlow(borderColor, 6) : null,
          style,
        ]}
        {...rest}
      />
      {error ? (
        <PipText variant="small" color={colors.danger}>
          {error}
        </PipText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 4,
  },
  base: {
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: 'transparent',
    fontFamily: fonts.mono,
    fontSize: typography.body.fontSize,
    letterSpacing: typography.body.letterSpacing,
  },
});
