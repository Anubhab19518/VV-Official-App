import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { useAuth } from '@/context/auth-context';
import { Colors, Radii, Fonts } from '@/theme/tokens';

export default function CompleteProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, 16);
  const { onboardingDraft, updateOnboardingDraft, completeOnboarding } = useAuth();

  const [fullName, setFullName] = useState(onboardingDraft.fullName || '');
  const [level, setLevel] = useState<'AMATEUR' | 'PROFESSIONAL'>(onboardingDraft.level || 'AMATEUR');
  const [experienceYears, setExperienceYears] = useState(
    onboardingDraft.experienceYears !== undefined ? String(onboardingDraft.experienceYears) : ''
  );
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    if (!fullName.trim()) {
      Alert.alert('Required Field', 'Please enter your full name');
      return;
    }

    const exp = parseInt(experienceYears, 10);
    if (isNaN(exp) || exp < 0) {
      Alert.alert('Invalid Experience', 'Please enter valid years of experience');
      return;
    }

    updateOnboardingDraft({
      fullName: fullName.trim(),
      level,
      experienceYears: exp,
      sportId: 'cricket',
    });

    if (level === 'PROFESSIONAL') {
      router.push('/onboarding/certificate');
    } else {
      setLoading(true);
      try {
        await completeOnboarding({
          preferredSportId: 'cricket',
          level: 'AMATEUR',
          experienceYears: exp,
          certificateUrl: null,
        });
        router.replace('/(tabs)/home');
      } catch (err: any) {
        Alert.alert('Error', err?.message || 'Failed to complete onboarding');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <GradientBackground style={styles.container}>
      <View style={[styles.innerContainer, { paddingTop: topInset }]}>
        <ScreenHeader showBack={true} />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardView}
        >
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.title}>Complete Your Profile</Text>
            <Text style={styles.subtitle}>
              Tell us more about your officiating experience.
            </Text>

            {/* Avatar Section */}
            <View style={styles.avatarContainer}>
              <View style={styles.avatarCircle}>
                <Ionicons name="person" size={44} color="#7C3AED" />
              </View>
              <TouchableOpacity style={styles.cameraBadge} activeOpacity={0.8}>
                <Ionicons name="camera" size={14} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {/* Full Name */}
            <Input
              label="Full Name"
              placeholder="e.g. Alex Kumar"
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
            />

            {/* Sport Selector */}
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Selected Sport</Text>
              <View style={styles.sportSelector}>
                <View style={styles.sportLeft}>
                  <View style={styles.cricketIconCircle}>
                    <Ionicons name="baseball" size={16} color="#DC2626" />
                  </View>
                  <Text style={styles.sportText}>Cricket</Text>
                </View>
                <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
              </View>
            </View>

            {/* Officiating Level */}
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Officiating Tier / Level</Text>
              <View style={styles.segmentedContainer}>
                <TouchableOpacity
                  style={[
                    styles.segmentOption,
                    level === 'AMATEUR' && styles.segmentOptionActive,
                  ]}
                  onPress={() => setLevel('AMATEUR')}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      level === 'AMATEUR' && styles.segmentTextActive,
                    ]}
                  >
                    Club / Amateur
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.segmentOption,
                    level === 'PROFESSIONAL' && styles.segmentOptionActive,
                  ]}
                  onPress={() => setLevel('PROFESSIONAL')}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      level === 'PROFESSIONAL' && styles.segmentTextActive,
                    ]}
                  >
                    Professional
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Experience Years */}
            <Input
              label="Years of Officiating Experience"
              placeholder="e.g. 5"
              value={experienceYears}
              onChangeText={setExperienceYears}
              keyboardType="number-pad"
              suffix="Years"
            />

            <View style={styles.footer}>
              <Button
                title={level === 'PROFESSIONAL' ? 'Next: Certificate Verification' : 'Finish & Enter App'}
                onPress={handleContinue}
                loading={loading}
                size="lg"
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  innerContainer: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 36,
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
  avatarContainer: {
    alignSelf: 'center',
    marginBottom: 24,
    position: 'relative',
  },
  avatarCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#F5F3FF',
    borderWidth: 1.5,
    borderColor: '#DDD6FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  field: {
    marginBottom: 18,
  },
  fieldLabel: {
    fontFamily: Fonts.semiBold,
    fontSize: 13,
    color: Colors.text,
    marginBottom: 8,
  },
  segmentedContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  segmentOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: Radii.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentOptionActive: {
    borderColor: Colors.primary,
    backgroundColor: '#F5F3FF',
  },
  segmentText: {
    fontFamily: Fonts.medium,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  segmentTextActive: {
    fontFamily: Fonts.bold,
    color: Colors.primary,
  },
  sportSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radii.lg,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sportLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cricketIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sportText: {
    fontFamily: Fonts.semiBold,
    fontSize: 14,
    color: Colors.text,
  },
  footer: {
    marginTop: 24,
  },
});
