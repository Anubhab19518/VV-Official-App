import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  Modal,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/auth-context';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Colors, Radii, Fonts } from '@/theme/tokens';

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, 24);
  const { user, profile, officialDisplayName, updateOfficialName, logout } = useAuth();

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [nameInput, setNameInput] = useState(officialDisplayName);
  const [isSavingName, setIsSavingName] = useState(false);

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out of the Official App?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/login');
        },
      },
    ]);
  };

  const handleSaveName = async () => {
    if (!nameInput.trim()) {
      Alert.alert('Invalid Name', 'Please enter your full name');
      return;
    }
    setIsSavingName(true);
    try {
      await updateOfficialName(nameInput.trim());
      setIsEditModalOpen(false);
      Alert.alert('Success', 'Official name updated successfully');
    } catch {
      Alert.alert('Notice', 'Name saved locally');
      setIsEditModalOpen(false);
    } finally {
      setIsSavingName(false);
    }
  };

  const verificationStatus = profile?.verificationStatus || 'PENDING';

  return (
    <GradientBackground style={styles.container}>
      <View style={[styles.innerContainer, { paddingTop: topInset }]}>
        <View style={styles.header}>
          <Text style={styles.title}>Official Profile</Text>
          <Text style={styles.subtitle}>Credentials & certified official identity</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* User Card */}
          <View style={styles.profileCard}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={36} color="#7C3AED" />
            </View>
            <View style={styles.nameRow}>
              <Text style={styles.name}>{officialDisplayName}</Text>
              <TouchableOpacity
                onPress={() => {
                  setNameInput(officialDisplayName);
                  setIsEditModalOpen(true);
                }}
                style={styles.editNameBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="pencil" size={14} color={Colors.primary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.email}>{user?.email || ''}</Text>
            <View style={styles.roleTag}>
              <Ionicons name="shield-checkmark" size={14} color={Colors.primary} />
              <Text style={styles.roleTagText}>Certified Match Official</Text>
            </View>
          </View>

          {/* Officiating Credentials Card */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Officiating Details</Text>

            <View style={styles.row}>
              <Text style={styles.rowLabel}>Sport</Text>
              <View style={styles.rowValueWithIcon}>
                <Ionicons name="baseball" size={16} color="#DC2626" />
                <Text style={styles.rowValue}>Cricket</Text>
              </View>
            </View>

            <View style={styles.row}>
              <Text style={styles.rowLabel}>Official Level</Text>
              <Text style={styles.rowValue}>{profile?.level || 'State / Club Level'}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.rowLabel}>Experience</Text>
              <Text style={styles.rowValue}>{profile?.experienceYears ?? 3} Years</Text>
            </View>

            <View style={[styles.row, { borderBottomWidth: 0 }]}>
              <Text style={styles.rowLabel}>Certificate Status</Text>
              <Badge
                label={verificationStatus}
                variant={
                  verificationStatus === 'VERIFIED'
                    ? 'verified'
                    : verificationStatus === 'REJECTED'
                    ? 'rejected'
                    : 'pending'
                }
              />
            </View>
          </View>

          {/* Status explanation */}
          {verificationStatus === 'PENDING' && (
            <View style={styles.noticeBox}>
              <Ionicons name="information-circle-outline" size={20} color={Colors.primary} />
              <Text style={styles.noticeText}>
                Your official credentials are under review by tournament administration. You can still officiate assigned matches.
              </Text>
            </View>
          )}

          {/* Sign Out Button */}
          <View style={styles.actionContainer}>
            <Button
              title="Sign Out"
              variant="dangerOutline"
              onPress={handleLogout}
              style={styles.logoutBtn}
            />
          </View>
        </ScrollView>
      </View>

      {/* Edit Name Modal */}
      <Modal visible={isEditModalOpen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Official Name</Text>
              <TouchableOpacity onPress={() => setIsEditModalOpen(false)}>
                <Ionicons name="close" size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtext}>
              Enter your real full name to be displayed on match sheets and live scorecards.
            </Text>

            <TextInput
              style={styles.modalInput}
              value={nameInput}
              onChangeText={setNameInput}
              placeholder="e.g. Alex Kumar"
              placeholderTextColor={Colors.textMuted}
              autoFocus
            />

            <View style={styles.modalActions}>
              <Button
                title="Cancel"
                variant="outline"
                size="md"
                onPress={() => setIsEditModalOpen(false)}
                style={{ flex: 1 }}
              />
              <Button
                title="Save Name"
                variant="primary"
                size="md"
                loading={isSavingName}
                onPress={handleSaveName}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>
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
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  title: {
    fontFamily: Fonts.bold,
    fontSize: 24,
    color: Colors.text,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radii.xl,
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: Colors.shadowPurple,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F5F3FF',
    borderWidth: 1.5,
    borderColor: '#DDD6FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    fontFamily: Fonts.bold,
    fontSize: 19,
    color: Colors.text,
  },
  editNameBtn: {
    padding: 4,
    backgroundColor: '#F5F3FF',
    borderRadius: Radii.full,
  },
  email: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  roleTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    backgroundColor: '#F5F3FF',
    borderWidth: 1,
    borderColor: '#DDD6FE',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: Radii.full,
  },
  roleTagText: {
    fontFamily: Fonts.semiBold,
    fontSize: 12,
    color: Colors.primary,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radii.xl,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
    shadowColor: Colors.shadowPurple,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionTitle: {
    fontFamily: Fonts.bold,
    fontSize: 16,
    color: Colors.text,
    marginBottom: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F3FF',
  },
  rowLabel: {
    fontFamily: Fonts.medium,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  rowValue: {
    fontFamily: Fonts.semiBold,
    fontSize: 14,
    color: Colors.text,
  },
  rowValueWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  noticeBox: {
    flexDirection: 'row',
    backgroundColor: '#FAF5FF',
    padding: 14,
    borderRadius: Radii.lg,
    gap: 10,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  noticeText: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: '#6D28D9',
    flex: 1,
    lineHeight: 18,
  },
  actionContainer: {
    marginTop: 8,
  },
  logoutBtn: {
    width: '100%',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radii.xl,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  modalTitle: {
    fontFamily: Fonts.bold,
    fontSize: 17,
    color: Colors.text,
  },
  modalSubtext: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 16,
    lineHeight: 18,
  },
  modalInput: {
    fontFamily: Fonts.medium,
    fontSize: 15,
    color: Colors.text,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radii.lg,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 18,
    backgroundColor: '#FAF5FF',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
});
