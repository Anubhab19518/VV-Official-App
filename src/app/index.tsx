import React, { useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { useAuth } from '@/context/auth-context';
import { Colors } from '@/theme/tokens';

export default function InitialGatewayScreen() {
  const router = useRouter();
  const { isLoading, isAuthenticated, isOnboarded, needsOnboarding } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      router.replace('/login');
    } else if (isOnboarded) {
      router.replace('/(tabs)/home');
    } else if (needsOnboarding) {
      router.replace('/onboarding/sport');
    } else {
      router.replace('/login');
    }
  }, [isLoading, isAuthenticated, isOnboarded, needsOnboarding, router]);

  return (
    <GradientBackground style={styles.container}>
      <View style={styles.content}>
        <BrandLogo size="lg" />
        <ActivityIndicator size="small" color={Colors.primary} style={styles.loader} />
      </View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loader: {
    marginTop: 24,
  },
});
