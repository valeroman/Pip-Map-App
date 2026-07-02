import { View, ViewProps, StyleSheet } from 'react-native';

import { colors } from '@/theme';

type Props = ViewProps & {
  borderColor?: string;
};

export function PipCard({ borderColor = colors.border, style, children, ...rest }: Props) {
  return (
    <View style={[styles.base, { borderColor }, style]} {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderWidth: 1,
    padding: 14,
    backgroundColor: colors.surface,
  },
});
