import React, { useState, useEffect, useMemo } from 'react';
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
import { SquadPlayer } from '@/types/api';
import { Colors, Fonts, Radii } from '@/theme/tokens';
import { formatPlayerPosition } from '@/utils/match-helpers';

export const ALL_DISMISSAL_TYPES = [
  'BOWLED',
  'CAUGHT',
  'LBW',
  'RUN_OUT',
  'STUMPED',
  'HIT_WICKET',
  'HANDLED_BALL',
  'OBSTRUCTING_FIELD',
  'TIMED_OUT',
  'RETIRED_HURT',
] as const;

export type DismissalType = (typeof ALL_DISMISSAL_TYPES)[number];

// Law 21: On a No-Ball, batter CANNOT be Bowled, Caught, LBW, Stumped, or Hit Wicket
const NO_BALL_ILLEGAL_DISMISSALS: DismissalType[] = [
  'BOWLED',
  'CAUGHT',
  'LBW',
  'STUMPED',
  'HIT_WICKET',
];

// Law 22: On a Wide, batter CANNOT be Bowled, Caught, or LBW
const WIDE_ILLEGAL_DISMISSALS: DismissalType[] = [
  'BOWLED',
  'CAUGHT',
  'LBW',
];

interface WicketModalProps {
  visible: boolean;
  onClose: () => void;
  striker: SquadPlayer;
  nonStriker: SquadPlayer;
  remainingBatters: SquadPlayer[];
  initialExtraType?: 'NONE' | 'WIDE' | 'NO_BALL';
  onConfirmWicket: (
    dismissalType: string,
    dismissedPlayerId: string,
    extraType: 'NONE' | 'WIDE' | 'NO_BALL',
    nextBatter?: SquadPlayer
  ) => void;
}

