import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Colors, Fonts, Radii } from '@/theme/tokens';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'outline' | 'dangerOutline' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  style,
  textStyle,
  icon,
}: ButtonProps) {
  const isPrimary = variant === 'primary';
  const isOutline = variant === 'outline';
  const isDangerOutline = variant === 'dangerOutline';
  const isSecondary = variant === 'secondary';

  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={isDisabled}
      style={[
        styles.base,
        size === 'sm' && styles.sizeSm,
        size === 'md' && styles.sizeMd,
        size === 'lg' && styles.sizeLg,
        isPrimary && styles.primary,
        isOutline && styles.outline,
        isDangerOutline && styles.dangerOutline,
        isSecondary && styles.secondary,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={isPrimary ? '#FFFFFF' : Colors.primary}
        />
      ) : (
        <>
          {icon}
          <Text
            style={[
              styles.textBase,
              size === 'sm' && styles.textSm,
              size === 'md' && styles.textMd,
              size === 'lg' && styles.textLg,
              isPrimary && styles.textPrimary,
              isOutline && styles.textOutline,
              isDangerOutline && styles.textDangerOutline,
              isSecondary && styles.textSecondary,
              textStyle,
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radii.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  sizeSm: {
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  sizeMd: {
    paddingVertical: 13,
    paddingHorizontal: 18,
  },
  sizeLg: {
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  primary: {
    backgroundColor: Colors.primary,
  },
  outline: {
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  dangerOutline: {
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.danger,
  },
  secondary: {
    backgroundColor: Colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  disabled: {
    opacity: 0.5,
  },
  textBase: {
    fontFamily: Fonts.semiBold,
    fontWeight: '600',
    textAlign: 'center',
  },
  textSm: {
    fontSize: 13,
  },
  textMd: {
    fontSize: 15,
  },
  textLg: {
    fontSize: 16,
  },
  textPrimary: {
    color: '#FFFFFF',
  },
  textOutline: {
    color: Colors.primary,
  },
  textDangerOutline: {
    color: Colors.danger,
  },
  textSecondary: {
    color: Colors.text,
  },
});
