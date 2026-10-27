export const theme = {
  colors: {
    background: '#0B0B10',
    surface: '#14141C',
    surfaceRaised: '#1C1C26',
    border: 'rgba(255,255,255,0.08)',
    text: '#F6F5FA',
    muted: '#9694A3',
    accent: '#45DCC0',
    accentDeep: '#1BAF9A',
    purple: '#A880FF',
    danger: '#FF7187',
    overlay: 'rgba(10,10,16,0.72)',
  },
  gradient: ['#39DCC0', '#8F6BFF'] as const,
  radius: { sm: 12, md: 20, lg: 28, pill: 999 },
  spacing: (value: number) => value * 4,
} as const;