export function WicketModal({
  visible,
  onClose,
  striker,
  nonStriker,
  remainingBatters,
  initialExtraType = 'NONE',
  onConfirmWicket,
}: WicketModalProps) {
  const [extraType, setExtraType] = useState<'NONE' | 'WIDE' | 'NO_BALL'>('NONE');
  const [selectedDismissal, setSelectedDismissal] = useState<DismissalType>('BOWLED');
  const [dismissedId, setDismissedId] = useState<string>(striker.id);
  const [nextBatterId, setNextBatterId] = useState<string>('');

  useEffect(() => {
    if (visible) {
      const mode = initialExtraType || 'NONE';
      setExtraType(mode);
      setDismissedId(striker.id);

      if (mode === 'NO_BALL') {
        setSelectedDismissal('RUN_OUT');
      } else if (mode === 'WIDE') {
        setSelectedDismissal('STUMPED');
      } else {
        setSelectedDismissal('BOWLED');
      }

      if (remainingBatters.length > 0) {
        setNextBatterId(remainingBatters[0].id);
      } else {
        setNextBatterId('');
      }
    }
  }, [visible, striker, remainingBatters, initialExtraType]);

  // Determine which dismissals are illegal under current delivery extra type
  const illegalDismissals = useMemo(() => {
    if (extraType === 'NO_BALL') return NO_BALL_ILLEGAL_DISMISSALS;
    if (extraType === 'WIDE') return WIDE_ILLEGAL_DISMISSALS;
    return [];
  }, [extraType]);

  const handleExtraTypeChange = (type: 'NONE' | 'WIDE' | 'NO_BALL') => {
    setExtraType(type);
    if (type === 'NO_BALL' && NO_BALL_ILLEGAL_DISMISSALS.includes(selectedDismissal)) {
      setSelectedDismissal('RUN_OUT');
    } else if (type === 'WIDE' && WIDE_ILLEGAL_DISMISSALS.includes(selectedDismissal)) {
      setSelectedDismissal('STUMPED');
    }
  };

  const handleConfirm = () => {
    if (!dismissedId) {
      Alert.alert('Required', 'Please select which batter was dismissed.');
      return;
    }

    if (illegalDismissals.includes(selectedDismissal)) {
      Alert.alert(
        'Illegal Dismissal',
        `Under ${extraType === 'NO_BALL' ? 'Law 21 (No-Ball)' : 'Law 22 (Wide)'}, a batter cannot be out ${selectedDismissal.replace('_', ' ')}.`
      );
      return;
    }

    if (selectedDismissal === 'RUN_OUT' && !dismissedId) {
      Alert.alert('Run Out', 'Please specify whether the Striker or Non-Striker was Run Out.');
      return;
    }

    if (remainingBatters.length > 0 && !nextBatterId) {
      Alert.alert('Incoming Batter Required', 'Please select the incoming batter.');
      return;
    }

    const nextBatter = remainingBatters.find((b) => b.id === nextBatterId);
    onConfirmWicket(selectedDismissal, dismissedId, extraType, nextBatter);
  };

  const insets = useSafeAreaInsets();
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
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Record Wicket Event</Text>
              <Text style={styles.subtitle}>Select delivery mode, dismissal type, and batter</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* 1. Delivery Mode Selector (Normal vs No-Ball vs Wide) */}
            <Text style={styles.sectionHeading}>1. Delivery Type (Laws 21 & 22)</Text>
            <View style={styles.modeSelector}>
              <TouchableOpacity
                style={[
                  styles.modeBtn,
                  extraType === 'NONE' && styles.modeBtnActive,
                ]}
                onPress={() => handleExtraTypeChange('NONE')}
              >
                <Text
                  style={[
                    styles.modeBtnText,
                    extraType === 'NONE' && styles.modeBtnTextActive,
                  ]}
                >
                  Normal Delivery
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modeBtn,
                  extraType === 'NO_BALL' && styles.modeBtnActive,
                ]}
                onPress={() => handleExtraTypeChange('NO_BALL')}
              >
                <Text
                  style={[
                    styles.modeBtnText,
                    extraType === 'NO_BALL' && styles.modeBtnTextActive,
                  ]}
                >
                  No-Ball (Law 21)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modeBtn,
                  extraType === 'WIDE' && styles.modeBtnActive,
                ]}
                onPress={() => handleExtraTypeChange('WIDE')}
              >
                <Text
                  style={[
                    styles.modeBtnText,
                    extraType === 'WIDE' && styles.modeBtnTextActive,
                  ]}
                >
                  Wide (Law 22)
                </Text>
              </TouchableOpacity>
            </View>

            {/* Law Alert Banner */}
            {extraType === 'NO_BALL' && (
              <View style={styles.lawAlertBanner}>
                <Ionicons name="shield-checkmark" size={16} color="#B45309" />
                <Text style={styles.lawAlertText}>
                  <Text style={{ fontFamily: Fonts.bold }}>Law 21 (No-Ball):</Text> A batter cannot be out Bowled, Caught, LBW, Stumped, or Hit Wicket on a No-Ball. Run Out and Obstructing Field are permitted.
                </Text>
              </View>
            )}

            {extraType === 'WIDE' && (
              <View style={styles.lawAlertBanner}>
                <Ionicons name="shield-checkmark" size={16} color="#B45309" />
                <Text style={styles.lawAlertText}>
                  <Text style={{ fontFamily: Fonts.bold }}>Law 22 (Wide):</Text> A batter cannot be out Bowled, Caught, or LBW on a Wide. Stumped, Hit Wicket, and Run Out are permitted.
                </Text>
              </View>
            )}

            {/* 2. Dismissed Batter */}
            <Text style={styles.sectionHeading}>
              2. Dismissed Batter {selectedDismissal === 'RUN_OUT' && '(Select Run Out Player)'}
            </Text>
            <View style={styles.playerSelectRow}>
              <TouchableOpacity
                onPress={() => setDismissedId(striker.id)}
                style={[
                  styles.playerSelectCard,
                  dismissedId === striker.id && styles.playerSelectCardActive,
                ]}
              >
                <Text style={styles.playerRoleText}>Striker</Text>
                <Text
                  style={[
                    styles.playerNameText,
                    dismissedId === striker.id && styles.playerNameTextActive,
                  ]}
                  numberOfLines={1}
                >
                  {striker.name}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setDismissedId(nonStriker.id)}
                style={[
                  styles.playerSelectCard,
                  dismissedId === nonStriker.id && styles.playerSelectCardActive,
                ]}
              >
                <Text style={styles.playerRoleText}>Non-Striker</Text>
                <Text
                  style={[
                    styles.playerNameText,
                    dismissedId === nonStriker.id && styles.playerNameTextActive,
                  ]}
                  numberOfLines={1}
                >
                  {nonStriker.name}
                </Text>
              </TouchableOpacity>
            </View>

            {/* 3. Dismissal Type Grid */}
            <Text style={styles.sectionHeading}>3. Dismissal Type</Text>
            <View style={styles.dismissalGrid}>
              {ALL_DISMISSAL_TYPES.map((type) => {
                const isSelected = selectedDismissal === type;
                const isIllegal = illegalDismissals.includes(type);

                return (
                  <TouchableOpacity
                    key={type}
                    onPress={() => {
                      if (isIllegal) {
                        Alert.alert(
                          'Law Restriction',
                          `Under ${extraType === 'NO_BALL' ? 'Law 21 (No-Ball)' : 'Law 22 (Wide)'}, batter cannot be out ${type.replace('_', ' ')}.`
                        );
                        return;
                      }
                      setSelectedDismissal(type);
                    }}
                    disabled={isIllegal}
                    style={[
                      styles.dismissalBtn,
                      isSelected && styles.dismissalBtnActive,
                      isIllegal && styles.dismissalBtnDisabled,
                    ]}
                  >
                    <View style={styles.dismissalBtnContent}>
                      <Text
                        style={[
                          styles.dismissalBtnText,
                          isSelected && styles.dismissalBtnTextActive,
                          isIllegal && styles.dismissalBtnTextDisabled,
                        ]}
                      >
                        {type.replace('_', ' ')}
                      </Text>
                      {isIllegal && (
                        <Ionicons name="lock-closed" size={10} color="#9CA3AF" style={{ marginLeft: 3 }} />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* 4. Incoming Batter */}
            {remainingBatters.length > 0 ? (
              <View style={styles.incomingSection}>
                <Text style={styles.sectionHeading}>4. Incoming Batter</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.incomingScroll}
                >
                  <View style={styles.incomingRow}>
                    {remainingBatters.map((player) => {
                      const isSelected = nextBatterId === player.id;
                      return (
                        <TouchableOpacity
                          key={player.id}
                          onPress={() => setNextBatterId(player.id)}
                          style={[
                            styles.incomingChip,
                            isSelected && styles.incomingChipActive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.incomingChipName,
                              isSelected && styles.incomingChipNameActive,
                            ]}
                          >
                            {player.name}
                          </Text>
                          <Text style={styles.incomingChipRole}>
                            {formatPlayerPosition(player.positions)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>
              </View>
            ) : (
              <View style={styles.allOutBanner}>
                <Ionicons name="warning-outline" size={18} color="#B45309" />
                <Text style={styles.allOutText}>
                  All available batters have batted (Innings will conclude upon confirmation).
                </Text>
              </View>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <Button
              title="Confirm Wicket Delivery"
              size="lg"
              variant="primary"
              onPress={handleConfirm}
              style={styles.confirmBtn}
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
    backgroundColor: 'rgba(30, 27, 75, 0.5)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: Radii.xxl,
    borderTopRightRadius: Radii.xxl,
    maxHeight: '90%',
    paddingBottom: 28,
    shadowColor: Colors.shadowPurple,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
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
    color: Colors.danger,
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
  body: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  sectionHeading: {
    fontFamily: Fonts.bold,
    fontSize: 13,
    color: Colors.text,
    marginBottom: 8,
    marginTop: 4,
  },
  modeSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: Radii.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  modeBtnActive: {
    borderColor: Colors.primary,
    backgroundColor: '#F5F3FF',
  },
  modeBtnText: {
    fontFamily: Fonts.medium,
    fontSize: 11,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  modeBtnTextActive: {
    fontFamily: Fonts.bold,
    color: Colors.primary,
  },
  lawAlertBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: Radii.md,
    padding: 10,
    marginBottom: 14,
  },
  lawAlertText: {
    flex: 1,
    fontFamily: Fonts.regular,
    fontSize: 11,
    color: '#92400E',
    lineHeight: 16,
  },
  playerSelectRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  playerSelectCard: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radii.lg,
    padding: 12,
    backgroundColor: '#FFFFFF',
  },
  playerSelectCardActive: {
    borderColor: Colors.danger,
    backgroundColor: '#FEF2F2',
  },
  playerRoleText: {
    fontFamily: Fonts.medium,
    fontSize: 11,
    color: Colors.textSecondary,
  },
  playerNameText: {
    fontFamily: Fonts.semiBold,
    fontSize: 14,
    color: Colors.text,
    marginTop: 2,
  },
  playerNameTextActive: {
    color: Colors.danger,
  },
  dismissalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 18,
  },
  dismissalBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: Radii.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: '#FFFFFF',
  },
  dismissalBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dismissalBtnActive: {
    borderColor: Colors.primary,
    backgroundColor: '#F5F3FF',
  },
  dismissalBtnDisabled: {
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB',
    opacity: 0.6,
  },
  dismissalBtnText: {
    fontFamily: Fonts.semiBold,
    fontSize: 12,
    color: Colors.text,
  },
  dismissalBtnTextActive: {
    color: Colors.primary,
  },
  dismissalBtnTextDisabled: {
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  incomingSection: {
    marginBottom: 16,
  },
  incomingScroll: {
    marginTop: 4,
  },
  incomingRow: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 2,
  },
  incomingChip: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radii.lg,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    minWidth: 120,
  },
  incomingChipActive: {
    borderColor: Colors.primary,
    backgroundColor: '#FAF5FF',
  },
  incomingChipName: {
    fontFamily: Fonts.semiBold,
    fontSize: 13,
    color: Colors.text,
  },
  incomingChipNameActive: {
    color: Colors.primary,
  },
  incomingChipRole: {
    fontFamily: Fonts.regular,
    fontSize: 10,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  allOutBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: Radii.md,
    marginBottom: 16,
  },
  allOutText: {
    fontFamily: Fonts.medium,
    fontSize: 12,
    color: '#92400E',
    flex: 1,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  confirmBtn: {
    width: '100%',
    backgroundColor: Colors.danger,
  },
});
