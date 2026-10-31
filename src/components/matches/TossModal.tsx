import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { RecordTossResponse } from '@/types/api';
import { matchesApi } from '@/api/matches.api';
import { Colors, Fonts, Radii } from '@/theme/tokens';

interface TossModalProps {
  visible: boolean;
  onClose: () => void;
  matchId: string;
  teamA?: { id: string; name: string; shortName?: string };
  teamB?: { id: string; name: string; shortName?: string };
  initialToss?: {
    winnerTeamId?: string | null;
    decision?: 'BAT' | 'BOWL' | null;
  } | null;
  onTossSuccess: (result: RecordTossResponse) => void;
}

export function TossModal({
  visible,
  onClose,
  matchId,
  teamA,
  teamB,
  initialToss,
  onTossSuccess,
}: TossModalProps) {
  const insets = useSafeAreaInsets();
  const [winnerTeamId, setWinnerTeamId] = useState<string>('');
  const [decision, setDecision] = useState<'BAT' | 'BOWL'>('BAT');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      if (initialToss?.winnerTeamId) {
        setWinnerTeamId(initialToss.winnerTeamId);
      } else if (teamA?.id) {
        setWinnerTeamId(teamA.id);
      }
      if (initialToss?.decision) {
        setDecision(initialToss.decision);
      } else {
        setDecision('BAT');
      }
    }
  }, [visible, initialToss, teamA]);

  const handleConfirmToss = async () => {
    if (!winnerTeamId) {
      Alert.alert('Selection Missing', 'Please select which team won the toss.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await matchesApi.recordToss(matchId, {
        tossWinnerTeamId: winnerTeamId,
        tossDecision: decision,
      });

      if (res?.data) {
        onTossSuccess(res.data);
      } else {
        throw new Error(res?.message || 'Failed to record toss');
      }
    } catch (err: any) {
      Alert.alert(
        'Toss Recording Error',
        err?.message ||
          'Could not record the toss. Ensure the tournament is active and try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const winningTeam = winnerTeamId === teamA?.id ? teamA : winnerTeamId === teamB?.id ? teamB : null;
  const otherTeam = winnerTeamId === teamA?.id ? teamB : teamA;
  const bottomPadding = Math.max(insets.bottom, 24);

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
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Conduct Match Toss</Text>
              <Text style={styles.subtitle}>
                Record the toss winner and their officiating decision
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scrollBody}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {/* 1. Toss Winner Selection */}
            <Text style={styles.sectionHeading}>1. Who won the toss?</Text>
            <View style={styles.teamsRow}>
              {teamA && (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setWinnerTeamId(teamA.id)}
                  style={[
                    styles.teamCard,
                    winnerTeamId === teamA.id && styles.teamCardActive,
                  ]}
                >
                  <View style={styles.teamHeaderRow}>
                    <View
                      style={[
                        styles.teamAvatar,
                        winnerTeamId === teamA.id && styles.teamAvatarActive,
                      ]}
                    >
                      <Text style={styles.teamAvatarText}>
                        {teamA.shortName || teamA.name.slice(0, 3).toUpperCase()}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.radioCircle,
                        winnerTeamId === teamA.id && styles.radioCircleActive,
                      ]}
                    >
                      {winnerTeamId === teamA.id && (
                        <View style={styles.radioInnerCircle} />
                      )}
                    </View>
                  </View>
                  <Text
                    style={[
                      styles.teamCardName,
                      winnerTeamId === teamA.id && styles.teamCardNameActive,
                    ]}
                    numberOfLines={2}
                  >
                    {teamA.name}
                  </Text>
                </TouchableOpacity>
              )}

              {teamB && (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setWinnerTeamId(teamB.id)}
                  style={[
                    styles.teamCard,
                    winnerTeamId === teamB.id && styles.teamCardActive,
                  ]}
                >
                  <View style={styles.teamHeaderRow}>
                    <View
                      style={[
                        styles.teamAvatar,
                        styles.teamAvatarAlt,
                        winnerTeamId === teamB.id && styles.teamAvatarActive,
                      ]}
                    >
                      <Text style={styles.teamAvatarText}>
                        {teamB.shortName || teamB.name.slice(0, 3).toUpperCase()}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.radioCircle,
                        winnerTeamId === teamB.id && styles.radioCircleActive,
                      ]}
                    >
                      {winnerTeamId === teamB.id && (
                        <View style={styles.radioInnerCircle} />
                      )}
                    </View>
                  </View>
                  <Text
                    style={[
                      styles.teamCardName,
                      winnerTeamId === teamB.id && styles.teamCardNameActive,
                    ]}
                    numberOfLines={2}
                  >
                    {teamB.name}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* 2. Toss Decision */}
            <Text style={styles.sectionHeading}>2. What was their decision?</Text>
            <View style={styles.decisionRow}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setDecision('BAT')}
                style={[
                  styles.decisionCard,
                  decision === 'BAT' && styles.decisionCardActive,
                ]}
              >
                <View
                  style={[
                    styles.decisionIconBg,
                    decision === 'BAT' && styles.decisionIconBgActive,
                  ]}
                >
                  <Ionicons
                    name="baseball"
                    size={20}
                    color={decision === 'BAT' ? '#FFFFFF' : Colors.primary}
                  />
                </View>
                <View>
                  <Text
                    style={[
                      styles.decisionTitle,
                      decision === 'BAT' && styles.decisionTitleActive,
                    ]}
                  >
                    Elected to BAT
                  </Text>
                  <Text style={styles.decisionDesc}>Batting in 1st Innings</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setDecision('BOWL')}
                style={[
                  styles.decisionCard,
                  decision === 'BOWL' && styles.decisionCardActive,
                ]}
              >
                <View
                  style={[
                    styles.decisionIconBg,
                    decision === 'BOWL' && styles.decisionIconBgActive,
                  ]}
                >
                  <Ionicons
                    name="shield-outline"
                    size={20}
                    color={decision === 'BOWL' ? '#FFFFFF' : Colors.primary}
                  />
                </View>
                <View>
                  <Text
                    style={[
                      styles.decisionTitle,
                      decision === 'BOWL' && styles.decisionTitleActive,
                    ]}
                  >
                    Elected to BOWL
                  </Text>
                  <Text style={styles.decisionDesc}>Fielding / Bowling first</Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Summary preview banner */}
            {winningTeam && (
              <View style={styles.summaryCard}>
                <Ionicons name="information-circle" size={18} color={Colors.primary} />
                <Text style={styles.summaryText}>
                  <Text style={styles.summaryBold}>{winningTeam.name}</Text> won the toss and elected to{' '}
                  <Text style={styles.summaryBold}>{decision.toUpperCase()}</Text> first. (
                  {decision === 'BAT' ? otherTeam?.name : winningTeam.name} will bowl).
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.footer}>
            <Button
              title="Confirm Toss & Start Live Scoring"
              size="lg"
              loading={submitting}
              onPress={handleConfirmToss}
              style={styles.confirmBtn}
            />

            <Button
              title="Back to Lineup Selection"
              variant="ghost"
              size="sm"
              onPress={onClose}
              style={styles.cancelBtn}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(30, 27, 75, 0.45)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: Radii.xxl,
    borderTopRightRadius: Radii.xxl,
    maxHeight: '92%',
    shadowColor: Colors.shadowPurple,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontFamily: Fonts.bold,
    fontSize: 18,
    color: Colors.text,
  },
  subtitle: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: Radii.full,
    backgroundColor: Colors.surfaceSubtle,
  },
  scrollBody: {
    flexGrow: 0,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 12,
  },
  sectionHeading: {
    fontFamily: Fonts.bold,
    fontSize: 14,
    color: Colors.text,
    marginTop: 4,
  },
  teamsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  teamCard: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radii.xl,
    padding: 14,
    backgroundColor: '#FFFFFF',
    gap: 10,
  },
  teamCardActive: {
    borderColor: Colors.primary,
    backgroundColor: '#FAF5FF',
  },
  teamHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  teamAvatar: {
    width: 36,
    height: 36,
    borderRadius: Radii.md,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamAvatarAlt: {
    backgroundColor: '#F3E8FF',
  },
  teamAvatarActive: {
    backgroundColor: Colors.primary,
  },
  teamAvatarText: {
    fontFamily: Fonts.bold,
    fontSize: 12,
    color: Colors.textPurple,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleActive: {
    borderColor: Colors.primary,
  },
  radioInnerCircle: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
  teamCardName: {
    fontFamily: Fonts.semiBold,
    fontSize: 14,
    color: Colors.text,
  },
  teamCardNameActive: {
    color: Colors.primary,
  },
  decisionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  decisionCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radii.lg,
    padding: 12,
    backgroundColor: '#FFFFFF',
  },
  decisionCardActive: {
    borderColor: Colors.primary,
    backgroundColor: '#FAF5FF',
  },
  decisionIconBg: {
    width: 34,
    height: 34,
    borderRadius: Radii.md,
    backgroundColor: '#F5F3FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  decisionIconBgActive: {
    backgroundColor: Colors.primary,
  },
  decisionTitle: {
    fontFamily: Fonts.semiBold,
    fontSize: 13,
    color: Colors.text,
  },
  decisionTitleActive: {
    color: Colors.primary,
  },
  decisionDesc: {
    fontFamily: Fonts.regular,
    fontSize: 10,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F5F3FF',
    borderRadius: Radii.lg,
    padding: 12,
    borderWidth: 1,
    borderColor: '#DDD6FE',
    marginTop: 4,
  },
  summaryText: {
    flex: 1,
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: Colors.text,
    lineHeight: 17,
  },
  summaryBold: {
    fontFamily: Fonts.bold,
    color: Colors.textPurple,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: 6,
  },
  confirmBtn: {
    width: '100%',
  },
  cancelBtn: {
    width: '100%',
  },
});
