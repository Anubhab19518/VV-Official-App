import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { Button } from '@/components/ui/Button';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { useAuth } from '@/context/auth-context';
import { Colors, Radii, Fonts } from '@/theme/tokens';

interface SportOption {
  id: string;
  name: string;
  iconName: keyof typeof Ionicons.glyphMap;
  isAvailable: boolean;
  color: string;
}

const SPORTS: SportOption[] = [
  {
    id: 'cricket',
    name: 'Cricket',
    iconName: 'baseball',
    isAvailable: true,
    color: '#DC2626',
  },
  {
    id: 'football',
    name: 'Football',
    iconName: 'football',
    isAvailable: false,
    color: '#0F1B3D',
  },
  {
    id: 'badminton',
    name: 'Badminton',
    iconName: 'tennisball',
    isAvailable: false,
    color: '#64748B',
  },
  {
    id: 'pickleball',
    name: 'Pickleball',
    iconName: 'disc',
    isAvailable: false,
    color: '#0284C7',
  },
];

export default function SportSelectionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, 16);
  const { onboardingDraft, updateOnboardingDraft } = useAuth();
  const [selectedSport, setSelectedSport] = useState<string>(onboardingDraft.sportId || 'cricket');

  const handleContinue = () => {
    if (!selectedSport) {
      Alert.alert('Selection Required', 'Please select a sport you officiate');
      return;
    }

    updateOnboardingDraft({ sportId: selectedSport });
    router.push('/onboarding/profile');
  };

  return (
    <GradientBackground style={styles.outerContainer}>
      <View style={[styles.innerContainer, { paddingTop: topInset }]}>
        <ScreenHeader showBack={false} />

        <View style={styles.container}>
          <View style={styles.logoSection}>
            <BrandLogo size="md" showText={false} />
          </View>

          <Text style={styles.title}>Select Your Sport</Text>
          <Text style={styles.subtitle}>
            Which sport are you certified or registering to officiate?
          </Text>

          <View style={styles.list}>
            {SPORTS.map((sport) => {
              const isSelected = selectedSport === sport.id;

              return (
                <TouchableOpacity
                  key={sport.id}
                  activeOpacity={sport.isAvailable ? 0.7 : 0.9}
                  disabled={!sport.isAvailable}
                  onPress={() => setSelectedSport(sport.id)}
                  style={[
                    styles.sportCard,
                    isSelected && styles.sportCardSelected,
                    !sport.isAvailable && styles.sportCardDisabled,
                  ]}
                >
                  <View style={styles.sportLeft}>
                    <View style={[styles.iconCircle, { backgroundColor: `${sport.color}15` }]}>
                      <Ionicons name={sport.iconName} size={22} color={sport.color} />
                    </View>
                    <View>
                      <Text
                        style={[
                          styles.sportName,
                          isSelected && styles.sportNameSelected,
                          !sport.isAvailable && styles.sportNameDisabled,
                        ]}
                      >
                        {sport.name}
                      </Text>
                      {!sport.isAvailable && (
                        <Text style={styles.comingSoonText}>Coming Soon</Text>
                      )}
                    </View>
                  </View>

                  {isSelected && (
                    <View style={styles.checkCircle}>
                      <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.footer}>
            <Button
              title="Continue"
              onPress={handleContinue}
              size="lg"
              style={styles.continueBtn}
            />
          </View>
        </View>
      </View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
  },
  innerContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  logoSection: {
    alignItems: 'center',
    marginVertical: 12,
  },
  title: {
    fontFamily: Fonts.bold,
    fontSize: 22,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  list: {
    gap: 12,
  },
  sportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radii.xl,
    paddingVertical: 14,
    paddingHorizontal: 16,
    shadowColor: Colors.shadowPurple,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  sportCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: '#F5F3FF',
  },
  sportCardDisabled: {
    opacity: 0.55,
    backgroundColor: '#F8FAFC',
  },
  sportLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sportName: {
    fontFamily: Fonts.semiBold,
    fontSize: 15,
    color: Colors.text,
  },
  sportNameSelected: {
    fontFamily: Fonts.bold,
    color: Colors.text,
  },
  sportNameDisabled: {
    color: Colors.textMuted,
  },
  comingSoonText: {
    fontFamily: Fonts.medium,
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    marginTop: 'auto',
    paddingTop: 20,
  },
  continueBtn: {
    width: '100%',
  },
});
