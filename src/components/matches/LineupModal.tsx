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
import { SquadTeam, SquadPlayer } from '@/types/api';
import { matchesApi } from '@/api/matches.api';
import { Colors, Fonts, Radii } from '@/theme/tokens';
import { formatPlayerPosition } from '@/utils/match-helpers';

interface LineupModalProps {
  visible: boolean;
  onClose: () => void;
  matchId: string;
  teamA?: SquadTeam;
  teamB?: SquadTeam;
  initialLineup?: {
    teamAPlayerIds?: string[];
    teamBPlayerIds?: string[];
  };
  onLineupConfirmed: (lineups: { teamAPlayerIds: string[]; teamBPlayerIds: string[] }) => void;
}

export function LineupModal({
  visible,
  onClose,
  matchId,
  teamA,
  teamB,
  initialLineup,
  onLineupConfirmed,
}: LineupModalProps) {
  const [activeTab, setActiveTab] = useState<'A' | 'B'>('A');
  const [selectedA, setSelectedA] = useState<string[]>([]);
  const [selectedB, setSelectedB] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      const aIds =
        initialLineup?.teamAPlayerIds && initialLineup.teamAPlayerIds.length > 0
          ? initialLineup.teamAPlayerIds
          : teamA?.players?.map((p) => p.id) || [];
      const bIds =
        initialLineup?.teamBPlayerIds && initialLineup.teamBPlayerIds.length > 0
          ? initialLineup.teamBPlayerIds
          : teamB?.players?.map((p) => p.id) || [];

      setSelectedA(aIds);
      setSelectedB(bIds);
    }
  }, [visible, initialLineup, teamA, teamB]);

  const togglePlayerA = (id: string) => {
    setSelectedA((prev) =>
      prev.includes(id) ? prev.filter((pId) => pId !== id) : [...prev, id]
    );
  };

  const togglePlayerB = (id: string) => {
    setSelectedB((prev) =>
      prev.includes(id) ? prev.filter((pId) => pId !== id) : [...prev, id]
    );
  };

  const selectAllA = () => {
    if (!teamA?.players) return;
    if (selectedA.length === teamA.players.length) {
      setSelectedA([]);
    } else {
      setSelectedA(teamA.players.map((p) => p.id));
    }
  };

  const selectAllB = () => {
    if (!teamB?.players) return;
    if (selectedB.length === teamB.players.length) {
      setSelectedB([]);
    } else {
      setSelectedB(teamB.players.map((p) => p.id));
    }
  };

  const handleConfirm = async () => {
    if (selectedA.length === 0 || selectedB.length === 0) {
      Alert.alert(
        'Incomplete Lineup',
        'Please select at least one player for both teams before proceeding.'
      );
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        teamAPlayerIds: selectedA,
        teamBPlayerIds: selectedB,
      };
      await matchesApi.setLineup(matchId, payload);
      onLineupConfirmed(payload);
    } catch (err: any) {
      Alert.alert(
        'Failed to Save Lineup',
        err?.message || 'Could not save the playing lineup. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const currentTeam = activeTab === 'A' ? teamA : teamB;
  const currentSelected = activeTab === 'A' ? selectedA : selectedB;
  const currentToggle = activeTab === 'A' ? togglePlayerA : togglePlayerB;
  const currentSelectAll = activeTab === 'A' ? selectAllA : selectAllB;

  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 20);

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
              <Text style={styles.title}>Playing Members (Lineup)</Text>
              <Text style={styles.subtitle}>Select the active playing members for each team</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Team Tabs */}
          <View style={styles.tabsRow}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'A' && styles.tabActive]}
              onPress={() => setActiveTab('A')}
            >
              <Text
                style={[styles.tabText, activeTab === 'A' && styles.tabTextActive]}
                numberOfLines={1}
              >
                {teamA?.name || 'Team A'}
              </Text>
              <View
                style={[styles.countBadge, activeTab === 'A' && styles.countBadgeActive]}
              >
                <Text
                  style={[
                    styles.countBadgeText,
                    activeTab === 'A' && styles.countBadgeTextActive,
                  ]}
                >
                  {selectedA.length}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, activeTab === 'B' && styles.tabActive]}
              onPress={() => setActiveTab('B')}
            >
              <Text
                style={[styles.tabText, activeTab === 'B' && styles.tabTextActive]}
                numberOfLines={1}
              >
                {teamB?.name || 'Team B'}
              </Text>
              <View
                style={[styles.countBadge, activeTab === 'B' && styles.countBadgeActive]}
              >
                <Text
                  style={[
                    styles.countBadgeText,
                    activeTab === 'B' && styles.countBadgeTextActive,
                  ]}
                >
                  {selectedB.length}
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Squad Toolbar */}
          <View style={styles.squadToolbar}>
            <Text style={styles.squadSummaryText}>
              Selected {currentSelected.length} of {currentTeam?.players?.length || 0} players
            </Text>
            <TouchableOpacity onPress={currentSelectAll} style={styles.selectAllBtn}>
              <Text style={styles.selectAllText}>
                {currentSelected.length === (currentTeam?.players?.length || 0)
                  ? 'Deselect All'
                  : 'Select All'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Player List */}
          <ScrollView style={styles.playersList} contentContainerStyle={styles.playersContent}>
            {(!currentTeam?.players || currentTeam.players.length === 0) && (
              <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={36} color={Colors.textMuted} />
                <Text style={styles.emptyText}>No squad members found for this team</Text>
              </View>
            )}

            {currentTeam?.players?.map((player: SquadPlayer) => {
              const isSelected = currentSelected.includes(player.id);
              const position = formatPlayerPosition(player.positions);

              return (
                <TouchableOpacity
                  key={player.id}
                  activeOpacity={0.7}
                  onPress={() => currentToggle(player.id)}
                  style={[styles.playerCard, isSelected && styles.playerCardSelected]}
                >
                  <View style={styles.playerInfoCol}>
                    <View style={styles.nameRow}>
                      <Text
                        style={[styles.playerName, isSelected && styles.playerNameSelected]}
                      >
                        {player.name}
                      </Text>

                      {player.isCaptain && (
                        <View style={styles.captainBadge}>
                          <Text style={styles.captainBadgeText}>C</Text>
                        </View>
                      )}

                      {player.isViceCaptain && (
                        <View style={styles.viceCaptainBadge}>
                          <Text style={styles.viceCaptainBadgeText}>VC</Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.metaRow}>
                      <View style={styles.positionChip}>
                        <Text style={styles.positionText}>{position}</Text>
                      </View>
                    </View>
                  </View>

                  <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                    {isSelected && (
                      <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.footer}>
            <View style={styles.totalSummary}>
              <Text style={styles.totalText}>
                Total: Team A ({selectedA.length}) • Team B ({selectedB.length})
              </Text>
            </View>
            <Button
              title="Confirm Lineup & Continue to Toss"
              size="lg"
              loading={submitting}
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
    backgroundColor: 'rgba(30, 27, 75, 0.45)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: Radii.xxl,
    borderTopRightRadius: Radii.xxl,
    maxHeight: '90%',
    minHeight: '75%',
    paddingBottom: 24,
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
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 8,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: Radii.md,
    backgroundColor: Colors.surfaceSubtle,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  tabActive: {
    backgroundColor: '#F5F3FF',
    borderColor: Colors.primary,
  },
  tabText: {
    fontFamily: Fonts.medium,
    fontSize: 13,
    color: Colors.textSecondary,
    flexShrink: 1,
  },
  tabTextActive: {
    fontFamily: Fonts.bold,
    color: Colors.primary,
  },
  countBadge: {
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: Radii.full,
  },
  countBadgeActive: {
    backgroundColor: Colors.primary,
  },
  countBadgeText: {
    fontFamily: Fonts.bold,
    fontSize: 11,
    color: Colors.textSecondary,
  },
  countBadgeTextActive: {
    color: '#FFFFFF',
  },
  squadToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  squadSummaryText: {
    fontFamily: Fonts.medium,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  selectAllBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  selectAllText: {
    fontFamily: Fonts.semiBold,
    fontSize: 12,
    color: Colors.primary,
  },
  playersList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  playersContent: {
    paddingBottom: 16,
    gap: 8,
  },
  playerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radii.lg,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  playerCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: '#FAF5FF',
  },
  playerInfoCol: {
    flex: 1,
    gap: 4,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  playerName: {
    fontFamily: Fonts.semiBold,
    fontSize: 14,
    color: Colors.text,
  },
  playerNameSelected: {
    color: Colors.primary,
  },
  captainBadge: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#F59E0B',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: Radii.sm,
  },
  captainBadgeText: {
    fontFamily: Fonts.bold,
    fontSize: 10,
    color: '#B45309',
  },
  viceCaptainBadge: {
    backgroundColor: '#EDE9FE',
    borderWidth: 1,
    borderColor: '#8B5CF6',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: Radii.sm,
  },
  viceCaptainBadgeText: {
    fontFamily: Fonts.bold,
    fontSize: 10,
    color: '#6D28D9',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  positionChip: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radii.sm,
  },
  positionText: {
    fontFamily: Fonts.medium,
    fontSize: 11,
    color: Colors.textSecondary,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  checkboxSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyText: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: Colors.textMuted,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: 10,
  },
  totalSummary: {
    alignItems: 'center',
  },
  totalText: {
    fontFamily: Fonts.medium,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  confirmBtn: {
    width: '100%',
  },
});
