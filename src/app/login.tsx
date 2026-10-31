import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { useAuth } from '@/context/auth-context';
import {
  getApiBaseUrl,
  setCustomApiBaseUrl,
  testServerConnection,
  getAutoDetectedHost,
} from '@/api/client';
import { Colors, Radii, Fonts } from '@/theme/tokens';

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { sendOtp, verifyOtp } = useAuth();

  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Server Settings Modal
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [serverUrlInput, setServerUrlInput] = useState(getApiBaseUrl());
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleSendOtp = async () => {
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const res = await sendOtp(email.trim());
      // Check if backend exposes dev OTP in development response
      if (res.otp) {
        setDevOtp(res.otp);
        setOtp(res.otp); // autofill in development
      } else {
        setDevOtp(null);
        setOtp('');
      }
      setStep('otp');
      setResendCooldown(30);
    } catch (err: any) {
      setError(err?.message || 'Failed to send OTP. Please verify server connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp.trim() || otp.trim().length < 4) {
      setError('Please enter the verification code');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      // Authenticate & retrieve official profile status directly
      const result = await verifyOtp(email.trim(), otp.trim());

      const profile = (result.profile as any)?.profile ?? result.profile;
      const isOfficial =
        result.isOfficial ||
        Boolean(result.user?.officialProfile) ||
        Boolean(result.user?.profiles?.official) ||
        Boolean(result.user?.roles?.includes('OFFICIAL')) ||
        Boolean(result.user?.roles?.includes('UMPIRE')) ||
        Boolean(profile?.preferredSportId) ||
        Boolean(profile?.level);

      // If user is already registered as an official, navigate directly to main dashboard
      if (isOfficial) {
        router.replace('/(tabs)/home');
      } else {
        router.replace('/onboarding/sport');
      }
    } catch (err: any) {
      setError(err?.message || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenSettings = () => {
    setServerUrlInput(getApiBaseUrl());
    setConnectionStatus(null);
    setShowSettingsModal(true);
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setConnectionStatus(null);
    const result = await testServerConnection(serverUrlInput.trim());
    setConnectionStatus(result);
    setTestingConnection(false);
  };

  const handleSaveServerUrl = async () => {
    await setCustomApiBaseUrl(serverUrlInput.trim());
    setShowSettingsModal(false);
    Alert.alert('Server URL Updated', `Active API base is now: ${getApiBaseUrl()}`);
  };

  const handleResetServerUrl = async () => {
    await setCustomApiBaseUrl(null);
    const autoUrl = getApiBaseUrl();
    setServerUrlInput(autoUrl);
    setConnectionStatus(null);
    Alert.alert('Reset Complete', `Restored auto-detected URL: ${autoUrl}`);
  };

  return (
    <GradientBackground style={styles.container}>
      <View style={[styles.innerContainer, { paddingTop: Math.max(insets.top, 20) }]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardView}
        >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.logoSection}>
            <BrandLogo size="lg" />
            <Text style={styles.roleTitle}>Match Official App</Text>
            <Text style={styles.roleSubtitle}>
              Official tournament officiating & live cricket scoring
            </Text>
          </View>

          <View style={styles.card}>
            {step === 'email' ? (
              <>
                <Text style={styles.cardHeader}>Sign In</Text>
                <Text style={styles.cardSubtext}>
                  Enter your email address to receive a secure one-time verification code.
                </Text>

                <Input
                  label="Email Address"
                  placeholder="e.g. umpire.official@velocity.com"
                  value={email}
                  onChangeText={(val) => {
                    setEmail(val);
                    setError(null);
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  error={error || undefined}
                />

                <Button
                  title="Send Verification Code"
                  onPress={handleSendOtp}
                  loading={loading}
                  style={styles.actionBtn}
                />

                <View style={styles.dividerRow}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>or</Text>
                  <View style={styles.dividerLine} />
                </View>

                <TouchableOpacity
                  style={styles.googleBtn}
                  activeOpacity={0.7}
                  onPress={() => {
                    Alert.alert(
                      'Google Sign-In',
                      'Google OAuth is reserved for a future release. Please use email OTP for authentication.'
                    );
                  }}
                >
                  <Ionicons name="logo-google" size={18} color="#EA4335" />
                  <Text style={styles.googleBtnText}>Continue with Google (Coming Soon)</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.cardHeader}>Verify OTP</Text>
                <Text style={styles.cardSubtext}>
                  Enter the 6-digit code sent to <Text style={styles.boldEmail}>{email}</Text>
                </Text>

                {devOtp && (
                  <View style={styles.devBanner}>
                    <Ionicons name="flash" size={16} color="#059669" />
                    <Text style={styles.devBannerText}>
                      Dev Mode: OTP detected <Text style={styles.devOtpCode}>{devOtp}</Text> (Autofilled)
                    </Text>
                  </View>
                )}

                <Input
                  label="Verification Code"
                  placeholder="Enter 6-digit code"
                  value={otp}
                  onChangeText={(val) => {
                    setOtp(val);
                    setError(null);
                  }}
                  keyboardType="number-pad"
                  maxLength={6}
                  error={error || undefined}
                />

                <Button
                  title="Verify & Enter App"
                  onPress={handleVerifyOtp}
                  loading={loading}
                  style={styles.actionBtn}
                />

                <View style={styles.otpActions}>
                  <TouchableOpacity
                    disabled={resendCooldown > 0 || loading}
                    onPress={handleSendOtp}
                  >
                    <Text
                      style={[
                        styles.resendText,
                        resendCooldown > 0 && styles.resendDisabled,
                      ]}
                    >
                      {resendCooldown > 0
                        ? `Resend Code in ${resendCooldown}s`
                        : 'Resend Verification Code'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => {
                      setStep('email');
                      setOtp('');
                      setError(null);
                    }}
                    style={styles.changeEmailBtn}
                  >
                    <Text style={styles.changeEmailText}>Use different email</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Floating Settings Gear Button */}
      <TouchableOpacity
        style={styles.floatingSettingsBtn}
        onPress={handleOpenSettings}
        activeOpacity={0.8}
        accessibilityLabel="Server connection settings"
      >
        <Ionicons name="settings-sharp" size={20} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Server Settings Modal */}
      <Modal visible={showSettingsModal} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Server Connection Settings</Text>
              <TouchableOpacity onPress={() => setShowSettingsModal(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Backend URL is auto-detected from the computer&apos;s Wi-Fi IP address ({getAutoDetectedHost()}).
            </Text>

            <Input
              label="Backend Server URL"
              placeholder="e.g. http://192.168.29.194:3000"
              value={serverUrlInput}
              onChangeText={setServerUrlInput}
              autoCapitalize="none"
              autoCorrect={false}
            />

            {connectionStatus && (
              <View
                style={[
                  styles.statusBanner,
                  connectionStatus.ok ? styles.statusBannerSuccess : styles.statusBannerError,
                ]}
              >
                <Ionicons
                  name={connectionStatus.ok ? 'checkmark-circle' : 'alert-circle'}
                  size={18}
                  color={connectionStatus.ok ? '#059669' : '#DC2626'}
                />
                <Text
                  style={[
                    styles.statusBannerText,
                    connectionStatus.ok ? styles.statusTextSuccess : styles.statusTextError,
                  ]}
                >
                  {connectionStatus.message}
                </Text>
              </View>
            )}

            <View style={styles.modalActionButtons}>
              <Button
                title={testingConnection ? 'Testing...' : 'Test Connection'}
                variant="outline"
                size="md"
                loading={testingConnection}
                onPress={handleTestConnection}
                style={{ flex: 1 }}
              />
              <Button
                title="Save & Apply"
                size="md"
                onPress={handleSaveServerUrl}
                style={{ flex: 1 }}
              />
            </View>

            <TouchableOpacity
              onPress={handleResetServerUrl}
              style={styles.resetButton}
            >
              <Text style={styles.resetButtonText}>Reset to Auto-detected IP</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 24,
    justifyContent: 'center',
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 28,
  },
  roleTitle: {
    fontFamily: Fonts.bold,
    fontSize: 22,
    color: Colors.text,
    marginTop: 16,
    letterSpacing: -0.3,
  },
  roleSubtitle: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.xl,
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.text,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  cardHeader: {
    fontFamily: Fonts.bold,
    fontSize: 20,
    color: Colors.text,
    marginBottom: 6,
  },
  cardSubtext: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 20,
    lineHeight: 18,
  },
  boldEmail: {
    fontFamily: Fonts.semiBold,
    color: Colors.text,
  },
  actionBtn: {
    marginTop: 8,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 12,
    color: Colors.textMuted,
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.lg,
    paddingVertical: 13,
  },
  googleBtnText: {
    fontFamily: Fonts.semiBold,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  devBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: Radii.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
    gap: 6,
  },
  devBannerText: {
    fontFamily: Fonts.medium,
    fontSize: 12,
    color: '#065F46',
    flex: 1,
  },
  devOtpCode: {
    fontFamily: Fonts.bold,
    color: '#047857',
  },
  otpActions: {
    alignItems: 'center',
    marginTop: 20,
    gap: 12,
  },
  resendText: {
    fontFamily: Fonts.semiBold,
    fontSize: 14,
    color: Colors.primary,
  },
  resendDisabled: {
    color: Colors.textMuted,
  },
  changeEmailBtn: {
    paddingVertical: 4,
  },
  changeEmailText: {
    fontFamily: Fonts.medium,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  floatingSettingsBtn: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.shadowPurple,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 27, 61, 0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radii.xl,
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  modalTitle: {
    fontFamily: Fonts.bold,
    fontSize: 18,
    color: Colors.text,
  },
  modalSubtitle: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 18,
    lineHeight: 18,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: Radii.md,
    marginBottom: 14,
  },
  statusBannerSuccess: {
    backgroundColor: '#ECFDF5',
  },
  statusBannerError: {
    backgroundColor: '#FEF2F2',
  },
  statusBannerText: {
    fontFamily: Fonts.semiBold,
    fontSize: 12,
    flex: 1,
  },
  statusTextSuccess: {
    color: '#059669',
  },
  statusTextError: {
    color: '#DC2626',
  },
  modalActionButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  resetButton: {
    alignItems: 'center',
    marginTop: 14,
    paddingVertical: 6,
  },
  resetButtonText: {
    fontFamily: Fonts.semiBold,
    fontSize: 13,
    color: Colors.primary,
  },
});
