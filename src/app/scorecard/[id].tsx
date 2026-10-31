import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { matchesApi } from '@/api/matches.api';
import { MatchScorecard, OfficialMatch } from '@/types/api';
import { Colors, Radii, Fonts } from '@/theme/tokens';
import {
  getTeamAName,
  getTeamBName,
  getTeamAShort,
  getTeamBShort,
  getTournamentName,
  getVenueText,
  getFormattedSchedule,
} from '@/utils/match-helpers';

export default function ScorecardScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, 16);

  const [match, setMatch] = useState<OfficialMatch | null>(null);
  const [scorecard, setScorecard] = useState<MatchScorecard | null>(null);
  const [playerNameMap, setPlayerNameMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedInningsIdx, setSelectedInningsIdx] = useState(0);

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      const [scorecardRes, matchRes, squadsRes] = await Promise.allSettled([
        matchesApi.getScorecard(id),
        matchesApi.getMatchById(id),
        matchesApi.getMatchSquads(id),
      ]);

      if (scorecardRes.status === 'fulfilled' && scorecardRes.value?.data) {
        setScorecard(scorecardRes.value.data);
      }
      if (matchRes.status === 'fulfilled' && matchRes.value?.data) {
        setMatch(matchRes.value.data);
      }

      // Build player name lookup from squads
      if (squadsRes.status === 'fulfilled' && squadsRes.value?.data) {
        const squadsData = squadsRes.value.data;
        const nameMap: Record<string, string> = {};
        const allPlayers = [
          ...(squadsData.teamA?.players || []),
          ...(squadsData.teamB?.players || []),
        ];
        for (const p of allPlayers) {
          nameMap[p.id] = p.name;
        }
        setPlayerNameMap(nameMap);
      }
    } catch {
      // Handled gracefully
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const teamAName = getTeamAName(match);
  const teamBName = getTeamBName(match);
  const teamAShort = getTeamAShort(match);
  const teamBShort = getTeamBShort(match);
  const tournamentName = getTournamentName(match);
  const venueText = getVenueText(match);
  const scheduleText = getFormattedSchedule(match);

  const inningsList = scorecard?.innings || [];
  const currentInnings = inningsList[selectedInningsIdx] || inningsList[0];

  const totalRuns = currentInnings?.totalRuns ?? currentInnings?.runs ?? 0;
  const totalWickets = currentInnings?.totalWickets ?? currentInnings?.wickets ?? 0;
  const totalOvers = currentInnings?.totalOvers ?? currentInnings?.overs ?? 0;
  const isDeclared = Boolean(currentInnings?.isDeclared || currentInnings?.declared);
  const crr = currentInnings?.runRate
    ? Number(currentInnings.runRate).toFixed(2)
    : Number(totalOvers) > 0
    ? (Number(totalRuns) / Number(totalOvers)).toFixed(2)
    : '0.00';

  // Resolve player name using the lookup map, with fallback
  const resolvePlayerName = (entry: any, fallbackPrefix: string, idx: number): string => {
    if (entry.name) return entry.name;
    if (entry.playerName) return entry.playerName;
    if (entry.playerId && playerNameMap[entry.playerId]) return playerNameMap[entry.playerId];
    return `${fallbackPrefix} ${idx + 1}`;
  };

  const battersList =
    currentInnings?.batters && currentInnings.batters.length > 0
      ? currentInnings.batters.map((b: any, idx: number) => ({
          name: resolvePlayerName(b, 'Batter', idx),
          dismissal: b.isOut ? (b.dismissalType || b.dismissal || 'c & b Out') : 'not out',
          runs: b.runs ?? 0,
          balls: b.balls ?? 0,
          fours: b.fours ?? 0,
          sixes: b.sixes ?? 0,
          sr: b.strikeRate ? Number(b.strikeRate).toFixed(1) : b.balls > 0 ? ((b.runs / b.balls) * 100).toFixed(1) : '0.0',
        }))
      : [];

  const bowlersList =
    currentInnings?.bowlers && currentInnings.bowlers.length > 0
      ? currentInnings.bowlers.map((bw: any, idx: number) => ({
          name: resolvePlayerName(bw, 'Bowler', idx),
          overs: bw.overs ?? '0.0',
          maidens: bw.maidens ?? 0,
          runs: bw.runsConceded ?? bw.runs ?? 0,
          wickets: bw.wickets ?? 0,
          econ: bw.economy
            ? Number(bw.economy).toFixed(2)
            : bw.overs && Number(bw.overs) > 0
            ? (Number(bw.runsConceded ?? bw.runs ?? 0) / Number(bw.overs)).toFixed(2)
            : '0.00',
        }))
      : [];

  return (
    <GradientBackground style={styles.container}>
      <View style={[styles.innerContainer, { paddingTop: topInset }]}>
        <ScreenHeader title="Match Scorecard" showBack={true} />

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {/* Match Header Hero Card */}
          <View style={styles.summaryCard}>
            <View style={styles.tournamentPill}>
              <Ionicons name="trophy" size={13} color="#7C3AED" />
              <Text style={styles.tournamentPillText}>{tournamentName}</Text>
            </View>

            <View style={styles.matchTeamsRow}>
              <View style={styles.teamBadge}>
                <Text style={styles.teamBadgeText}>{teamAShort}</Text>
              </View>
              <View style={styles.teamNamesCenter}>
                <Text style={styles.matchTitle} numberOfLines={1}>
                  {teamAName}
                </Text>
                <Text style={styles.vsText}>VS</Text>
                <Text style={styles.matchTitle} numberOfLines={1}>
                  {teamBName}
                </Text>
              </View>
              <View style={[styles.teamBadge, styles.teamBadgeSecondary]}>
                <Text style={[styles.teamBadgeText, styles.teamBadgeSecondaryText]}>{teamBShort}</Text>
              </View>
            </View>

            {/* Result or status banner */}
            <View style={styles.resultBanner}>
              <Ionicons name="information-circle" size={15} color="#7C3AED" />
              <Text style={styles.resultSummaryText}>
                {scorecard?.resultSummary || (match?.status ? `STATUS: ${match.status.replace(/_/g, ' ')}` : 'OFFICIAL MATCH RECORD')}
              </Text>
            </View>

            {/* Follow-On Banner */}
            {scorecard?.followOnEnforced && (
              <View style={styles.followOnBanner}>
                <Ionicons name="repeat" size={14} color="#7C3AED" />
                <Text style={styles.followOnBannerText}>
                  Follow-On Enforced under MCC Law 14
                </Text>
              </View>
            )}

            {/* DLS Revision Banner */}
            {scorecard?.dlsInfo && (
              <View style={styles.dlsBanner}>
                <Ionicons name="rainy" size={14} color="#D97706" />
                <Text style={styles.dlsBannerText}>
                  DLS Adjusted Target: {scorecard.dlsInfo.revisedTarget} ({scorecard.dlsInfo.revisedOvers} Overs) • Par: {scorecard.dlsInfo.parScore}
                </Text>
              </View>
            )}

            {/* Current Innings Score */}
            <View style={styles.scoreRow}>
              <View style={styles.scoreBlock}>
                <Text style={styles.scoreNumber}>
                  {totalRuns} / {totalWickets} {isDeclared ? 'd' : ''}
                </Text>
                <Text style={styles.oversLabel}>({totalOvers} Overs)</Text>
              </View>
              <View style={styles.crrBlock}>
                <Text style={styles.crrLabel}>CRR</Text>
                <Text style={styles.crrValue}>{crr}</Text>
              </View>
            </View>

            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <Ionicons name="location-outline" size={13} color={Colors.textSecondary} />
                <Text style={styles.metaText}>{venueText}</Text>
              </View>
              <View style={styles.metaItem}>
                <Ionicons name="calendar-outline" size={13} color={Colors.textSecondary} />
                <Text style={styles.metaText}>{scheduleText}</Text>
              </View>
            </View>

            {scorecard?.rules && (
              <View style={styles.rulesPill}>
                <Ionicons name="shield-checkmark" size={13} color="#7C3AED" />
                <Text style={styles.rulesPillText}>
                  Rules: {scorecard.rules.format === 'TEST' ? 'Multi-Day Test' : `${scorecard.rules.oversPerInnings ?? 20} Overs`} • Max {scorecard.rules.maxOversPerBowler ?? 4} Overs/Bowler • {scorecard.rules.playersPerTeam ?? 11} Players
                </Text>
              </View>
            )}
          </View>

          {/* Innings Tabs (Up to 4 Innings in Test Matches) */}
          {inningsList.length > 1 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScrollContainer}>
              <View style={styles.tabContainer}>
                {inningsList.map((inn: any, idx: number) => {
                  const isActive = selectedInningsIdx === idx;
                  const isDecl = inn.isDeclared || inn.declared;
                  const innNumber = inn.inningsNumber || (idx + 1);
                  const suffix = innNumber === 1 ? '1st' : innNumber === 2 ? '2nd' : innNumber === 3 ? '3rd' : '4th';
                  const tabLabel = `${suffix} Inn${isDecl ? ' (d)' : ''}`;
                  return (
                    <TouchableOpacity
                      key={idx}
                      style={[styles.tabButton, isActive && styles.tabButtonActive]}
                      onPress={() => setSelectedInningsIdx(idx)}
                    >
                      <Text style={[styles.tabButtonText, isActive && styles.tabButtonTextActive]}>
                        {tabLabel}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          )}

          {loading ? (
            <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 24 }} />
          ) : (
            <>
              {/* Batting Scorecard */}
              <View style={styles.tableCard}>
                <View style={styles.tableTitleRow}>
                  <Ionicons name="flash-outline" size={16} color={Colors.primary} />
                  <Text style={styles.tableTitle}>Batting Performance</Text>
                </View>

                <View style={styles.tableHeader}>
                  <Text style={[styles.headerCell, styles.playerCol]}>Batter</Text>
                  <Text style={styles.headerCell}>R</Text>
                  <Text style={styles.headerCell}>B</Text>
                  <Text style={styles.headerCell}>4s</Text>
                  <Text style={styles.headerCell}>6s</Text>
                  <Text style={styles.headerCell}>SR</Text>
                </View>

                {battersList.length === 0 ? (
                  <Text style={styles.emptyTableText}>No batting stats recorded yet for this innings</Text>
                ) : (
                  battersList.map((b: any, i: number) => (
                    <View key={i} style={styles.tableRow}>
                      <View style={styles.playerCol}>
                        <Text style={styles.batterName}>{b.name}</Text>
                        <Text style={styles.dismissalText}>{b.dismissal}</Text>
                      </View>
                      <Text style={[styles.cell, styles.boldCell]}>{b.runs}</Text>
                      <Text style={styles.cell}>{b.balls}</Text>
                      <Text style={styles.cell}>{b.fours}</Text>
                      <Text style={styles.cell}>{b.sixes}</Text>
                      <Text style={styles.cell}>{b.sr}</Text>
                    </View>
                  ))
                )}
              </View>

              {/* Bowling Scorecard */}
              <View style={styles.tableCard}>
                <View style={styles.tableTitleRow}>
                  <Ionicons name="baseball-outline" size={16} color="#DC2626" />
                  <Text style={styles.tableTitle}>Bowling Figures</Text>
                </View>

                <View style={styles.tableHeader}>
                  <Text style={[styles.headerCell, styles.playerCol]}>Bowler</Text>
                  <Text style={styles.headerCell}>O</Text>
                  <Text style={styles.headerCell}>M</Text>
                  <Text style={styles.headerCell}>R</Text>
                  <Text style={styles.headerCell}>W</Text>
                  <Text style={styles.headerCell}>Econ</Text>
                </View>

                {bowlersList.length === 0 ? (
                  <Text style={styles.emptyTableText}>No bowling stats recorded yet for this innings</Text>
                ) : (
                  bowlersList.map((bw: any, i: number) => (
                    <View key={i} style={styles.tableRow}>
                      <Text style={[styles.batterName, styles.playerCol]}>{bw.name}</Text>
                      <Text style={styles.cell}>{bw.overs}</Text>
                      <Text style={styles.cell}>{bw.maidens}</Text>
                      <Text style={styles.cell}>{bw.runs}</Text>
                      <Text style={[styles.cell, styles.boldCell, { color: '#DC2626' }]}>
                        {bw.wickets}
                      </Text>
                      <Text style={styles.cell}>{bw.econ}</Text>
                    </View>
                  ))
                )}
              </View>
            </>
          )}
        </ScrollView>
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
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 40,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radii.xl,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
    shadowColor: Colors.shadowPurple,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  tournamentPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F5F3FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radii.full,
    borderWidth: 1,
    borderColor: '#DDD6FE',
    alignSelf: 'flex-start',
    marginBottom: 14,
  },
  tournamentPillText: {
    fontFamily: Fonts.semiBold,
    fontSize: 11,
    color: '#7C3AED',
    textTransform: 'uppercase',
  },
  matchTeamsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  teamBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F5F3FF',
    borderWidth: 1.5,
    borderColor: '#DDD6FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamBadgeText: {
    fontFamily: Fonts.bold,
    fontSize: 14,
    color: '#6D28D9',
  },
  teamBadgeSecondary: {
    backgroundColor: '#FAF5FF',
    borderColor: '#E9D5FF',
  },
  teamBadgeSecondaryText: {
    color: '#7C3AED',
  },
  teamNamesCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  matchTitle: {
    fontFamily: Fonts.bold,
    fontSize: 15,
    color: Colors.text,
    textAlign: 'center',
  },
  vsText: {
    fontFamily: Fonts.bold,
    fontSize: 11,
    color: Colors.primary,
    marginVertical: 2,
  },
  resultBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F5F3FF',
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: '#DDD6FE',
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 14,
  },
  resultSummaryText: {
    fontFamily: Fonts.medium,
    fontSize: 12,
    color: '#4C1D95',
    flex: 1,
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#F5F3FF',
    borderBottomWidth: 1,
    borderBottomColor: '#F5F3FF',
    marginBottom: 12,
  },
  scoreBlock: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  scoreNumber: {
    fontFamily: Fonts.extraBold,
    fontSize: 26,
    color: Colors.primary,
  },
  oversLabel: {
    fontFamily: Fonts.medium,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  crrBlock: {
    alignItems: 'flex-end',
  },
  crrLabel: {
    fontFamily: Fonts.medium,
    fontSize: 10,
    color: Colors.textMuted,
    textTransform: 'uppercase',
  },
  crrValue: {
    fontFamily: Fonts.bold,
    fontSize: 14,
    color: Colors.text,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flexShrink: 1,
  },
  metaText: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F5F3FF',
    padding: 3,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: '#DDD6FE',
    marginBottom: 14,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: Radii.md,
    alignItems: 'center',
  },
  tabButtonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: Colors.shadowPurple,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  tabButtonText: {
    fontFamily: Fonts.medium,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  tabButtonTextActive: {
    fontFamily: Fonts.semiBold,
    color: Colors.primary,
  },
  tableCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radii.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
    shadowColor: Colors.shadowPurple,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  tableTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  tableTitle: {
    fontFamily: Fonts.bold,
    fontSize: 15,
    color: Colors.text,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F3FF',
  },
  headerCell: {
    fontFamily: Fonts.semiBold,
    fontSize: 11,
    color: Colors.textSecondary,
    textAlign: 'center',
    width: 32,
    textTransform: 'uppercase',
  },
  playerCol: {
    flex: 1,
    textAlign: 'left',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F3FF',
  },
  batterName: {
    fontFamily: Fonts.semiBold,
    fontSize: 13,
    color: Colors.text,
  },
  dismissalText: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  cell: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: Colors.text,
    textAlign: 'center',
    width: 32,
  },
  boldCell: {
    fontFamily: Fonts.bold,
    color: Colors.text,
  },
  emptyTableText: {
    fontFamily: Fonts.medium,
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingVertical: 18,
    fontStyle: 'italic',
  },
  rulesPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F5F3FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radii.full,
    alignSelf: 'center',
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  rulesPillText: {
    fontFamily: Fonts.medium,
    fontSize: 11,
    color: '#6D28D9',
  },
  tabScrollContainer: {
    marginBottom: 16,
  },
  followOnBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FAF5FF',
    borderWidth: 1,
    borderColor: '#C4B5FD',
    borderRadius: Radii.md,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginBottom: 12,
  },
  followOnBannerText: {
    fontFamily: Fonts.semiBold,
    fontSize: 11,
    color: '#6D28D9',
  },
  dlsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: Radii.md,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginBottom: 12,
  },
  dlsBannerText: {
    fontFamily: Fonts.semiBold,
    fontSize: 11,
    color: '#92400E',
  },
});
