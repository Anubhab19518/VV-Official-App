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
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { useAuth } from '@/context/auth-context';
import { Colors, Radii, Fonts } from '@/theme/tokens';

export default function UploadCertificateScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, 16);
  const { onboardingDraft, updateOnboardingDraft, completeOnboarding } = useAuth();

  const [fileName, setFileName] = useState<string | null>(
    onboardingDraft.certificateFileName || 'umpire_certificate.pdf'
  );
  const [fileSize, setFileSize] = useState<string | null>(
    onboardingDraft.certificateFileSize || '2.4 MB'
  );
  const [loading, setLoading] = useState(false);

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/jpeg', 'image/png'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const sizeMb = asset.size ? (asset.size / (1024 * 1024)).toFixed(1) + ' MB' : '1.5 MB';
        setFileName(asset.name);
        setFileSize(sizeMb);
        updateOnboardingDraft({
          certificateFileName: asset.name,
          certificateFileSize: sizeMb,
          certificateUrl: `https://certificates.velocityventures.internal/${encodeURIComponent(asset.name)}`,
        });
      }
    } catch {
      // Fallback for simulation
      setFileName('umpire_certificate.pdf');
      setFileSize('2.4 MB');
      updateOnboardingDraft({
        certificateFileName: 'umpire_certificate.pdf',
        certificateFileSize: '2.4 MB',
        certificateUrl: 'https://certificates.velocityventures.internal/umpire_certificate.pdf',
      });
    }
  };

  const handleRemoveFile = () => {
    setFileName(null);
    setFileSize(null);
    updateOnboardingDraft({
      certificateFileName: null,
      certificateFileSize: null,
      certificateUrl: null,
    });
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      await completeOnboarding({
        preferredSportId: 'cricket',
        level: 'PROFESSIONAL',
        experienceYears: onboardingDraft.experienceYears || 3,
        certificateUrl:
          onboardingDraft.certificateUrl ||
          'https://certificates.velocityventures.internal/umpire_certificate.pdf',
      });
      router.replace('/(tabs)/home');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to complete registration');
    } finally {
      setLoading(false);
    }
  };

  return (
    <GradientBackground style={styles.outerContainer}>
      <View style={[styles.innerContainer, { paddingTop: topInset }]}>
        <ScreenHeader showBack={true} />

        <View style={styles.container}>
          <Text style={styles.title}>Official Certification</Text>
          <Text style={styles.subtitle}>
            Upload your officiating badge, credential license, or state certification document.
          </Text>

          {/* Upload Area */}
          <TouchableOpacity
            style={styles.uploadDashedBox}
            activeOpacity={0.8}
            onPress={handlePickDocument}
          >
            <View style={styles.cloudIconCircle}>
              <Ionicons name="cloud-upload" size={36} color={Colors.primary} />
            </View>
            <Text style={styles.tapToUploadText}>Tap to select certificate file</Text>
            <Text style={styles.uploadFormats}>Supports PDF, PNG, JPG up to 10MB</Text>
          </TouchableOpacity>

          {/* Attached Document Card */}
          {fileName && (
            <View style={styles.fileCard}>
              <View style={styles.fileLeft}>
                <View style={styles.pdfIconBg}>
                  <Ionicons name="document-text" size={20} color={Colors.primary} />
                </View>
                <View>
                  <Text style={styles.fileName}>{fileName}</Text>
                  {fileSize && <Text style={styles.fileSize}>{fileSize}</Text>}
                </View>
              </View>

              <TouchableOpacity
                onPress={handleRemoveFile}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close-circle" size={20} color="#94A3B8" />
              </TouchableOpacity>
            </View>
          )}

          {/* Info Banner */}
          <View style={styles.infoBanner}>
            <Ionicons name="shield-checkmark" size={20} color={Colors.primary} />
            <Text style={styles.infoText}>
              Your certificate will be verified by administration. You can still officiate friendly matches immediately.
            </Text>
          </View>

          <View style={styles.footer}>
            <Button
              title="Submit & Finish Registration"
              onPress={handleComplete}
              loading={loading}
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
    marginBottom: 28,
    lineHeight: 18,
  },
  uploadDashedBox: {
    borderWidth: 1.5,
    borderColor: '#C4B5FD',
    borderStyle: 'dashed',
    borderRadius: Radii.xl,
    backgroundColor: '#FFFFFF',
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: Colors.shadowPurple,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  cloudIconCircle: {
    marginBottom: 10,
  },
  tapToUploadText: {
    fontFamily: Fonts.semiBold,
    fontSize: 15,
    color: Colors.text,
    marginBottom: 4,
  },
  uploadFormats: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  fileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
    shadowColor: Colors.shadowPurple,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  fileLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pdfIconBg: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#F5F3FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileName: {
    fontFamily: Fonts.semiBold,
    fontSize: 14,
    color: Colors.text,
  },
  fileSize: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  infoBanner: {
    flexDirection: 'row',
    backgroundColor: '#FAF5FF',
    borderWidth: 1,
    borderColor: '#E9D5FF',
    borderRadius: Radii.lg,
    padding: 14,
    gap: 10,
    alignItems: 'center',
  },
  infoText: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: '#6D28D9',
    lineHeight: 18,
    flex: 1,
  },
  footer: {
    marginTop: 'auto',
    paddingTop: 20,
  },
  continueBtn: {
    width: '100%',
  },
});
