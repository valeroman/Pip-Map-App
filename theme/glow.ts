import { colors } from './colors';

export const textGlow = (color: string = colors.primary, radius = 8) => ({
  textShadowColor: color,
  textShadowOffset: { width: 0, height: 0 },
  textShadowRadius: radius,
});

export const boxGlow = (color: string = colors.primary, radius = 10) => ({
  shadowColor: color,
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: 0.8,
  shadowRadius: radius,
  elevation: 6,
});
