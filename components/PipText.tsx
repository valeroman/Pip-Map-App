import { Text, TextProps } from 'react-native';

import { colors, textGlow, typography, TypographyVariant } from '@/theme';

type Props = TextProps & {
  variant?: TypographyVariant;
  color?: string;
  glow?: boolean;
  uppercase?: boolean;
};

const AUTO_UPPERCASE_VARIANTS: TypographyVariant[] = ['display', 'title', 'label'];

export function PipText({
  variant = 'body',
  color = colors.textPrimary,
  glow = false,
  uppercase,
  style,
  children,
  ...rest
}: Props) {
  const shouldUppercase = uppercase ?? AUTO_UPPERCASE_VARIANTS.includes(variant);
  const content =
    shouldUppercase && typeof children === 'string' ? children.toUpperCase() : children;

  return (
    <Text
      style={[
        typography[variant],
        { color },
        glow ? textGlow(color) : null,
        style,
      ]}
      {...rest}>
      {content}
    </Text>
  );
}
