import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Fonts, Radii } from '@/theme/tokens';

interface BadgeProps {
  label: string;
  variant?: 'upcoming' | 'live' | 'completed' | 'verified' | 'pending' | 'rejected' | 'default';
}

export function Badge({ label, variant = 'default' }: BadgeProps) {
  const getBadgeStyle = () => {
    switch (variant) {
      case 'upcoming':
        return {
          bg: '#E8F5E9',
          color: '#2E7D32',
        };
      case 'live':
        return {
          bg: '#FEE2E2',
          color: '#DC2626',
        };
      case 'completed':
        return {
          bg: '#F1F5F9',
          color: '#475569',
        };
      case 'verified':
        return {
          bg: '#DCFCE7',
          color: '#15803D',
        };
      case 'pending':
        return {
          bg: '#FEF3C7',
          color: '#B45309',
        };
      case 'rejected':
        return {
          bg: '#FEE2E2',
          color: '#B91C1C',
        };
      default:
        return {
          bg: '#EFF6FF',
          color: '#1D4ED8',
        };
    }
  };

  const current = getBadgeStyle();

  return (
    <View style={[styles.badge, { backgroundColor: current.bg }]}>
      <Text style={[styles.text, { color: current.color }]}>{label.toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radii.sm,
    alignSelf: 'flex-start',
  },
  text: {
    fontFamily: Fonts.bold,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
