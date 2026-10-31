export const Colors = {
  // Rich light purple background palette
  background: '#FAF5FF',
  backgroundLight: '#FAF5FF',
  backgroundMid: '#F3E8FF',
  backgroundEnd: '#EDE9FE',

  // Surfaces & Glassmorphism
  surface: '#FFFFFF',
  surfaceGlass: 'rgba(255, 255, 255, 0.94)',
  surfaceSubtle: '#F5F3FF',
  surfaceHighlight: '#EDE9FE',
  surfaceSelected: '#DDD6FE',

  // Text hierarchy
  text: '#1E1B4B',           // Deep royal navy/indigo
  textSecondary: '#6B7280',  // Muted body
  textMuted: '#9CA3AF',      // Tertiary labels
  textInverse: '#FFFFFF',
  textPurple: '#6D28D9',     // Purple brand text
  textPurpleDark: '#4C1D95',

  // Brand Primary: Luminous Royal Purple
  primary: '#7C3AED',
  primaryHover: '#6D28D9',
  primaryLight: '#EDE9FE',
  primarySoft: '#F5F3FF',

  // Accent sports
  accentCricket: '#059669',
  accentCricketLight: '#D1FAE5',

  // Borders & Dividers
  border: '#E9D5FF',
  borderSubtle: 'rgba(168, 85, 247, 0.16)',
  borderFocus: '#7C3AED',
  borderSelected: '#8B5CF6',

  // Status
  danger: '#DC2626',
  dangerLight: '#FEE2E2',

  warning: '#D97706',
  warningLight: '#FEF3C7',

  success: '#16A34A',
  successLight: '#DCFCE7',

  // Soft Purple Shadows
  cardShadow: 'rgba(124, 58, 237, 0.08)',
  shadowPurple: '#7C3AED',
};

export const Gradients = {
  purpleLight: ['#FAF5FF', '#F3E8FF', '#EDE9FE'] as const,
  purpleHero: ['#7C3AED', '#6D28D9'] as const,
  purpleSoft: ['#FFFFFF', '#F5F3FF'] as const,
  purpleCard: ['#FFFFFF', '#FAF5FF'] as const,
  purpleAccent: ['#8B5CF6', '#7C3AED'] as const,
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const Radii = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 18,
  xxl: 24,
  full: 9999,
};

export const Fonts = {
  regular: 'Sora_400Regular',
  medium: 'Sora_500Medium',
  semiBold: 'Sora_600SemiBold',
  bold: 'Sora_700Bold',
  extraBold: 'Sora_800ExtraBold',
};

export const Typography = {
  hero: {
    fontFamily: Fonts.extraBold,
    fontSize: 28,
    lineHeight: 36,
    color: Colors.text,
  },
  title1: {
    fontFamily: Fonts.bold,
    fontSize: 24,
    lineHeight: 30,
    color: Colors.text,
  },
  title2: {
    fontFamily: Fonts.bold,
    fontSize: 18,
    lineHeight: 24,
    color: Colors.text,
  },
  title3: {
    fontFamily: Fonts.semiBold,
    fontSize: 16,
    lineHeight: 22,
    color: Colors.text,
  },
  body: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.text,
  },
  bodyMedium: {
    fontFamily: Fonts.medium,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.text,
  },
  bodyBold: {
    fontFamily: Fonts.semiBold,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.text,
  },
  caption: {
    fontFamily: Fonts.medium,
    fontSize: 12,
    lineHeight: 16,
    color: Colors.textSecondary,
  },
  captionSmall: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    lineHeight: 14,
    color: Colors.textMuted,
  },
};
