export const palette = {
  crtBg: '#0A0F0A',
  pipGreen: '#21FF6C',
  pipGreenDim: '#3DCC7D',
  amber: '#FFB642',
  vaultYellow: '#FFC72C',
  blue: '#16385E',
  red: '#E23B3B',
  black: '#000000',
} as const;

export const colors = {
  background: palette.crtBg,
  surface: '#152218',
  primary: palette.pipGreen,
  primaryDim: palette.pipGreenDim,
  textPrimary: palette.pipGreen,
  textDim: palette.pipGreenDim,
  warning: palette.amber,
  accent: palette.vaultYellow,
  info: palette.blue,
  danger: palette.red,
  border: palette.pipGreenDim,
  scanline: 'rgba(33, 255, 108, 0.06)',
  overlayShadow: 'rgba(0, 0, 0, 0.5)',
} as const;

export type ColorToken = keyof typeof colors;
