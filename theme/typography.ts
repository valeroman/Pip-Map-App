export const fonts = {
  display: 'VT323_400Regular',
  mono: 'ShareTechMono_400Regular',
} as const;

export const typography = {
  display: {
    fontFamily: fonts.display,
    fontSize: 34,
    letterSpacing: 1.5,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 24,
    letterSpacing: 1.2,
  },
  label: {
    fontFamily: fonts.mono,
    fontSize: 12,
    letterSpacing: 2,
  },
  body: {
    fontFamily: fonts.mono,
    fontSize: 15,
    letterSpacing: 0.5,
  },
  small: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 0.5,
  },
} as const;

export type TypographyVariant = keyof typeof typography;
