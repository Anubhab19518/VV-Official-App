import React, { useState } from 'react';
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

export interface BowlerStatEntry {
  overs: number;
  balls: number;
  runs: number;
  wickets: number;
}

interface NextBowlerModalProps {
  visible: boolean;
  bowlingPlayers: SquadPlayer[];
  previousBowlerId?: string;
  overNumber: number;
  maxOversPerBowler?: number;
  bowlerStatsMap?: Record<string, BowlerStatEntry>;
  title?: string;
  subtitle?: string;
  currentBowlerId?: string;
  onClose?: () => void;
  onSelectBowler: (bowler: SquadPlayer) => void;
}

export function NextBowlerModal({
  visible,
  bowlingPlayers,
  previousBowlerId,
  overNumber,
  maxOversPerBowler = 4,
  bowlerStatsMap = {},
  title,
  subtitle,
  currentBowlerId,
  onClose,
  onSelectBowler,
}: NextBowlerModalProps) {
  const [selectedBowlerId, setSelectedBowlerId] = useState<string>('');

  React.useEffect(() => {
    if (visible && currentBowlerId) {
      setSelectedBowlerId(currentBowlerId);
    }
  }, [visible, currentBowlerId]);

  const handleConfirm = () => {
    if (!selectedBowlerId) {
      Alert.alert('Bowler Required', 'Please select a bowler.');
      return;
    }
    const bowler = bowlingPlayers.find((b) => b.id === selectedBowlerId);
    if (bowler) {
      const stats = bowlerStatsMap[bowler.id];
      if (stats && stats.overs >= maxOversPerBowler) {
        Alert.alert(
          'Bowler Quota Reached',
          `This bowler has already bowled their maximum quota of ${maxOversPerBowler} overs.`
        );
        return;
      }
      if (bowler.id === previousBowlerId) {
        Alert.alert('Invalid Selection', 'A bowler cannot bowl consecutive overs.');
        return;
      }
      onSelectBowler(bowler);
    }
  };

  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 24);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      statusBarTranslucent={true}
    >
      <View style={styles.overlay}>
        <View style={[styles.sheetContainer, { paddingBottom: bottomPadding }]}>
          <View style={styles.header}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={styles.title}>{title || `Over ${overNumber} Complete`}</Text>
              <Text style={styles.subtitle}>
                {subtitle || `Select the bowler for Over ${overNumber + 1}`}
              </Text>
            </View>
            {onClose && (
              <TouchableOpacity
                onPress={onClose}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={styles.closeBtn}
              >
                <Ionicons name="close" size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.infoPill}>
            <Ionicons name="information-circle" size={16} color={Colors.primary} />
            <Text style={styles.infoPillText}>
              Max quota: {maxOversPerBowler} overs per bowler. Consecutive overs are not permitted.
            </Text>
          </View>

          <ScrollView style={styles.body} contentContainerStyle={styles.listContent}>
            {bowlingPlayers.map((player) => {
              const stats = bowlerStatsMap[player.id];
              const oversBowled = stats ? stats.overs : 0;
              const isPrev = player.id === previousBowlerId;
              const isMaxOversReached = oversBowled >= maxOversPerBowler;
              const isDisabled = isPrev || isMaxOversReached;
              const isSelected = selectedBowlerId === player.id;

              return (
                <TouchableOpacity
                  key={player.id}
                  disabled={isDisabled}
                  onPress={() => setSelectedBowlerId(player.id)}
                  style={[
                    styles.playerCard,
                    isSelected && styles.playerCardActive,
                    isDisabled && styles.playerCardDisabled,
                  ]}
                >
                  <View style={styles.playerInfoCol}>
                    <View style={styles.nameRow}>
                      <Text
                        style={[
                          styles.playerName,
                          isSelected && styles.playerNameActive,
                          isDisabled && styles.playerNameDisabled,
                        ]}
                      >
                        {player.name}
                      </Text>
                      {isMaxOversReached && (
                        <View style={styles.quotaBadge}>
                          <Text style={styles.quotaBadgeText}>Quota Full</Text>
                        </View>
                      )}
                      {isPrev && (
                        <View style={styles.prevBadge}>
                          <Text style={styles.prevBadgeText}>Last Over</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.playerRole}>
                      {formatPlayerPosition(player.positions)} • {oversBowled}/{maxOversPerBowler} overs
                      {isMaxOversReached
                        ? ' (Limit reached)'
                        : isPrev
                        ? ' (Bowled last over)'
                        : ` (${maxOversPerBowler - oversBowled} left)`}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.radio,
                      isSelected && styles.radioActive,
                      isDisabled && styles.radioDisabled,
                    ]}
                  >
                    {isSelected && <View style={styles.radioInner} />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={styles.footer}>
            <Button
              title="Confirm Bowler & Start Over"
              size="lg"
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
    maxHeight: '80%',
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
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  closeBtn: {
    padding: 6,
    borderRadius: Radii.full,
    backgroundColor: '#F3F4F6',
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
  infoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F5F3FF',
    marginHorizontal: 20,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  infoPillText: {
    fontFamily: Fonts.medium,
    fontSize: 11,
    color: Colors.textPurple,
    flex: 1,
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  listContent: {
    gap: 8,
    paddingBottom: 16,
  },
  playerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: Radii.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: '#FFFFFF',
  },
  playerCardActive: {
    borderColor: Colors.primary,
    backgroundColor: '#FAF5FF',
  },
  playerCardDisabled: {
    opacity: 0.45,
    backgroundColor: '#F9FAFB',
    borderColor: '#E5E7EB',
  },
  playerInfoCol: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quotaBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radii.sm,
  },
  quotaBadgeText: {
    fontFamily: Fonts.medium,
    fontSize: 10,
    color: '#DC2626',
  },
  prevBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radii.sm,
  },
  prevBadgeText: {
    fontFamily: Fonts.medium,
    fontSize: 10,
    color: '#D97706',
  },
  playerName: {
    fontFamily: Fonts.semiBold,
    fontSize: 14,
    color: Colors.text,
  },
  playerNameActive: {
    color: Colors.primary,
  },
  playerNameDisabled: {
    color: '#9CA3AF',
  },
  playerRole: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: {
    borderColor: Colors.primary,
  },
  radioDisabled: {
    borderColor: '#E5E7EB',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  confirmBtn: {
    width: '100%',
  },
});
