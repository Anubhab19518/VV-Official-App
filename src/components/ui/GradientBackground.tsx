import React, { ReactNode } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Gradients } from '@/theme/tokens';

interface GradientBackgroundProps {
  children?: ReactNode;
  style?: ViewStyle | ViewStyle[];
  colors?: readonly [string, string, ...string[]];
}

export function GradientBackground({
  children,
  style,
  colors = Gradients.purpleLight,
}: GradientBackgroundProps) {
  return (
    <View style={[styles.container, style]}>
      <LinearGradient
        colors={colors as unknown as [string, string, ...string[]]}
        locations={[0, 0.42, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.85, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
