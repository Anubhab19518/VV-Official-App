import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { LineupModal } from '@/components/matches/LineupModal';
import { TossModal } from '@/components/matches/TossModal';
import { matchesApi } from '@/api/matches.api';
import { OfficialMatch, MatchSquadsData, RecordTossResponse } from '@/types/api';
import { Colors, Fonts, Radii } from '@/theme/tokens';
import {
  getTeamAName,
  getTeamBName,
  getTeamAShort,
  getTeamBShort,
  getVenueText,
  getFormattedSchedule,
  getTournamentName,
  getUmpireRole,
  formatPlayerPosition,
} from '@/utils/match-helpers';

export default function MatchDetailsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [match, setMatch] = useState<OfficialMatch | null>(null);
  const [squads, setSquads] = useState<MatchSquadsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Pre-match modals state
  const [showLineupModal, setShowLineupModal] = useState(false);
  const [showTossModal, setShowTossModal] = useState(false);
  const [previewTab, setPreviewTab] = useState<'A' | 'B'>('A');

  const loadMatchAndSquads = useCallback(async () => {
    if (!id) return;
    try {
      const [matchRes, squadsRes] = await Promise.allSettled([
        matchesApi.getMatchById(id),
        matchesApi.getMatchSquads(id),
      ]);

      if (matchRes.status === 'fulfilled' && matchRes.value?.data) {
        setMatch(matchRes.value.data);
      }
      if (squadsRes.status === 'fulfilled' && squadsRes.value?.data) {
        setSquads(squadsRes.value.data);
      }
    } catch {
      // Retain existing state
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    loadMatchAndSquads();
  }, [loadMatchAndSquads]);

  const onRefresh = () => {
    setRefreshing(true);
    loadMatchAndSquads();
  };

  const topInset = Math.max(insets.top, 24);

  if (loading) {
    return (
      <GradientBackground style={styles.container}>
        <View style={[styles.innerContainer, { paddingTop: topInset }]}>
          <ScreenHeader title="Match Details" showBack={true} />
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        </View>
      </GradientBackground>
    );
  }

  if (!match) {
    return (
      <GradientBackground style={styles.container}>
        <View style={[styles.innerContainer, { paddingTop: topInset }]}>
          <ScreenHeader title="Match Details" showBack={true} />
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconBg}>
              <Ionicons name="alert-circle-outline" size={36} color={Colors.danger} />
            </View>
            <Text style={styles.emptyTitle}>Match Not Found</Text>
            <Text style={styles.emptySubtext}>
              Could not retrieve details for the requested match.
            </Text>
            <Button
              title="Back to Matches"
              variant="outline"
              onPress={() => router.back()}
              style={{ marginTop: 16 }}
            />
          </View>
        </View>
      </GradientBackground>
    );
  }

  const teamAName = squads?.teamA?.name || getTeamAName(match);
  const teamBName = squads?.teamB?.name || getTeamBName(match);
  const teamAShort = squads?.teamA?.shortName || getTeamAShort(match);
  const teamBShort = squads?.teamB?.shortName || getTeamBShort(match);

  // Tournament Status & Match Readiness
  const isCanStart = squads ? squads.canStartMatch : true;
  const tournamentStatus = squads?.tournamentStatus || 'SCHEDULED';
  const isDraft = !isCanStart || tournamentStatus === 'DRAFT';

  // Toss status
  const tossData = squads?.toss;
  const isTossDone = Boolean(tossData?.winnerTeamId) || match.status === 'LIVE' || match.status === 'COMPLETED';

  // Find toss winner team name
  let tossWinnerName = '';
  if (tossData?.winnerTeamId) {
    if (tossData.winnerTeamId === squads?.teamA?.id) {
      tossWinnerName = teamAName;
    } else if (tossData.winnerTeamId === squads?.teamB?.id) {
      tossWinnerName = teamBName;
    } else {
      tossWinnerName = 'Winning Team';
    }
  }

  const handleLineupConfirmed = (newLineup: { teamAPlayerIds: string[]; teamBPlayerIds: string[] }) => {
    setShowLineupModal(false);
    if (squads) {
      setSquads({
        ...squads,
        lineups: newLineup,
      });
    }
    // Proceed directly to Toss modal if toss is not completed yet
    if (!isTossDone) {
      setTimeout(() => setShowTossModal(true), 300);
    } else {
      Alert.alert('Lineup Updated', 'Playing members updated successfully.');
    }
  };

  const handleTossSuccess = (result: RecordTossResponse) => {
    setShowTossModal(false);
    if (squads) {
      setSquads({
        ...squads,
        toss: {
          winnerTeamId: result.tossWinnerTeamId,
          decision: result.tossDecision,
          battingTeamId: result.battingTeamId,
          bowlingTeamId: result.bowlingTeamId,
        },
      });
    }
    if (match) {
      setMatch({ ...match, status: 'LIVE' });
    }

    Alert.alert(
      'Toss Completed',
      'Match status is now LIVE! Transitioning to live scoring...',
      [
        {
          text: 'Start Scoring',
          onPress: () => router.push(`/scoring/${id}` as any),
        },
      ]
    );
  };

  const previewSquad = previewTab === 'A' ? squads?.teamA : squads?.teamB;

  return (
    <GradientBackground style={styles.container}>
      <View style={[styles.innerContainer, { paddingTop: topInset }]}>
        <ScreenHeader title="Match Details" showBack={true} />

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[Colors.primary]}
              tintColor={Colors.primary}
            />
          }
        >
          {/* Tournament Readiness Warning Banner (if DRAFT) */}
          {isDraft && (
            <View style={styles.warningBanner}>
              <View style={styles.warningIconBg}>
                <Ionicons name="alert" size={20} color="#D97706" />
              </View>
              <View style={styles.warningTextContainer}>
                <Text style={styles.warningTitle}>Tournament is in DRAFT</Text>
                <Text style={styles.warningText}>
                  Organizer must start the tournament before match play and toss can begin.
                </Text>
              </View>
            </View>
          )}

          {/* Match Header Card */}
          <View style={styles.matchCard}>
            <View style={styles.cardTop}>
              <View style={styles.tournamentPill}>
                <Ionicons name="trophy" size={13} color="#7C3AED" />
                <Text style={styles.tournamentName} numberOfLines={1}>
                  {squads?.tournamentName || getTournamentName(match)}
                </Text>
              </View>
              <Badge
                label={match.status || 'SCHEDULED'}
                variant={
                  match.status === 'LIVE'
                    ? 'live'
                    : match.status === 'COMPLETED'
                    ? 'completed'
                    : 'upcoming'
                }
              />
            </View>

            <View style={styles.teamsRow}>
              <View style={styles.teamCol}>
                <View style={styles.teamLogoBg}>
                  <Text style={styles.teamShortBadge}>{teamAShort}</Text>
                </View>
                <Text style={styles.teamName} numberOfLines={2}>
                  {teamAName}
                </Text>
              </View>

              <View style={styles.vsBadge}>
                <Text style={styles.vsText}>VS</Text>
              </View>

              <View style={styles.teamCol}>
                <View style={[styles.teamLogoBg, styles.teamLogoBgAlt]}>
                  <Text style={[styles.teamShortBadge, styles.teamShortBadgeAlt]}>
                    {teamBShort}
                  </Text>
                </View>
                <Text style={styles.teamName} numberOfLines={2}>
                  {teamBName}
                </Text>
              </View>
            </View>

            <View style={styles.venueRow}>
              <Ionicons name="location-outline" size={16} color={Colors.textSecondary} />
              <Text style={styles.venueText}>{getVenueText(match)}</Text>
            </View>
          </View>

          {/* Toss Result Banner (if recorded) */}
          {isTossDone && tossData?.decision && (
            <View style={styles.tossBanner}>
              <View style={styles.tossIconBg}>
                <Ionicons name="baseball" size={18} color="#FFFFFF" />
              </View>
              <View style={styles.tossTextCol}>
                <Text style={styles.tossTitle}>Toss Recorded</Text>
                <Text style={styles.tossSubtitle}>
                  <Text style={styles.tossBold}>{tossWinnerName}</Text> won the toss and elected to{' '}
                  <Text style={styles.tossBold}>{tossData.decision}</Text> first.
                </Text>
              </View>
            </View>
          )}

          {/* Action CTAs: Lineup, Toss, and Scoring */}
          <View style={styles.actionCard}>
            <Text style={styles.actionCardTitle}>Officiating Actions</Text>

            {isDraft ? (
              <View style={styles.disabledActionWrapper}>
                <Button
                  title="Toss & Playing XI Locked"
                  size="lg"
                  disabled={true}
                  onPress={() => {}}
                  style={styles.lockedBtn}
                  icon={<Ionicons name="lock-closed" size={18} color="#9CA3AF" />}
                />
                <Text style={styles.lockedHint}>
                  Action disabled until tournament status is ONGOING / ACTIVE.
                </Text>
              </View>
            ) : !isTossDone ? (
              <View style={styles.buttonStack}>
                <Button
                  title="Set Lineup & Conduct Toss"
                  size="lg"
                  onPress={() => setShowLineupModal(true)}
                  style={styles.primaryAction}
                  icon={<Ionicons name="people" size={19} color="#FFFFFF" />}
                />
              </View>
            ) : (
              <View style={styles.buttonStack}>
                <Button
                  title="Start / Resume Live Scoring"
                  size="lg"
                  onPress={() => router.push(`/scoring/${id}` as any)}
                  style={styles.primaryAction}
                  icon={<Ionicons name="play" size={18} color="#FFFFFF" />}
                />

                <Button
                  title="Review / Edit Playing XI"
                  variant="outline"
                  size="md"
                  onPress={() => setShowLineupModal(true)}
                  icon={<Ionicons name="create-outline" size={18} color={Colors.primary} />}
                />
              </View>
            )}

            <Button
              title="View Match Scorecard"
              variant="outline"
              size="md"
              onPress={() => router.push(`/scorecard/${id}` as any)}
              icon={<Ionicons name="stats-chart-outline" size={18} color={Colors.primary} />}
            />
          </View>

          {/* Assignment Details Card */}
          <View style={styles.infoCard}>
            <Text style={styles.infoCardTitle}>Assignment Details</Text>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Assigned Role</Text>
              <View style={styles.roleTag}>
                <Text style={styles.roleTagText}>{getUmpireRole(match)}</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Scheduled Time</Text>
              <Text style={styles.infoValue}>{getFormattedSchedule(match)}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Venue</Text>
              <Text style={styles.infoValue}>{getVenueText(match)}</Text>
            </View>

            {match.roundNumber !== undefined && (
              <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
                <Text style={styles.infoLabel}>Stage / Round</Text>
                <Text style={styles.infoValue}>Round {match.roundNumber}</Text>
              </View>
            )}
          </View>

          {/* Team Squads Preview Card */}
          {squads && (
            <View style={styles.squadsCard}>
              <View style={styles.squadsHeaderRow}>
                <Text style={styles.squadsCardTitle}>Team Squads</Text>
                <TouchableOpacity
                  onPress={() => !isDraft && setShowLineupModal(true)}
                  disabled={isDraft}
                >
                  <Text style={[styles.manageLineupText, isDraft && styles.manageLineupDisabled]}>
                    Select Playing Members →
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Squad Tabs */}
              <View style={styles.squadTabs}>
                <TouchableOpacity
                  style={[styles.squadTab, previewTab === 'A' && styles.squadTabActive]}
                  onPress={() => setPreviewTab('A')}
                >
                  <Text
                    style={[
                      styles.squadTabText,
                      previewTab === 'A' && styles.squadTabTextActive,
                    ]}
                    numberOfLines={1}
                  >
                    {teamAName} ({squads.teamA?.players?.length || 0})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.squadTab, previewTab === 'B' && styles.squadTabActive]}
                  onPress={() => setPreviewTab('B')}
                >
                  <Text
                    style={[
                      styles.squadTabText,
                      previewTab === 'B' && styles.squadTabTextActive,
                    ]}
                    numberOfLines={1}
                  >
                    {teamBName} ({squads.teamB?.players?.length || 0})
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Players in selected squad preview */}
              <View style={styles.squadPlayersContainer}>
                {(!previewSquad?.players || previewSquad.players.length === 0) ? (
                  <Text style={styles.noSquadText}>No registered players in squad yet</Text>
                ) : (
                  previewSquad.players.map((p) => {
                    const isSelected =
                      previewTab === 'A'
                        ? squads.lineups?.teamAPlayerIds?.includes(p.id)
                        : squads.lineups?.teamBPlayerIds?.includes(p.id);

                    return (
                      <View key={p.id} style={styles.squadPlayerRow}>
                        <View style={styles.squadPlayerInfo}>
                          <View style={styles.squadPlayerNameRow}>
                            <Text style={styles.squadPlayerName}>{p.name}</Text>
                            {p.isCaptain && (
                              <View style={styles.captainPill}>
                                <Text style={styles.captainPillText}>C</Text>
                              </View>
                            )}
                            {p.isViceCaptain && (
                              <View style={styles.viceCaptainPill}>
                                <Text style={styles.viceCaptainPillText}>VC</Text>
                              </View>
                            )}
                          </View>
                          <Text style={styles.squadPlayerRole}>
                            {formatPlayerPosition(p.positions)}
                          </Text>
                        </View>

                        {isSelected !== undefined && (
                          <View
                            style={[
                              styles.lineupTag,
                              isSelected ? styles.lineupTagPlaying : styles.lineupTagBench,
                            ]}
                          >
                            <Text
                              style={[
                                styles.lineupTagText,
                                isSelected
                                  ? styles.lineupTagTextPlaying
                                  : styles.lineupTagTextBench,
                              ]}
                            >
                              {isSelected ? 'Playing XI' : 'Bench'}
                            </Text>
                          </View>
                        )}
                      </View>
                    );
                  })
                )}
              </View>
            </View>
          )}
        </ScrollView>
      </View>

      {/* Lineup Selection Modal */}
      {squads && (
        <LineupModal
          visible={showLineupModal}
          onClose={() => setShowLineupModal(false)}
          matchId={id!}
          teamA={squads.teamA}
          teamB={squads.teamB}
          initialLineup={squads.lineups}
          onLineupConfirmed={handleLineupConfirmed}
        />
      )}

      {/* Toss Modal */}
      {squads && (
        <TossModal
          visible={showTossModal}
          onClose={() => setShowTossModal(false)}
          matchId={id!}
          teamA={squads.teamA}
          teamB={squads.teamB}
          initialToss={squads.toss}
          onTossSuccess={handleTossSuccess}
        />
      )}
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyIconBg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontFamily: Fonts.bold,
    fontSize: 18,
    color: Colors.text,
  },
  emptySubtext: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 36,
    gap: 16,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEF3C7',
    borderWidth: 1.5,
    borderColor: '#F59E0B',
    borderRadius: Radii.lg,
    padding: 14,
    gap: 12,
  },
  warningIconBg: {
    width: 32,
    height: 32,
    borderRadius: Radii.md,
    backgroundColor: '#FDE68A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  warningTextContainer: {
    flex: 1,
  },
  warningTitle: {
    fontFamily: Fonts.bold,
    fontSize: 14,
    color: '#92400E',
  },
  warningText: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: '#B45309',
    marginTop: 2,
    lineHeight: 16,
  },
  matchCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radii.xl,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.shadowPurple,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
    gap: 8,
  },
  tournamentPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F5F3FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radii.full,
    borderWidth: 1,
    borderColor: '#DDD6FE',
    flexShrink: 1,
  },
  tournamentName: {
    fontFamily: Fonts.semiBold,
    fontSize: 11,
    color: Colors.textPurple,
  },
  teamsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: 18,
  },
  teamCol: {
    alignItems: 'center',
    flex: 1,
  },
  teamLogoBg: {
    width: 52,
    height: 52,
    borderRadius: Radii.lg,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  teamLogoBgAlt: {
    backgroundColor: '#F3E8FF',
  },
  teamShortBadge: {
    fontFamily: Fonts.bold,
    fontSize: 16,
    color: Colors.textPurple,
  },
  teamShortBadgeAlt: {
    color: Colors.primary,
  },
  teamName: {
    fontFamily: Fonts.bold,
    fontSize: 14,
    color: Colors.text,
    textAlign: 'center',
  },
  vsBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5F3FF',
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8,
  },
  vsText: {
    fontFamily: Fonts.bold,
    fontSize: 11,
    color: Colors.primary,
  },
  venueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  venueText: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  tossBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F3FF',
    borderWidth: 1.5,
    borderColor: '#DDD6FE',
    borderRadius: Radii.lg,
    padding: 14,
    gap: 12,
  },
  tossIconBg: {
    width: 34,
    height: 34,
    borderRadius: Radii.md,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tossTextCol: {
    flex: 1,
  },
  tossTitle: {
    fontFamily: Fonts.bold,
    fontSize: 13,
    color: Colors.textPurple,
  },
  tossSubtitle: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: Colors.text,
    marginTop: 2,
  },
  tossBold: {
    fontFamily: Fonts.bold,
    color: Colors.primary,
  },
  actionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radii.xl,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  actionCardTitle: {
    fontFamily: Fonts.bold,
    fontSize: 15,
    color: Colors.text,
  },
  buttonStack: {
    gap: 10,
  },
  primaryAction: {
    width: '100%',
  },
  disabledActionWrapper: {
    gap: 6,
  },
  lockedBtn: {
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB',
  },
  lockedHint: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radii.xl,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  infoCardTitle: {
    fontFamily: Fonts.bold,
    fontSize: 15,
    color: Colors.text,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  infoLabel: {
    fontFamily: Fonts.medium,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  infoValue: {
    fontFamily: Fonts.semiBold,
    fontSize: 13,
    color: Colors.text,
  },
  roleTag: {
    backgroundColor: '#F5F3FF',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: Radii.full,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  roleTagText: {
    fontFamily: Fonts.bold,
    fontSize: 11,
    color: Colors.textPurple,
  },
  squadsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radii.xl,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  squadsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  squadsCardTitle: {
    fontFamily: Fonts.bold,
    fontSize: 15,
    color: Colors.text,
  },
  manageLineupText: {
    fontFamily: Fonts.semiBold,
    fontSize: 12,
    color: Colors.primary,
  },
  manageLineupDisabled: {
    color: Colors.textMuted,
  },
  squadTabs: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  squadTab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: Radii.md,
    backgroundColor: Colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  squadTabActive: {
    backgroundColor: '#F5F3FF',
    borderColor: Colors.primary,
  },
  squadTabText: {
    fontFamily: Fonts.medium,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  squadTabTextActive: {
    fontFamily: Fonts.bold,
    color: Colors.primary,
  },
  squadPlayersContainer: {
    gap: 8,
  },
  noSquadText: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingVertical: 12,
  },
  squadPlayerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: Radii.md,
    backgroundColor: '#FAF5FF',
  },
  squadPlayerInfo: {
    flex: 1,
  },
  squadPlayerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  squadPlayerName: {
    fontFamily: Fonts.semiBold,
    fontSize: 13,
    color: Colors.text,
  },
  captainPill: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#F59E0B',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: Radii.sm,
  },
  captainPillText: {
    fontFamily: Fonts.bold,
    fontSize: 9,
    color: '#B45309',
  },
  viceCaptainPill: {
    backgroundColor: '#EDE9FE',
    borderWidth: 1,
    borderColor: '#8B5CF6',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: Radii.sm,
  },
  viceCaptainPillText: {
    fontFamily: Fonts.bold,
    fontSize: 9,
    color: '#6D28D9',
  },
  squadPlayerRole: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  lineupTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radii.sm,
  },
  lineupTagPlaying: {
    backgroundColor: '#DCFCE7',
  },
  lineupTagBench: {
    backgroundColor: '#F3F4F6',
  },
  lineupTagText: {
    fontFamily: Fonts.semiBold,
    fontSize: 10,
  },
  lineupTagTextPlaying: {
    color: '#15803D',
  },
  lineupTagTextBench: {
    color: '#6B7280',
  },
});
