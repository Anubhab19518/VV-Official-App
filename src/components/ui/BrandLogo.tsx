import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts } from '@/theme/tokens';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export function BrandLogo({ size = 'md', showText = true }: BrandLogoProps) {
  const iconSize = size === 'sm' ? 24 : size === 'md' ? 38 : 50;
  const fontSize = size === 'sm' ? 12 : size === 'md' ? 16 : 20;

  return (
    <View style={styles.container}>
      <View style={[styles.iconWrapper, { width: iconSize, height: iconSize }]}>
        <Ionicons name="shield-checkmark" size={iconSize} color={Colors.primary} />
      </View>
      {showText && (
        <View style={styles.textContainer}>
          <Text style={[styles.title, { fontSize }]}>VELOCITY</Text>
          <Text style={[styles.subtitle, { fontSize: fontSize * 0.7 }]}>VENTURES</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  textContainer: {
    alignItems: 'center',
  },
  title: {
    fontFamily: Fonts.extraBold,
    letterSpacing: 2,
    color: Colors.text,
  },
  subtitle: {
    fontFamily: Fonts.semiBold,
    letterSpacing: 3,
    color: Colors.textPurple,
    marginTop: -2,
  },
});
