import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, Radii } from '@/theme/tokens';

interface FollowOnModalProps {
  visible: boolean;
  onClose: () => void;
  teamAName: string;
  teamBName: string;
  teamARuns: number;
  teamBRuns: number;
  lead: number;
  threshold: number;
  onDecide: (decision: 'ENFORCE' | 'DECLINE') => Promise<void>;
}

export function FollowOnModal({
  visible,
  onClose,
  teamAName,
  teamBName,
  teamARuns,
  teamBRuns,
  lead,
  threshold,
  onDecide,
}: FollowOnModalProps) {
  const [loadingDecision, setLoadingDecision] = useState<'ENFORCE' | 'DECLINE' | null>(null);
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 24);

  const handleDecision = async (decision: 'ENFORCE' | 'DECLINE') => {
    setLoadingDecision(decision);
    try {
      await onDecide(decision);
      onClose();
    } catch {
      // Alert handled by caller
    } finally {
      setLoadingDecision(null);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      statusBarTranslucent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.sheetContainer, { paddingBottom: bottomPadding }]}>
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={styles.iconBg}>
                <Ionicons name="repeat" size={20} color={Colors.primary} />
              </View>
              <View>
                <Text style={styles.title}>Follow-On Decision</Text>
                <Text style={styles.subtitle}>MCC Law 14 — Enforce or Decline Follow-On</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.body}>
            {/* Lead Breakdown Card */}
            <View style={styles.card}>
              <View style={styles.scoreRow}>
                <View style={styles.teamCol}>
                  <Text style={styles.teamLabel}>1st Innings (Bat 1)</Text>
                  <Text style={styles.teamName}>{teamAName}</Text>
                  <Text style={styles.scoreText}>{teamARuns} runs</Text>
                </View>

                <View style={styles.vsBadge}>
                  <Text style={styles.vsText}>VS</Text>
                </View>

                <View style={styles.teamCol}>
                  <Text style={styles.teamLabel}>2nd Innings (Bat 2)</Text>
                  <Text style={styles.teamName}>{teamBName}</Text>
                  <Text style={styles.scoreText}>{teamBRuns} runs</Text>
                </View>
              </View>

              <View style={styles.leadStrip}>
                <View style={styles.leadItem}>
                  <Text style={styles.leadLabel}>First Innings Lead</Text>
                  <Text style={styles.leadValue}>+{lead} runs</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.leadItem}>
                  <Text style={styles.leadLabel}>Law 14 Threshold</Text>
                  <Text style={styles.thresholdValue}>{threshold} runs</Text>
                </View>
              </View>
            </View>

            {/* Explanatory Banner */}
            <View style={styles.explanationBanner}>
              <Ionicons name="shield-checkmark" size={18} color="#059669" />
              <Text style={styles.explanationText}>
                {teamAName} holds a lead of {lead} runs, which meets or exceeds the required threshold of {threshold} runs. As the fielding captain has the prerogative, select whether to enforce or decline.
              </Text>
            </View>

            {/* Decision Buttons */}
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.decisionCard, styles.enforceCard]}
                activeOpacity={0.8}
                disabled={loadingDecision !== null}
                onPress={() => handleDecision('ENFORCE')}
              >
                <View style={styles.decisionIconBgEnforce}>
                  <Ionicons name="arrow-down-circle" size={22} color="#FFFFFF" />
                </View>
                <View style={styles.decisionTextCol}>
                  <Text style={styles.decisionTitleEnforce}>
                    {loadingDecision === 'ENFORCE' ? 'Enforcing...' : 'Enforce Follow-On'}
                  </Text>
                  <Text style={styles.decisionDesc}>
                    {teamBName} bats again in Innings 3 to clear the deficit of {lead} runs.
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.decisionCard, styles.declineCard]}
                activeOpacity={0.8}
                disabled={loadingDecision !== null}
                onPress={() => handleDecision('DECLINE')}
              >
                <View style={styles.decisionIconBgDecline}>
                  <Ionicons name="arrow-up-circle" size={22} color={Colors.primary} />
                </View>
                <View style={styles.decisionTextCol}>
                  <Text style={styles.decisionTitleDecline}>
                    {loadingDecision === 'DECLINE' ? 'Declining...' : 'Decline (Bat Normal)'}
                  </Text>
                  <Text style={styles.decisionDesc}>
                    {teamAName} bats again in Innings 3 to build their lead before setting a target.
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(30, 27, 75, 0.5)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: Radii.xxl,
    borderTopRightRadius: Radii.xxl,
    paddingBottom: 28,
    shadowColor: Colors.shadowPurple,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  iconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5F3FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: Fonts.bold,
    fontSize: 17,
    color: Colors.text,
  },
  subtitle: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: Radii.full,
    backgroundColor: Colors.surfaceSubtle,
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  card: {
    backgroundColor: '#F5F3FF',
    borderWidth: 1,
    borderColor: '#DDD6FE',
    borderRadius: Radii.lg,
    padding: 14,
    marginBottom: 14,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  teamCol: {
    flex: 1,
    alignItems: 'center',
  },
  teamLabel: {
    fontFamily: Fonts.regular,
    fontSize: 10,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  teamName: {
    fontFamily: Fonts.semiBold,
    fontSize: 13,
    color: Colors.text,
    textAlign: 'center',
  },
  scoreText: {
    fontFamily: Fonts.extraBold,
    fontSize: 16,
    color: Colors.primary,
    marginTop: 2,
  },
  vsBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: '#FFFFFF',
    borderRadius: Radii.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  vsText: {
    fontFamily: Fonts.bold,
    fontSize: 10,
    color: Colors.textSecondary,
  },
  leadStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#FFFFFF',
    borderRadius: Radii.md,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  leadItem: {
    alignItems: 'center',
  },
  leadLabel: {
    fontFamily: Fonts.regular,
    fontSize: 10,
    color: Colors.textSecondary,
  },
  leadValue: {
    fontFamily: Fonts.extraBold,
    fontSize: 15,
    color: Colors.accentCricket,
    marginTop: 2,
  },
  thresholdValue: {
    fontFamily: Fonts.bold,
    fontSize: 15,
    color: Colors.text,
    marginTop: 2,
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: Colors.border,
  },
  explanationBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: Radii.md,
    padding: 10,
    marginBottom: 16,
  },
  explanationText: {
    flex: 1,
    fontFamily: Fonts.regular,
    fontSize: 11,
    color: '#065F46',
    lineHeight: 16,
  },
  actions: {
    gap: 10,
  },
  decisionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: Radii.lg,
    borderWidth: 1.5,
  },
  enforceCard: {
    backgroundColor: '#FAF5FF',
    borderColor: Colors.primary,
  },
  declineCard: {
    backgroundColor: '#FFFFFF',
    borderColor: Colors.border,
  },
  decisionIconBgEnforce: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  decisionIconBgDecline: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F3FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  decisionTextCol: {
    flex: 1,
  },
  decisionTitleEnforce: {
    fontFamily: Fonts.bold,
    fontSize: 14,
    color: Colors.primary,
  },
  decisionTitleDecline: {
    fontFamily: Fonts.bold,
    fontSize: 14,
    color: Colors.text,
  },
  decisionDesc: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});
