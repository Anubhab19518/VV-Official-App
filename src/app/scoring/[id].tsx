import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Button } from '@/components/ui/Button';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { OpenersModal } from '@/components/scoring/OpenersModal';
import { NextBowlerModal, BowlerStatEntry } from '@/components/scoring/NextBowlerModal';
import { WicketModal } from '@/components/scoring/WicketModal';
import { ResultModal } from '@/components/scoring/ResultModal';
import { DlsModal } from '@/components/scoring/DlsModal';
import { FollowOnModal } from '@/components/scoring/FollowOnModal';
import { TossModal } from '@/components/matches/TossModal';
import { matchesApi } from '@/api/matches.api';
import {
  OfficialMatch,
  MatchSquadsData,
  MatchScorecard,
  TournamentRules,
  SquadPlayer,
  RecordTossResponse,
  DlsInfoResponse,
  RecordDlsInterruptionPayload,
} from '@/types/api';
import { Colors, Fonts, Radii } from '@/theme/tokens';
import {
  getTeamAName,
  getTeamBName,
  getTournamentName,
  getVenueText,
} from '@/utils/match-helpers';

interface BallEvent {
  text: string;
  isWicket?: boolean;
  isBoundary?: boolean;
  isExtra?: boolean;
}

interface ActiveBatter extends SquadPlayer {
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
}

interface ActiveBowler extends SquadPlayer {
  overs: number;
  balls: number;
  runs: number;
  wickets: number;
}

export default function LiveScoringScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  // Backend match and squad metadata
  const [match, setMatch] = useState<OfficialMatch | null>(null);
  const [squads, setSquads] = useState<MatchSquadsData | null>(null);
  const [_scorecard, setScorecard] = useState<MatchScorecard | null>(null);
  const [loading, setLoading] = useState(true);

  // Active Innings State
  const [inningsNumber, setInningsNumber] = useState<number>(1);
  const [activeInningsId, setActiveInningsId] = useState<string>('');
  const [battingTeamId, setBattingTeamId] = useState<string>('');
  const [bowlingTeamId, setBowlingTeamId] = useState<string>('');

  // Live scoreboard numbers
  const [runs, setRuns] = useState(0);
  const [wickets, setWickets] = useState(0);
  const [overs, setOvers] = useState(0);
  const [balls, setBalls] = useState(0);
  const [recentBalls, setRecentBalls] = useState<BallEvent[]>([]);
  const [saving, setSaving] = useState(false);

  // Active Players on field
  const [striker, setStriker] = useState<ActiveBatter | null>(null);
  const [nonStriker, setNonStriker] = useState<ActiveBatter | null>(null);
  const [bowler, setBowler] = useState<ActiveBowler | null>(null);
  const [previousBowlerId, setPreviousBowlerId] = useState<string | undefined>(undefined);
  const [battedPlayerIds, setBattedPlayerIds] = useState<string[]>([]);

  // Tournament Rules dynamically loaded from scorecard
  const [tournamentRules, setTournamentRules] = useState<TournamentRules>({
    oversPerInnings: 5,
    maxOversPerBowler: 2,
    ballsPerOver: 6,
    playersPerTeam: 6,
  });

  // Cumulative bowling stats for all bowlers in the innings
  const [bowlerStatsMap, setBowlerStatsMap] = useState<Record<string, BowlerStatEntry>>({});

  // Modals state
  const [showOpenersModal, setShowOpenersModal] = useState(false);
  const [showNextBowlerModal, setShowNextBowlerModal] = useState(false);
  const [showWicketModal, setShowWicketModal] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [showTossModal, setShowTossModal] = useState(false);
  const [showDlsModal, setShowDlsModal] = useState(false);
  const [dlsInfo, setDlsInfo] = useState<DlsInfoResponse | null>(null);
  const [showFollowOnModal, setShowFollowOnModal] = useState(false);
  const [followOnData, setFollowOnData] = useState<{ lead: number; threshold: number } | null>(null);
  const [followOnEnforced, setFollowOnEnforced] = useState(false);

  // Helper: look up player from squads by ID
  const findPlayerInSquads = useCallback(
    (playerId: string, loadedSquads: MatchSquadsData | null): SquadPlayer | null => {
      if (!loadedSquads) return null;
      const allPlayers = [
        ...(loadedSquads.teamA?.players || []),
        ...(loadedSquads.teamB?.players || []),
      ];
      return allPlayers.find((p) => p.id === playerId) || null;
    },
    []
  );

  // Derive active squad players for both teams (moved before initializeScoring so it can be used there)
  const getPlayingPlayers = useCallback(
    (teamKey: 'A' | 'B', loadedSquads?: MatchSquadsData | null): SquadPlayer[] => {
      const sq = loadedSquads || squads;
      if (!sq) return [];
      const team = teamKey === 'A' ? sq.teamA : sq.teamB;

      // Check lineups from squads API format
      const lineupIds =
        teamKey === 'A'
          ? sq.lineups?.teamAPlayerIds
          : sq.lineups?.teamBPlayerIds;

      if (lineupIds && lineupIds.length > 0 && team?.players) {
        return team.players.filter((p) => lineupIds.includes(p.id));
      }
      return team?.players || [];
    },
    [squads]
  );

  // 1. Initial Load of Match, Squads, and Scorecard
  const initializeScoring = useCallback(async () => {
    if (!id) return;
    try {
      const [matchRes, squadsRes, scRes] = await Promise.allSettled([
        matchesApi.getMatchById(id),
        matchesApi.getMatchSquads(id),
        matchesApi.getScorecard(id),
      ]);

      let loadedMatch: OfficialMatch | null = null;
      let loadedSquads: MatchSquadsData | null = null;
      let loadedScorecard: MatchScorecard | null = null;

      if (matchRes.status === 'fulfilled' && matchRes.value?.data) {
        loadedMatch = matchRes.value.data;
        setMatch(loadedMatch);
      }
      if (squadsRes.status === 'fulfilled' && squadsRes.value?.data) {
        loadedSquads = squadsRes.value.data;
        setSquads(loadedSquads);
      }
      if (scRes.status === 'fulfilled' && scRes.value?.data) {
        loadedScorecard = scRes.value.data;
        setScorecard(loadedScorecard);
        if (loadedScorecard.rules) {
          setTournamentRules({
            format: loadedScorecard.rules.format || (loadedMatch as any)?.matchFormat || 'T20',
            oversPerInnings: loadedScorecard.rules.oversPerInnings,
            maxOversPerInnings: loadedScorecard.rules.maxOversPerInnings,
            maxOversPerBowler: loadedScorecard.rules.maxOversPerBowler,
            ballsPerOver: loadedScorecard.rules.ballsPerOver ?? 6,
            playersPerTeam: loadedScorecard.rules.playersPerTeam ?? 11,
            powerplayOvers: loadedScorecard.rules.powerplayOvers,
            dlsEnabled: loadedScorecard.rules.dlsEnabled ?? loadedScorecard.rules.enableDls,
            enableDls: loadedScorecard.rules.enableDls,
            superOverEnabled: loadedScorecard.rules.superOverEnabled,
            days: loadedScorecard.rules.days,
            oversPerDay: loadedScorecard.rules.oversPerDay,
            enforceBowlerLimitInTest: loadedScorecard.rules.enforceBowlerLimitInTest,
            followOnThreshold: loadedScorecard.rules.followOnThreshold,
            allowDeclarations: loadedScorecard.rules.allowDeclarations,
          });
        }
        if (loadedScorecard.dlsInfo) {
          setDlsInfo(loadedScorecard.dlsInfo);
        }
        if (loadedScorecard.followOnEnforced) {
          setFollowOnEnforced(true);
        }
      }

      // Check tournament status
      if (loadedSquads && !loadedSquads.canStartMatch) {
        setLoading(false);
        return;
      }

      // Check toss
      if (!loadedSquads?.toss?.winnerTeamId && loadedMatch?.status !== 'LIVE') {
        setShowTossModal(true);
        setLoading(false);
        return;
      }

      // Determine batting & bowling teams from toss
      let bTeamId = '';
      let fTeamId = '';
      const t = loadedSquads?.toss;
      const teamAId = loadedSquads?.teamA?.id || loadedMatch?.teamAId || '';
      const teamBId = loadedSquads?.teamB?.id || loadedMatch?.teamBId || '';

      if (t?.battingTeamId && t?.bowlingTeamId) {
        bTeamId = t.battingTeamId;
        fTeamId = t.bowlingTeamId;
      } else if (t?.winnerTeamId && t?.decision) {
        if (t.decision === 'BAT') {
          bTeamId = t.winnerTeamId;
          fTeamId = t.winnerTeamId === teamAId ? teamBId : teamAId;
        } else {
          fTeamId = t.winnerTeamId;
          bTeamId = t.winnerTeamId === teamAId ? teamBId : teamAId;
        }
      } else {
        bTeamId = teamAId;
        fTeamId = teamBId;
      }

      setBattingTeamId(bTeamId);
      setBowlingTeamId(fTeamId);

      // Check or create Innings & restore full state
      const existingInnings = loadedScorecard?.innings;
      if (existingInnings && existingInnings.length > 0) {
        const currentInn = existingInnings[existingInnings.length - 1];
        if (currentInn.id) {
          setActiveInningsId(currentInn.id);
        } else {
          setActiveInningsId(id);
        }
        setInningsNumber(currentInn.inningsNumber || existingInnings.length);

        if (currentInn.battingTeamId && currentInn.bowlingTeamId) {
          setBattingTeamId(currentInn.battingTeamId);
          setBowlingTeamId(currentInn.bowlingTeamId);
        }

        // Restore runs
        const restoredRuns = currentInn.totalRuns ?? currentInn.runs ?? 0;
        setRuns(restoredRuns);

        // Restore wickets (API returns totalWickets, not wickets)
        const restoredWickets = currentInn.totalWickets ?? currentInn.wickets ?? 0;
        setWickets(restoredWickets);

        // Restore overs (API returns totalOvers as string like "2.0")
        const oversStr = String(currentInn.totalOvers ?? currentInn.overs ?? '0.0');
        const oversFloat = parseFloat(oversStr);
        const restoredOvers = Math.floor(oversFloat);
        const restoredBalls = Math.round((oversFloat - restoredOvers) * 10);
        setOvers(restoredOvers);
        setBalls(restoredBalls);

        // Restore batters from scorecard
        const battersFromDB: any[] = currentInn.batters || [];
        const bowlersFromDB: any[] = currentInn.bowlers || [];

        if (battersFromDB.length > 0) {
          // Populate battedPlayerIds with ALL players who have batted
          const allBattedIds = battersFromDB.map((b: any) => b.playerId);
          setBattedPlayerIds(allBattedIds);

          // Find not-out batters for crease positions
          const notOutBatters = battersFromDB.filter((b: any) => !b.isOut);

          if (notOutBatters.length >= 1) {
            const strikerData = notOutBatters[0];
            const strikerPlayer = findPlayerInSquads(strikerData.playerId, loadedSquads);
            setStriker({
              id: strikerData.playerId,
              name: strikerPlayer?.name || `Player`,
              role: strikerPlayer?.role,
              isCaptain: strikerPlayer?.isCaptain,
              isViceCaptain: strikerPlayer?.isViceCaptain,
              positions: strikerPlayer?.positions,
              avatarUrl: strikerPlayer?.avatarUrl,
              runs: strikerData.runs ?? 0,
              balls: strikerData.balls ?? 0,
              fours: strikerData.fours ?? 0,
              sixes: strikerData.sixes ?? 0,
            });
          }

          if (notOutBatters.length >= 2) {
            const nonStrikerData = notOutBatters[1];
            const nonStrikerPlayer = findPlayerInSquads(nonStrikerData.playerId, loadedSquads);
            setNonStriker({
              id: nonStrikerData.playerId,
              name: nonStrikerPlayer?.name || `Player`,
              role: nonStrikerPlayer?.role,
              isCaptain: nonStrikerPlayer?.isCaptain,
              isViceCaptain: nonStrikerPlayer?.isViceCaptain,
              positions: nonStrikerPlayer?.positions,
              avatarUrl: nonStrikerPlayer?.avatarUrl,
              runs: nonStrikerData.runs ?? 0,
              balls: nonStrikerData.balls ?? 0,
              fours: nonStrikerData.fours ?? 0,
              sixes: nonStrikerData.sixes ?? 0,
            });
          }
        }

        // Restore bowler from scorecard & build bowlerStatsMap
        if (bowlersFromDB.length > 0) {
          const initialBowlerMap: Record<string, BowlerStatEntry> = {};
          for (const b of bowlersFromDB) {
            const bOversStr = String(b.overs ?? '0.0');
            const bOversFloat = parseFloat(bOversStr);
            const bWholeOvers = Math.floor(bOversFloat);
            const bBalls = Math.round((bOversFloat - bWholeOvers) * 10);
            initialBowlerMap[b.playerId] = {
              overs: bWholeOvers,
              balls: bBalls,
              runs: b.runsConceded ?? b.runs ?? 0,
              wickets: b.wickets ?? 0,
            };
          }
          setBowlerStatsMap(initialBowlerMap);

          // Deliveries in current innings (if returned by backend)
          const innDeliveries = currentInn.deliveries || [];

          // Deliveries in the current over (overNumber matches restoredOvers)
          const deliveriesInCurrentOver = innDeliveries.filter(
            (d: any) => d.overNumber === restoredOvers
          );

          // Identify active bowler:
          // 1. From latest delivery in current over (if balls have already been bowled in this over)
          // 2. From currentInn.currentBowlerId
          // 3. From bowler whose fractional balls matches restoredBalls (if mid-over restoredBalls > 0)
          // 4. Fallback to last bowler in bowlersFromDB
          let activeBowlerId = deliveriesInCurrentOver.length > 0
            ? deliveriesInCurrentOver[deliveriesInCurrentOver.length - 1].bowlerId
            : currentInn.currentBowlerId;

          if (!activeBowlerId && restoredBalls > 0) {
            const partialBowler = bowlersFromDB.find((b: any) => {
              const bOversStr = String(b.overs ?? '0.0');
              const bOversFloat = parseFloat(bOversStr);
              const bWhole = Math.floor(bOversFloat);
              const bBalls = Math.round((bOversFloat - bWhole) * 10);
              return bBalls === restoredBalls;
            });
            if (partialBowler) {
              activeBowlerId = partialBowler.playerId;
            }
          }

          if (!activeBowlerId && bowlersFromDB.length > 0) {
            activeBowlerId = bowlersFromDB[bowlersFromDB.length - 1].playerId;
          }

          const activeBowlerData =
            bowlersFromDB.find((b: any) => b.playerId === activeBowlerId) ||
            bowlersFromDB[bowlersFromDB.length - 1];

          if (activeBowlerData) {
            const bowlerPlayer = findPlayerInSquads(activeBowlerData.playerId, loadedSquads);
            const bowlerOversStr = String(activeBowlerData.overs ?? '0.0');
            const bowlerOversFloat = parseFloat(bowlerOversStr);
            const bowlerWholeOvers = Math.floor(bowlerOversFloat);
            const bowlerBalls = Math.round((bowlerOversFloat - bowlerWholeOvers) * 10);

            setBowler({
              id: activeBowlerData.playerId,
              name: bowlerPlayer?.name || `Bowler`,
              role: bowlerPlayer?.role,
              isCaptain: bowlerPlayer?.isCaptain,
              isViceCaptain: bowlerPlayer?.isViceCaptain,
              positions: bowlerPlayer?.positions,
              avatarUrl: bowlerPlayer?.avatarUrl,
              overs: bowlerWholeOvers,
              balls: bowlerBalls,
              runs: activeBowlerData.runsConceded ?? activeBowlerData.runs ?? 0,
              wickets: activeBowlerData.wickets ?? 0,
            });
          }

          // Determine previous bowler (who bowled restoredOvers - 1)
          let prevBowlerId = currentInn.previousBowlerId;
          if (!prevBowlerId && innDeliveries.length > 0 && restoredOvers > 0) {
            const deliveriesInPrevOver = innDeliveries.filter(
              (d: any) => d.overNumber === restoredOvers - 1
            );
            if (deliveriesInPrevOver.length > 0) {
              prevBowlerId = deliveriesInPrevOver[deliveriesInPrevOver.length - 1].bowlerId;
            }
          }
          if (!prevBowlerId && bowlersFromDB.length >= 2) {
            const otherBowler = bowlersFromDB.find((b: any) => b.playerId !== activeBowlerId);
            prevBowlerId = otherBowler ? otherBowler.playerId : bowlersFromDB[bowlersFromDB.length - 2].playerId;
          }
          if (prevBowlerId) {
            setPreviousBowlerId(prevBowlerId);
          }

          // Restore recentBalls timeline for the current over
          if (deliveriesInCurrentOver.length > 0) {
            const timelineEvents: BallEvent[] = deliveriesInCurrentOver.map((d: any) => {
              const isExtra = d.extraType && d.extraType !== 'NONE';
              const displayLabel = d.isWicket
                ? 'W'
                : d.extraType === 'WIDE'
                ? `${d.runsExtra}Wd`
                : d.extraType === 'NO_BALL'
                ? `${d.runsExtra}Nb`
                : d.runsBatter === 0
                ? '•'
                : String(d.runsBatter);
              return {
                text: displayLabel,
                isWicket: d.isWicket,
                isBoundary: d.runsBatter === 4 || d.runsBatter === 6,
                isExtra,
              };
            });
            setRecentBalls(timelineEvents);
          }
        }

        // Decide which modal to show (or none)
        const inningsHasProgress =
          restoredRuns > 0 ||
          restoredWickets > 0 ||
          oversFloat > 0 ||
          battersFromDB.length > 0;

        if (inningsHasProgress) {
          // Check if innings is already completed
          const maxTournamentOvers = loadedScorecard?.rules?.oversPerInnings ?? 5;
          const ballsPerOverVal = loadedScorecard?.rules?.ballsPerOver ?? 6;
          const maxBallsAllowed = maxTournamentOvers * ballsPerOverVal;
          const currentLegalBalls = restoredOvers * ballsPerOverVal + restoredBalls;
          const maxW = (loadedScorecard?.rules?.playersPerTeam ?? 11) - 1;
          const isCompleted = currentLegalBalls >= maxBallsAllowed || restoredWickets >= maxW;

          // If an over just completed (balls=0 and overs>0) and innings is not finished, prompt for next bowler
          if (!isCompleted && restoredBalls === 0 && restoredOvers > 0 && bowlersFromDB.length > 0) {
            const lastBowlerOversStr = String(bowlersFromDB[bowlersFromDB.length - 1].overs ?? '0.0');
            const lastBowlerOversFloat = parseFloat(lastBowlerOversStr);
            const lastBowlerBalls = Math.round((lastBowlerOversFloat - Math.floor(lastBowlerOversFloat)) * 10);
            // If the last bowler's balls are 0, their over is complete — need new bowler
            if (lastBowlerBalls === 0 && lastBowlerOversFloat > 0) {
              setPreviousBowlerId(bowlersFromDB[bowlersFromDB.length - 1].playerId);
              setShowNextBowlerModal(true);
            }
          }
        } else {
          // Fresh innings — show openers modal
          setShowOpenersModal(true);
        }
      } else {
        // No innings exist yet — Start Innings 1 via API
        try {
          const innRes = await matchesApi.startInnings(id, {
            inningsNumber: 1,
            battingTeamId: bTeamId,
            bowlingTeamId: fTeamId,
          });
          const createdInningsId = innRes?.data?.id || id;
          setActiveInningsId(createdInningsId);
          setInningsNumber(1);
        } catch {
          setActiveInningsId(id);
        }
        setShowOpenersModal(true);
      }
    } catch (e) {
      console.warn('Initialization error:', e);
    } finally {
      setLoading(false);
    }
  }, [id, findPlayerInSquads]);

  useEffect(() => {
    initializeScoring();
  }, [initializeScoring]);

  const isBattingTeamA = battingTeamId === squads?.teamA?.id;
  const battingPlayers = getPlayingPlayers(isBattingTeamA ? 'A' : 'B');
  const bowlingPlayers = getPlayingPlayers(isBattingTeamA ? 'B' : 'A');

  const battingTeamName = isBattingTeamA
    ? squads?.teamA?.name || getTeamAName(match)
    : squads?.teamB?.name || getTeamBName(match);

  const bowlingTeamName = isBattingTeamA
    ? squads?.teamB?.name || getTeamBName(match)
    : squads?.teamA?.name || getTeamAName(match);

  // Available remaining batters for incoming batsman
  const remainingBatters = battingPlayers.filter(
    (p) =>
      !battedPlayerIds.includes(p.id) &&
      p.id !== striker?.id &&
      p.id !== nonStriker?.id
  );

  // 2. Openers Selection Confirmation
  const handleOpenersConfirmed = (
    chosenStriker: SquadPlayer,
    chosenNonStriker: SquadPlayer,
    chosenBowler: SquadPlayer
  ) => {
    setStriker({
      ...chosenStriker,
      runs: 0,
      balls: 0,
      fours: 0,
      sixes: 0,
    });
    setNonStriker({
      ...chosenNonStriker,
      runs: 0,
      balls: 0,
      fours: 0,
      sixes: 0,
    });
    setBowler({
      ...chosenBowler,
      overs: 0,
      balls: 0,
      runs: 0,
      wickets: 0,
    });
    setBattedPlayerIds((prev) => [
      ...new Set([...prev, chosenStriker.id, chosenNonStriker.id]),
    ]);
    setShowOpenersModal(false);
  };

  // 3. Record Ball Delivery
  const recordBall = async (
    runCount: number,
    isWicket = false,
    extraType: 'NONE' | 'WIDE' | 'NO_BALL' | 'BYE' | 'LEG_BYE' | 'PENALTY' = 'NONE',
    dismissalType?: any,
    dismissedPlayerId?: string,
    nextBatter?: SquadPlayer
  ) => {
    if (saving || !striker || !nonStriker || !bowler) {
      if (!striker || !nonStriker || !bowler) {
        setShowOpenersModal(true);
      }
      return;
    }

    // Enforce tournament rules
    const maxBallsPerOver = tournamentRules.ballsPerOver ?? 6;
    const maxLegalBalls = maxOvers * maxBallsPerOver;
    const maxWickets = (tournamentRules.playersPerTeam ?? 11) - 1;
    const currentLegalBalls = overs * maxBallsPerOver + balls;

    if (!isUnlimitedOvers && currentLegalBalls >= maxLegalBalls) {
      Alert.alert(
        'Innings Completed',
        `Maximum allowed overs (${maxOvers}) for this innings have already been bowled.`
      );
      return;
    }

    if (wickets >= maxWickets) {
      Alert.alert(
        'Team All Out',
        `All ${maxWickets} wickets have fallen. Innings is complete.`
      );
      return;
    }

    if (!isUnlimitedBowlerQuota && bowler.overs >= maxBowlerQuota) {
      Alert.alert(
        'Bowler Quota Reached',
        `${bowler.name} has already bowled their maximum quota of ${maxBowlerQuota} overs. Please select a different bowler.`
      );
      setShowNextBowlerModal(true);
      return;
    }

    setSaving(true);
    const isPenalty = extraType === 'PENALTY';
    const isLegalDelivery = extraType !== 'WIDE' && extraType !== 'NO_BALL' && !isPenalty;
    const isBatterRun = extraType === 'NONE';
    const runsBatter = isBatterRun ? runCount : 0;
    let runsExtra = 0;
    if (isPenalty) {
      runsExtra = 5;
    } else if (!isBatterRun) {
      runsExtra = extraType === 'WIDE' || extraType === 'NO_BALL' ? 1 + runCount : runCount;
    }
    const totalBallRuns = isBatterRun ? runCount : runsExtra;

    try {
      const deliveryInningsId = activeInningsId || id || 'current-innings';
      const apiRes = await matchesApi.recordDelivery(deliveryInningsId, {
        overNumber: overs,
        ballNumber: balls + 1,
        bowlerId: bowler.id,
        batterId: striker.id,
        nonStrikerId: nonStriker.id,
        runsBatter,
        runsExtra,
        extraType,
        isWicket,
        dismissalType: isWicket ? dismissalType || 'BOWLED' : undefined,
        dismissedPlayerId: isWicket ? dismissedPlayerId || striker.id : undefined,
        nextBatterId: nextBatter?.id,
      });

      if (apiRes?.status === 'error') {
        Alert.alert('Scoring Error', apiRes.message || 'Delivery rejected by server.');
        return;
      }
    } catch (err: any) {
      Alert.alert(
        'Scoring Error',
        err?.message || 'Failed to record delivery on backend. The score was not incremented.'
      );
      return;
    } finally {
      setSaving(false);
    }

    // Calculate score increments (only after successful backend recording)
    const nextTotalRuns = runs + totalBallRuns;
    let nextWickets = wickets;
    let nextBalls = balls;
    let nextOvers = overs;

    if (isWicket) {
      nextWickets += 1;
    }

    let overFinished = false;
    if (isLegalDelivery) {
      nextBalls += 1;
      if (nextBalls >= 6) {
        nextOvers += 1;
        nextBalls = 0;
        overFinished = true;
      }
    }

    setRuns(nextTotalRuns);
    setWickets(nextWickets);
    setOvers(nextOvers);
    setBalls(nextBalls);

    // Recent timeline ball
    const displayLabel = isWicket
      ? 'W'
      : extraType === 'PENALTY'
      ? '+5P'
      : extraType === 'WIDE'
      ? `${runsExtra}Wd`
      : extraType === 'NO_BALL'
      ? `${runsExtra}Nb`
      : runCount === 0
      ? '•'
      : String(runCount);

    setRecentBalls((prev) => [
      ...(overFinished ? [] : prev.slice(-6)),
      {
        text: displayLabel,
        isWicket,
        isBoundary: runsBatter === 4 || runsBatter === 6,
        isExtra: extraType !== 'NONE',
      },
    ]);

    // Update Bowler stats and persistent bowlerStatsMap
    const nextBowlerOvers = overFinished ? bowler.overs + 1 : bowler.overs;
    const nextBowlerBalls = overFinished ? 0 : (isLegalDelivery ? bowler.balls + 1 : bowler.balls);
    const nextBowlerRuns = bowler.runs + totalBallRuns;
    const nextBowlerWickets = isWicket ? bowler.wickets + 1 : bowler.wickets;

    setBowler({
      ...bowler,
      overs: nextBowlerOvers,
      balls: nextBowlerBalls,
      runs: nextBowlerRuns,
      wickets: nextBowlerWickets,
    });

    setBowlerStatsMap((prev) => ({
      ...prev,
      [bowler.id]: {
        overs: nextBowlerOvers,
        balls: nextBowlerBalls,
        runs: nextBowlerRuns,
        wickets: nextBowlerWickets,
      },
    }));

    // Handle Batter updates & Strike rotation
    if (isWicket && nextBatter) {
      if (dismissedPlayerId === nonStriker.id) {
        setNonStriker({
          ...nextBatter,
          runs: 0,
          balls: 0,
          fours: 0,
          sixes: 0,
        });
      } else {
        setStriker({
          ...nextBatter,
          runs: 0,
          balls: 0,
          fours: 0,
          sixes: 0,
        });
      }
      setBattedPlayerIds((prev) => [...prev, nextBatter.id]);
    } else {
      const updatedStriker = {
        ...striker,
        runs: striker.runs + runsBatter,
        balls: isLegalDelivery ? striker.balls + 1 : striker.balls,
        fours: runsBatter === 4 ? striker.fours + 1 : striker.fours,
        sixes: runsBatter === 6 ? striker.sixes + 1 : striker.sixes,
      };

      const shouldSwapEnds = (runCount % 2 === 1 && isLegalDelivery) !== overFinished;
      if (shouldSwapEnds) {
        setStriker(nonStriker);
        setNonStriker(updatedStriker);
      } else {
        setStriker(updatedStriker);
      }
    }

    // Check if innings is completed
    const nextTotalLegalBalls = nextOvers * maxBallsPerOver + nextBalls;
    const isTeamAllOut = nextWickets >= maxWickets;
    const isOversLimitReached = !isUnlimitedOvers && nextTotalLegalBalls >= maxLegalBalls;

    if (isTeamAllOut || isOversLimitReached) {
      handleConcludeCurrentInnings(isOversLimitReached);
      return;
    }

    // Over complete prompt (only if innings is still ongoing)
    if (overFinished) {
      setPreviousBowlerId(bowler.id);
      setTimeout(() => setShowNextBowlerModal(true), 400);
    }
  };

  // 4. Over complete bowler rotation (restores cumulative stats instead of wiping to 0)
  const handleNextBowlerSelected = (nextBowler: SquadPlayer) => {
    const existingStats = bowlerStatsMap[nextBowler.id] || {
      overs: 0,
      balls: 0,
      runs: 0,
      wickets: 0,
    };
    setBowler({
      ...nextBowler,
      overs: existingStats.overs,
      balls: existingStats.balls,
      runs: existingStats.runs,
      wickets: existingStats.wickets,
    });
    if (balls === 0) {
      setRecentBalls([]);
    }
    setShowNextBowlerModal(false);
  };

  // Undo Last Delivery (Authoritative Rollback)
  const handleUndoDelivery = () => {
    Alert.alert(
      'Undo Last Delivery',
      'Are you sure you want to revert the last recorded ball? The database will rollback the score and overs.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Undo Ball',
          style: 'destructive',
          onPress: async () => {
            setSaving(true);
            try {
              const deliveryInnId = activeInningsId || id!;
              await matchesApi.undoDelivery(deliveryInnId, 'Umpire corrected ball');

              const [updatedSc, updatedMatch, updatedSquads] = await Promise.all([
                matchesApi.getScorecard(id!),
                matchesApi.getMatchById(id!),
                matchesApi.getMatchSquads(id!),
              ]);

              if (updatedMatch?.data) setMatch(updatedMatch.data);
              if (updatedSquads?.data) setSquads(updatedSquads.data);
              if (updatedSc?.data) setScorecard(updatedSc.data);

              await initializeScoring();

              Alert.alert('Delivery Reverted', 'The last ball has been rolled back successfully.');
            } catch (err: any) {
              Alert.alert('Undo Error', err?.message || 'Failed to revert delivery on server.');
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  };

  // DLS Rain Interruption Handler
  const handleDlsSubmit = async (payload: RecordDlsInterruptionPayload) => {
    try {
      await matchesApi.recordDlsInterruption(id!, payload);
      const dlsRes = await matchesApi.getDlsInfo(id!);
      if (dlsRes?.data) {
        setDlsInfo(dlsRes.data);
      }
      Alert.alert(
        'DLS Target Applied',
        dlsRes?.data?.revisedTarget
          ? `Revised target: ${dlsRes.data.revisedTarget} in ${dlsRes.data.revisedOvers} overs (Par: ${dlsRes.data.parScore}).`
          : 'DLS interruption recorded successfully.'
      );
    } catch (err: any) {
      Alert.alert('DLS Error', err?.message || 'Failed to record DLS interruption.');
      throw err;
    }
  };

  // Follow-On threshold calculation based on match days (MCC Law 14)
  const getFollowOnThreshold = useCallback((): number => {
    if (tournamentRules.followOnThreshold && tournamentRules.followOnThreshold > 0) {
      return tournamentRules.followOnThreshold;
    }
    const days = tournamentRules.days ?? 5;
    if (days >= 5) return 200;
    if (days >= 3) return 150;
    if (days === 2) return 100;
    return 75;
  }, [tournamentRules]);

  // Test Cricket: Innings 2 Conclusion & Follow-on check
  const checkInnings2Conclusion = async () => {
    try {
      const scRes = await matchesApi.getScorecard(id!);
      const innList = scRes?.data?.innings || [];
      const inn1 = innList.find((i) => i.inningsNumber === 1);
      const inn2 = innList.find((i) => i.inningsNumber === 2);

      const r1 = inn1 ? (inn1.totalRuns ?? inn1.runs ?? 0) : 0;
      const r2 = inn2 ? (inn2.totalRuns ?? inn2.runs ?? 0) : runs;
      const lead = r1 - r2;
      const threshold = getFollowOnThreshold();

      if (lead >= threshold) {
        setFollowOnData({ lead, threshold });
        setShowFollowOnModal(true);
      } else {
        Alert.alert(
          'Innings 2 Concluded',
          `${teamAName} holds a lead of ${lead} runs (Below threshold of ${threshold}). ${teamAName} will bat in Innings 3.`,
          [
            {
              text: 'Start 3rd Innings',
              onPress: () => handleStartNextInnings(3, teamAId, teamBId),
            },
          ]
        );
      }
    } catch {
      handleStartNextInnings(3, teamAId, teamBId);
    }
  };

  // Test Cricket: Innings 3 Conclusion
  const checkInnings3Conclusion = async () => {
    try {
      const scRes = await matchesApi.getScorecard(id!);
      const innList = scRes?.data?.innings || [];
      const inn1 = innList.find((i) => i.inningsNumber === 1);
      const inn2 = innList.find((i) => i.inningsNumber === 2);
      const inn3 = innList.find((i) => i.inningsNumber === 3);

      const r1 = inn1 ? (inn1.totalRuns ?? inn1.runs ?? 0) : 0;
      const r2 = inn2 ? (inn2.totalRuns ?? inn2.runs ?? 0) : 0;
      const r3 = inn3 ? (inn3.totalRuns ?? inn3.runs ?? 0) : runs;

      if (followOnEnforced) {
        const teamBTotal = r2 + r3;
        if (teamBTotal <= r1) {
          const margin = r1 - teamBTotal;
          Alert.alert(
            'Innings Victory!',
            `${teamAName} won by an innings and ${margin} runs!`,
            [
              {
                text: 'Confirm Match Result',
                onPress: () => setShowResultModal(true),
              },
            ]
          );
          return;
        } else {
          const target = teamBTotal - r1 + 1;
          Alert.alert(
            '3rd Innings Concluded',
            `${teamBName} erased the deficit! ${teamAName} needs ${target} runs to win in the 4th Innings.`,
            [
              {
                text: 'Start 4th Innings',
                onPress: () => handleStartNextInnings(4, teamAId, teamBId),
              },
            ]
          );
        }
      } else {
        const teamATotal = r1 + r3;
        const target = teamATotal - r2 + 1;
        Alert.alert(
          '3rd Innings Concluded',
          `${teamAName} set a target of ${target} runs for ${teamBName}.`,
          [
            {
              text: 'Start 4th Innings',
              onPress: () => handleStartNextInnings(4, teamBId, teamAId),
            },
          ]
        );
      }
    } catch {
      handleStartNextInnings(4, bowlingTeamId, battingTeamId);
    }
  };

  // Generalized Innings Conclude Flow
  const handleConcludeCurrentInnings = async (isOversLimit = false) => {
    if (!isTestMatch) {
      if (inningsNumber === 1) {
        Alert.alert(
          'Innings 1 Concluded',
          isOversLimit
            ? `Maximum overs (${maxOvers}.0) completed! 1st Innings concluded at ${runs}/${wickets}.`
            : `All Out! 1st Innings concluded at ${runs}/${wickets}.`,
          [
            {
              text: 'Start 2nd Innings',
              onPress: () => handleStartNextInnings(2, bowlingTeamId, battingTeamId),
            },
            {
              text: 'View Scorecard',
              onPress: () => router.push(`/scorecard/${id}` as any),
            },
          ]
        );
      } else {
        Alert.alert(
          'Match Concluded',
          `2nd Innings concluded at ${runs}/${wickets}. Match play is complete.`,
          [
            {
              text: 'Submit Final Result',
              onPress: () => setShowResultModal(true),
            },
            {
              text: 'View Scorecard',
              onPress: () => router.push(`/scorecard/${id}` as any),
            },
          ]
        );
      }
      return;
    }

    if (inningsNumber === 1) {
      Alert.alert(
        '1st Innings Concluded',
        `1st Innings concluded at ${runs}/${wickets} in ${overs}.${balls} overs. Proceed to 2nd Innings with ${bowlingTeamName} batting?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Start 2nd Innings',
            onPress: () => handleStartNextInnings(2, bowlingTeamId, battingTeamId),
          },
        ]
      );
    } else if (inningsNumber === 2) {
      await checkInnings2Conclusion();
    } else if (inningsNumber === 3) {
      await checkInnings3Conclusion();
    } else {
      Alert.alert(
        'Match Concluded',
        `4th Innings concluded at ${runs}/${wickets}. Match play is complete.`,
        [
          {
            text: 'Submit Final Result',
            onPress: () => setShowResultModal(true),
          },
          {
            text: 'View Scorecard',
            onPress: () => router.push(`/scorecard/${id}` as any),
          },
        ]
      );
    }
  };

  // Follow-on decision callback
  const handleFollowOnDecision = async (decision: 'ENFORCE' | 'DECLINE') => {
    try {
      await matchesApi.decideFollowOn(id!, decision);
      setShowFollowOnModal(false);
      if (decision === 'ENFORCE') {
        setFollowOnEnforced(true);
        Alert.alert('Follow-On Enforced', `${teamBName} will bat again in Innings 3.`);
        await handleStartNextInnings(3, teamBId, teamAId);
      } else {
        setFollowOnEnforced(false);
        Alert.alert('Follow-On Declined', `${teamAName} will bat normally in Innings 3.`);
        await handleStartNextInnings(3, teamAId, teamBId);
      }
    } catch (err: any) {
      Alert.alert('Follow-On Error', err?.message || 'Could not record follow-on decision.');
      throw err;
    }
  };

  // Test Cricket: Declare Innings
  const handleDeclareInnings = () => {
    Alert.alert(
      'Declare Innings Closed',
      `Are you sure you want to declare Innings ${inningsNumber} closed at ${runs}/${wickets} (${overs}.${balls} overs)?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Declaration',
          style: 'destructive',
          onPress: async () => {
            setSaving(true);
            try {
              await matchesApi.declareInnings(id!, 'Innings declared closed', activeInningsId);
              Alert.alert('Innings Declared', `Innings ${inningsNumber} has been officially declared closed.`);
              await handleConcludeCurrentInnings(false);
            } catch (err: any) {
              Alert.alert('Declaration Error', err?.message || 'Could not declare innings.');
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  };

  // Test Cricket: Declare Match Drawn
  const handleDeclareDraw = () => {
    Alert.alert(
      'Declare Match Drawn',
      'Are you sure you want to conclude this match as a Draw? This applies Law 16 without penalty points.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Draw',
          onPress: async () => {
            setSaving(true);
            try {
              await matchesApi.declareDraw(id!, 'Match drawn by agreement / time expired');
              Alert.alert('Match Drawn', 'Match concluded as a Draw.', [
                { text: 'View Scorecard', onPress: () => router.push(`/scorecard/${id}` as any) },
              ]);
            } catch (err: any) {
              Alert.alert('Draw Error', err?.message || 'Could not record draw.');
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  };

  // Universal Innings Transition (Innings 1 to 4)
  const handleStartNextInnings = async (
    targetInningsNumber: number,
    newBattingId: string,
    newBowlingId: string
  ) => {
    setLoading(true);
    try {
      const res = await matchesApi.startInnings(id!, {
        inningsNumber: targetInningsNumber,
        battingTeamId: newBattingId,
        bowlingTeamId: newBowlingId,
      });

      setInningsNumber(targetInningsNumber);
      setActiveInningsId(res?.data?.id || `${id}-inn${targetInningsNumber}`);
      setBattingTeamId(newBattingId);
      setBowlingTeamId(newBowlingId);

      // Reset live crease numbers
      setRuns(0);
      setWickets(0);
      setOvers(0);
      setBalls(0);
      setRecentBalls([]);
      setStriker(null);
      setNonStriker(null);
      setBowler(null);
      setPreviousBowlerId(undefined);
      setBattedPlayerIds([]);
      setBowlerStatsMap({});

      setTimeout(() => setShowOpenersModal(true), 300);
    } catch (err: any) {
      Alert.alert('Innings Transition Error', err?.message || `Could not start innings ${targetInningsNumber}.`);
    } finally {
      setLoading(false);
    }
  };

  const handleTossRecorded = (res: RecordTossResponse) => {
    setShowTossModal(false);
    setBattingTeamId(res.battingTeamId);
    setBowlingTeamId(res.bowlingTeamId);
    setShowOpenersModal(true);
  };

  const teamAId = squads?.teamA?.id || match?.teamAId || '';
  const teamBId = squads?.teamB?.id || match?.teamBId || '';
  const teamAName = squads?.teamA?.name || getTeamAName(match);
  const teamBName = squads?.teamB?.name || getTeamBName(match);

  const isTestMatch =
    match?.matchFormat === 'TEST' ||
    tournamentRules.format === 'TEST' ||
    (match?.tournament?.sportType as string)?.toUpperCase() === 'TEST';

  const isUnlimitedOvers =
    isTestMatch && (!tournamentRules.maxOversPerInnings || tournamentRules.maxOversPerInnings <= 0);
  const maxOvers = isUnlimitedOvers
    ? 999
    : (dlsInfo?.revisedOvers ?? tournamentRules.maxOversPerInnings ?? tournamentRules.oversPerInnings ?? 5);

  const isUnlimitedBowlerQuota = isTestMatch && !tournamentRules.enforceBowlerLimitInTest;
  const maxBowlerQuota = isUnlimitedBowlerQuota ? 999 : (tournamentRules.maxOversPerBowler ?? 2);

  const topInset = Math.max(insets.top, 24);
  const maxBallsPerOver = tournamentRules.ballsPerOver ?? 6;
  const maxLegalBalls = maxOvers * maxBallsPerOver;
  const maxWickets = (tournamentRules.playersPerTeam ?? 11) - 1;
  const totalBallsBowled = overs * maxBallsPerOver + balls;
  const crr = totalBallsBowled > 0 ? ((runs / totalBallsBowled) * maxBallsPerOver).toFixed(2) : '0.00';
  const isInningsComplete = (!isUnlimitedOvers && totalBallsBowled >= maxLegalBalls) || wickets >= maxWickets;
  const isKeypadDisabled = saving || isInningsComplete;

  if (loading) {
    return (
      <GradientBackground style={styles.container}>
        <View style={[styles.innerContainer, { paddingTop: topInset }]}>
          <ScreenHeader title="Live Cricket Scoring" showBack={true} />
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Loading match and field setup...</Text>
          </View>
        </View>
      </GradientBackground>
    );
  }

  // Warning if tournament is in DRAFT
  if (squads && !squads.canStartMatch) {
    return (
      <GradientBackground style={styles.container}>
        <View style={[styles.innerContainer, { paddingTop: topInset }]}>
          <ScreenHeader title="Live Cricket Scoring" showBack={true} />
          <View style={styles.draftContainer}>
            <View style={styles.draftIconBg}>
              <Ionicons name="lock-closed" size={36} color="#D97706" />
            </View>
            <Text style={styles.draftTitle}>Tournament in DRAFT</Text>
            <Text style={styles.draftDesc}>
              The organizer must start the tournament before toss and live match play can begin.
            </Text>
            <Button
              title="Return to Match Overview"
              variant="outline"
              onPress={() => router.back()}
              style={{ marginTop: 20 }}
            />
          </View>
        </View>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground style={styles.container}>
      <View style={[styles.innerContainer, { paddingTop: topInset }]}>
        <ScreenHeader
          title={isTestMatch ? 'Test Cricket Scoring' : 'Live Cricket Scoring'}
          showBack={true}
          rightAction={
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              {!isTestMatch && (
                <TouchableOpacity
                  onPress={() => setShowDlsModal(true)}
                  style={styles.dlsHeaderBtn}
                >
                  <Ionicons name="rainy-outline" size={16} color="#D97706" />
                  <Text style={styles.dlsHeaderBtnText}>DLS</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={() => router.push(`/scorecard/${id}` as any)}>
                <Ionicons name="stats-chart" size={22} color={Colors.primary} />
              </TouchableOpacity>
            </View>
          }
        />

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Live Scorecard Header Card */}
          <View style={styles.scoreHeaderCard}>
            <View style={styles.headerTop}>
              <View style={styles.liveIndicator}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>LIVE</Text>
              </View>
              <Text style={styles.inningsText} numberOfLines={1}>
                {getTournamentName(match)} • {inningsNumber === 1 ? '1st Innings' : inningsNumber === 2 ? '2nd Innings' : inningsNumber === 3 ? '3rd Innings' : '4th Innings'}
                {isTestMatch && ' (Test)'}
              </Text>
            </View>

            {/* DLS Revision Badge if active */}
            {dlsInfo && (
              <View style={styles.dlsHeaderPill}>
                <Ionicons name="rainy" size={12} color="#D97706" />
                <Text style={styles.dlsHeaderPillText}>
                  DLS Target: {dlsInfo.revisedTarget} ({dlsInfo.revisedOvers} ov) • Par: {dlsInfo.parScore}
                </Text>
              </View>
            )}

            {/* Follow-on indicator */}
            {followOnEnforced && (
              <View style={styles.followOnPill}>
                <Ionicons name="repeat" size={12} color="#7C3AED" />
                <Text style={styles.followOnPillText}>Follow-On Enforced (Law 14)</Text>
              </View>
            )}

            <View style={styles.scoreRow}>
              <View style={styles.scoreLeftCol}>
                <Text style={styles.teamTitle}>{battingTeamName}</Text>
                <Text style={styles.vsSubtitle}>Bowling: {bowlingTeamName}</Text>
                <View style={styles.bigScoreRow}>
                  <Text style={styles.runsText}>{runs}</Text>
                  <Text style={styles.slashText}>/</Text>
                  <Text style={styles.wicketsText}>{wickets}</Text>
                </View>
              </View>

              <View style={styles.oversCol}>
                <Text style={styles.oversText}>
                  {overs}.{balls} {isUnlimitedOvers ? '' : `/ ${maxOvers}`} <Text style={styles.oversUnit}>OV</Text>
                </Text>
                <Text style={styles.crrText}>CRR: {crr}</Text>
                <Text style={styles.venueSubText} numberOfLines={1}>
                  {getVenueText(match)}
                </Text>
              </View>
            </View>

            {/* Players on Crease Strip */}
            <View style={styles.playersStrip}>
              <View style={styles.batsmenCol}>
                <Text style={styles.playerRole}>BATTERS</Text>
                {striker ? (
                  <Text style={styles.playerName}>
                    * {striker.name}{' '}
                    <Text style={styles.playerStat}>
                      ({striker.runs} off {striker.balls})
                    </Text>
                  </Text>
                ) : (
                  <Text style={styles.playerUnset}>[No Striker Selected]</Text>
                )}

                {nonStriker ? (
                  <Text style={styles.playerName}>
                    {nonStriker.name}{' '}
                    <Text style={styles.playerStat}>
                      ({nonStriker.runs} off {nonStriker.balls})
                    </Text>
                  </Text>
                ) : (
                  <Text style={styles.playerUnset}>[No Non-Striker Selected]</Text>
                )}
              </View>

              <TouchableOpacity
                style={styles.bowlerCol}
                activeOpacity={0.7}
                onPress={() => setShowNextBowlerModal(true)}
              >
                <View style={styles.bowlerHeaderRow}>
                  <Text style={styles.playerRole}>CURRENT BOWLER</Text>
                  <View style={styles.changeBowlerBadge}>
                    <Ionicons name="swap-horizontal" size={11} color="#FFFFFF" />
                    <Text style={styles.changeBowlerText}>Change</Text>
                  </View>
                </View>
                {bowler ? (
                  <>
                    <Text style={styles.playerName}>{bowler.name}</Text>
                    <Text style={styles.playerStat}>
                      {bowler.overs}.{bowler.balls} ov ({bowler.overs}/{tournamentRules.maxOversPerBowler ?? 2} max) • {bowler.wickets} wkts • {bowler.runs} runs
                    </Text>
                  </>
                ) : (
                  <Text style={styles.playerUnset}>[Tap to Select Bowler]</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Quick Setup Trigger if Openers Missing */}
          {(!striker || !nonStriker || !bowler) && (
            <TouchableOpacity
              style={styles.missingOpenersPill}
              onPress={() => setShowOpenersModal(true)}
            >
              <Ionicons name="people" size={18} color={Colors.primary} />
              <Text style={styles.missingOpenersText}>
                Openers not confirmed. Tap here to select active batters and bowler.
              </Text>
            </TouchableOpacity>
          )}

          {/* This Over Deliveries Timeline */}
          <View style={styles.recentSection}>
            <View style={styles.timelineHeader}>
              <Text style={styles.sectionTitle}>
                {isUnlimitedOvers
                  ? `Over ${overs + 1}`
                  : `This Over (${Math.min(overs + 1, maxOvers)}/${maxOvers})`}
              </Text>

              <View style={styles.timelineActions}>
                <TouchableOpacity
                  style={[
                    styles.undoBtn,
                    (saving || (recentBalls.length === 0 && overs === 0 && balls === 0)) &&
                      styles.undoBtnDisabled,
                  ]}
                  onPress={handleUndoDelivery}
                  disabled={saving || (recentBalls.length === 0 && overs === 0 && balls === 0)}
                >
                  <Ionicons name="arrow-undo" size={13} color={Colors.primary} />
                  <Text style={styles.undoBtnText}>Undo Ball</Text>
                </TouchableOpacity>

                <Text style={styles.overCountBadge}>
                  {balls} / {maxBallsPerOver} legal balls
                </Text>
              </View>
            </View>
            <View style={styles.ballTimeline}>
              {recentBalls.length === 0 ? (
                <Text style={styles.emptyTimelineText}>No deliveries recorded in this over yet</Text>
              ) : (
                recentBalls.map((b, i) => (
                  <View
                    key={i}
                    style={[
                      styles.ballCircle,
                      b.isWicket && styles.ballWicket,
                      b.isBoundary && styles.ballBoundary,
                      b.isExtra && styles.ballExtra,
                    ]}
                  >
                    <Text
                      style={[
                        styles.ballText,
                        (b.isWicket || b.isBoundary) && styles.ballTextInverse,
                      ]}
                    >
                      {b.text}
                    </Text>
                  </View>
                ))
              )}
            </View>
          </View>

          {/* Innings Complete Banner */}
          {isInningsComplete && (
            <View style={styles.inningsCompleteCard}>
              <View style={styles.inningsCompleteIconBg}>
                <Ionicons name="flag" size={20} color="#7C3AED" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inningsCompleteTitle}>
                  {inningsNumber === 1 ? '1st Innings Concluded' : 'Match Play Concluded'}
                </Text>
                <Text style={styles.inningsCompleteSub}>
                  {totalBallsBowled >= maxLegalBalls
                    ? `Tournament limit reached (${maxOvers}.0 overs)`
                    : `Team All Out (${wickets}/${maxWickets} wickets)`}
                </Text>
              </View>
              {inningsNumber < (isTestMatch ? 4 : 2) ? (
                <TouchableOpacity
                  style={styles.inningsActionBtn}
                  onPress={() => handleConcludeCurrentInnings()}
                >
                  <Text style={styles.inningsActionBtnText}>Next Innings →</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.inningsActionBtn}
                  onPress={() => setShowResultModal(true)}
                >
                  <Text style={styles.inningsActionBtnText}>Submit Result</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Live Scoring Keypad */}
          <Text style={styles.sectionTitle}>
            Record Ball Event {isInningsComplete ? '(Innings Ended)' : ''}
          </Text>

          {/* Runs Row (0, 1, 2, 3) */}
          <View style={styles.keypadRow}>
            <TouchableOpacity
              style={[styles.keyBtn, styles.dotBtn, isKeypadDisabled && styles.keyBtnDisabled]}
              disabled={isKeypadDisabled}
              onPress={() => recordBall(0)}
            >
              <Text style={styles.dotBtnText}>0 (DOT)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.keyBtn, isKeypadDisabled && styles.keyBtnDisabled]}
              disabled={isKeypadDisabled}
              onPress={() => recordBall(1)}
            >
              <Text style={styles.keyBtnText}>1</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.keyBtn, isKeypadDisabled && styles.keyBtnDisabled]}
              disabled={isKeypadDisabled}
              onPress={() => recordBall(2)}
            >
              <Text style={styles.keyBtnText}>2</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.keyBtn, isKeypadDisabled && styles.keyBtnDisabled]}
              disabled={isKeypadDisabled}
              onPress={() => recordBall(3)}
            >
              <Text style={styles.keyBtnText}>3</Text>
            </TouchableOpacity>
          </View>

          {/* Boundaries & Wicket (4, 6, Wicket) */}
          <View style={styles.keypadRow}>
            <TouchableOpacity
              style={[styles.keyBtn, styles.fourBtn, isKeypadDisabled && styles.keyBtnDisabled]}
              disabled={isKeypadDisabled}
              onPress={() => recordBall(4)}
            >
              <Text style={styles.boundaryText}>4 FOUR</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.keyBtn, styles.sixBtn, isKeypadDisabled && styles.keyBtnDisabled]}
              disabled={isKeypadDisabled}
              onPress={() => recordBall(6)}
            >
              <Text style={styles.boundaryText}>6 SIX</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.keyBtn, styles.wicketBtn, isKeypadDisabled && styles.keyBtnDisabled]}
              disabled={isKeypadDisabled}
              onPress={() => setShowWicketModal(true)}
            >
              <Text style={styles.wicketBtnText}>WICKET</Text>
            </TouchableOpacity>
          </View>

          {/* Extras Row (Wide, No-Ball, Bye, Leg-Bye, Penalty) */}
          <View style={styles.keypadRow}>
            <TouchableOpacity
              style={[styles.keyBtn, styles.extraBtn, isKeypadDisabled && styles.keyBtnDisabled]}
              disabled={isKeypadDisabled}
              onPress={() => recordBall(0, false, 'WIDE')}
            >
              <Text style={styles.extraBtnText}>Wide (+1)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.keyBtn, styles.extraBtn, isKeypadDisabled && styles.keyBtnDisabled]}
              disabled={isKeypadDisabled}
              onPress={() => recordBall(0, false, 'NO_BALL')}
            >
              <Text style={styles.extraBtnText}>No Ball (+1)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.keyBtn, styles.extraBtn, isKeypadDisabled && styles.keyBtnDisabled]}
              disabled={isKeypadDisabled}
              onPress={() => recordBall(1, false, 'BYE')}
            >
              <Text style={styles.extraBtnText}>Bye</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.keyBtn, styles.extraBtn, isKeypadDisabled && styles.keyBtnDisabled]}
              disabled={isKeypadDisabled}
              onPress={() => recordBall(1, false, 'LEG_BYE')}
            >
              <Text style={styles.extraBtnText}>Leg Bye</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.keyBtn, styles.penaltyBtn, isKeypadDisabled && styles.keyBtnDisabled]}
              disabled={isKeypadDisabled}
              onPress={() => recordBall(0, false, 'PENALTY')}
            >
              <Text style={styles.penaltyBtnText}>Penalty (+5)</Text>
            </TouchableOpacity>
          </View>

          {/* Match & Innings Progression Actions */}
          <View style={styles.progressionSection}>
            {/* Test match: Declare innings button */}
            {isTestMatch && (
              <Button
                title={`Declare Innings ${inningsNumber} Closed`}
                variant="outline"
                onPress={handleDeclareInnings}
                icon={<Ionicons name="flag-outline" size={18} color="#D97706" />}
                style={styles.declareBtn}
              />
            )}

            {/* Innings Progression */}
            {inningsNumber < (isTestMatch ? 4 : 2) && (
              <Button
                title={
                  inningsNumber === 1
                    ? 'Conclude Innings 1 → Start Innings 2'
                    : inningsNumber === 2
                    ? 'Conclude Innings 2 → Innings 3 / Follow-On'
                    : 'Conclude Innings 3 → Start Innings 4'
                }
                variant="outline"
                onPress={() => handleConcludeCurrentInnings()}
                icon={<Ionicons name="swap-horizontal" size={18} color={Colors.primary} />}
              />
            )}

            {/* Test match: Draw match option */}
            {isTestMatch && (
              <Button
                title="Conclude as Match Drawn"
                variant="outline"
                onPress={handleDeclareDraw}
                icon={<Ionicons name="remove-circle-outline" size={18} color={Colors.textSecondary} />}
              />
            )}

            <Button
              title="End Match & Submit Final Result"
              variant="primary"
              onPress={() => setShowResultModal(true)}
              icon={<Ionicons name="trophy-outline" size={18} color="#FFFFFF" />}
              style={styles.endMatchBtn}
            />
          </View>
        </ScrollView>
      </View>

      {/* 1. Openers Modal */}
      <OpenersModal
        visible={showOpenersModal}
        battingPlayers={battingPlayers}
        bowlingPlayers={bowlingPlayers}
        battingTeamName={battingTeamName}
        bowlingTeamName={bowlingTeamName}
        inningsNumber={inningsNumber}
        onConfirm={handleOpenersConfirmed}
      />

      {/* 2. Bowler Rotation Modal */}
      <NextBowlerModal
        visible={showNextBowlerModal}
        bowlingPlayers={bowlingPlayers}
        previousBowlerId={previousBowlerId}
        currentBowlerId={bowler?.id}
        overNumber={overs}
        maxOversPerBowler={tournamentRules.maxOversPerBowler ?? 2}
        bowlerStatsMap={bowlerStatsMap}
        title={balls > 0 ? 'Change Active Bowler' : `Over ${overs} Complete`}
        subtitle={
          balls > 0
            ? `Select replacement bowler for Over ${overs + 1} (Ball ${overs}.${balls})`
            : `Select the bowler for Over ${overs + 1}`
        }
        onClose={() => setShowNextBowlerModal(false)}
        onSelectBowler={handleNextBowlerSelected}
      />

      {/* 3. Wicket Modal */}
      {striker && nonStriker && (
        <WicketModal
          visible={showWicketModal}
          onClose={() => setShowWicketModal(false)}
          striker={striker}
          nonStriker={nonStriker}
          remainingBatters={remainingBatters}
          onConfirmWicket={(dismissalType, dismissedPlayerId, wicketExtraType, nextBatter) => {
            setShowWicketModal(false);
            recordBall(0, true, wicketExtraType, dismissalType, dismissedPlayerId, nextBatter);
          }}
        />
      )}

      {/* 4. DLS Rain Interruption Modal (Limited-Overs only) */}
      {!isTestMatch && (
        <DlsModal
          visible={showDlsModal}
          onClose={() => setShowDlsModal(false)}
          inningsNumber={inningsNumber}
          currentOvers={overs}
          currentBalls={balls}
          currentWickets={wickets}
          initialTotalOvers={tournamentRules.oversPerInnings ?? 20}
          onSubmitInterruption={handleDlsSubmit}
        />
      )}

      {/* 5. Follow-On Decision Modal (Test matches only) */}
      {showFollowOnModal && followOnData && (
        <FollowOnModal
          visible={showFollowOnModal}
          onClose={() => setShowFollowOnModal(false)}
          teamAName={teamAName}
          teamBName={teamBName}
          teamARuns={followOnData.lead >= 0 ? runs + followOnData.lead : runs}
          teamBRuns={runs}
          lead={followOnData.lead}
          threshold={followOnData.threshold}
          onDecide={handleFollowOnDecision}
        />
      )}

      {/* 4. Match Result Modal */}
      <ResultModal
        visible={showResultModal}
        onClose={() => setShowResultModal(false)}
        matchId={id!}
        teamA={squads?.teamA}
        teamB={squads?.teamB}
        defaultSummary={`${battingTeamName}: ${runs}/${wickets} in ${overs}.${balls} overs`}
        onResultSuccess={() => {
          setShowResultModal(false);
          Alert.alert('Match Concluded', 'Result successfully recorded!', [
            { text: 'View Scorecard', onPress: () => router.replace(`/scorecard/${id}` as any) },
          ]);
        }}
      />

      {/* 5. Toss Modal fallback (if toss needed) */}
      {squads && (
        <TossModal
          visible={showTossModal}
          onClose={() => setShowTossModal(false)}
          matchId={id!}
          teamA={squads.teamA}
          teamB={squads.teamB}
          initialToss={squads.toss}
          onTossSuccess={handleTossRecorded}
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
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontFamily: Fonts.medium,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  draftContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  draftIconBg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  draftTitle: {
    fontFamily: Fonts.bold,
    fontSize: 18,
    color: Colors.text,
  },
  draftDesc: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 36,
  },
  scoreHeaderCard: {
    backgroundColor: '#1E1B4B',
    borderRadius: Radii.xl,
    padding: 20,
    marginBottom: 16,
    shadowColor: Colors.shadowPurple,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
    elevation: 4,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 8,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radii.sm,
    gap: 6,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EF4444',
  },
  liveText: {
    fontFamily: Fonts.extraBold,
    fontSize: 10,
    color: '#F87171',
    letterSpacing: 0.5,
  },
  inningsText: {
    fontFamily: Fonts.medium,
    fontSize: 12,
    color: '#C7D2FE',
    flexShrink: 1,
    textAlign: 'right',
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 18,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(199, 210, 254, 0.15)',
  },
  scoreLeftCol: {
    flex: 1,
  },
  teamTitle: {
    fontFamily: Fonts.bold,
    fontSize: 16,
    color: '#FFFFFF',
  },
  vsSubtitle: {
    fontFamily: Fonts.medium,
    fontSize: 11,
    color: '#A5B4FC',
    marginBottom: 6,
  },
  bigScoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  runsText: {
    fontFamily: Fonts.extraBold,
    fontSize: 44,
    color: '#FFFFFF',
  },
  slashText: {
    fontFamily: Fonts.regular,
    fontSize: 32,
    color: '#818CF8',
    marginHorizontal: 4,
  },
  wicketsText: {
    fontFamily: Fonts.extraBold,
    fontSize: 40,
    color: '#F87171',
  },
  oversCol: {
    alignItems: 'flex-end',
  },
  oversText: {
    fontFamily: Fonts.bold,
    fontSize: 22,
    color: '#FFFFFF',
  },
  oversUnit: {
    fontFamily: Fonts.semiBold,
    fontSize: 12,
    color: '#A5B4FC',
  },
  crrText: {
    fontFamily: Fonts.semiBold,
    fontSize: 12,
    color: '#A7F3D0',
    marginTop: 3,
  },
  venueSubText: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
    maxWidth: 140,
    textAlign: 'right',
  },
  playersStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  batsmenCol: {
    flex: 1,
  },
  bowlerCol: {
    flex: 1,
    alignItems: 'flex-end',
  },
  bowlerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  changeBowlerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radii.sm,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
  changeBowlerText: {
    fontFamily: Fonts.medium,
    fontSize: 9,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  playerRole: {
    fontFamily: Fonts.bold,
    fontSize: 10,
    color: '#A5B4FC',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  playerName: {
    fontFamily: Fonts.semiBold,
    fontSize: 13,
    color: '#FFFFFF',
  },
  playerStat: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: '#C7D2FE',
  },
  playerUnset: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  missingOpenersPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F5F3FF',
    borderWidth: 1,
    borderColor: '#DDD6FE',
    borderRadius: Radii.lg,
    padding: 12,
    marginBottom: 16,
  },
  missingOpenersText: {
    fontFamily: Fonts.medium,
    fontSize: 12,
    color: Colors.primary,
    flex: 1,
  },
  recentSection: {
    marginBottom: 20,
  },
  timelineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: {
    fontFamily: Fonts.bold,
    fontSize: 16,
    color: Colors.text,
    letterSpacing: -0.2,
  },
  overCountBadge: {
    fontFamily: Fonts.medium,
    fontSize: 11,
    color: Colors.textSecondary,
  },
  ballTimeline: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.shadowPurple,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  emptyTimelineText: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: Colors.textMuted,
    paddingVertical: 6,
  },
  ballCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F5F3FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  ballWicket: {
    backgroundColor: Colors.danger,
    borderColor: Colors.danger,
  },
  ballBoundary: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  ballExtra: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
  },
  ballText: {
    fontFamily: Fonts.bold,
    fontSize: 13,
    color: Colors.text,
  },
  ballTextInverse: {
    color: '#FFFFFF',
  },
  keypadRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  keyBtn: {
    flex: 1,
    height: 52,
    borderRadius: Radii.lg,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.shadowPurple,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  keyBtnText: {
    fontFamily: Fonts.bold,
    fontSize: 18,
    color: Colors.text,
  },
  dotBtn: {
    backgroundColor: '#F5F3FF',
  },
  dotBtnText: {
    fontFamily: Fonts.bold,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  fourBtn: {
    backgroundColor: '#EDE9FE',
    borderColor: '#C4B5FD',
  },
  sixBtn: {
    backgroundColor: '#EDE9FE',
    borderColor: Colors.primary,
  },
  boundaryText: {
    fontFamily: Fonts.extraBold,
    fontSize: 13,
    color: Colors.primary,
  },
  wicketBtn: {
    backgroundColor: '#FEE2E2',
    borderColor: Colors.danger,
  },
  wicketBtnText: {
    fontFamily: Fonts.extraBold,
    fontSize: 13,
    color: Colors.danger,
  },
  extraBtn: {
    backgroundColor: '#FFFFFF',
  },
  extraBtnText: {
    fontFamily: Fonts.semiBold,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  progressionSection: {
    marginTop: 20,
    gap: 12,
  },
  endMatchBtn: {
    backgroundColor: Colors.primary,
  },
  keyBtnDisabled: {
    opacity: 0.45,
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB',
  },
  inningsCompleteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F5F3FF',
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: Radii.lg,
    padding: 14,
    marginBottom: 16,
  },
  inningsCompleteIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inningsCompleteTitle: {
    fontFamily: Fonts.bold,
    fontSize: 14,
    color: Colors.text,
  },
  inningsCompleteSub: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  inningsActionBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radii.md,
  },
  inningsActionBtnText: {
    fontFamily: Fonts.semiBold,
    fontSize: 12,
    color: '#FFFFFF',
  },
  dlsHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radii.sm,
  },
  dlsHeaderBtnText: {
    fontFamily: Fonts.bold,
    fontSize: 11,
    color: '#92400E',
  },
  dlsHeaderPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(254, 243, 199, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(253, 230, 138, 0.4)',
    borderRadius: Radii.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  dlsHeaderPillText: {
    fontFamily: Fonts.medium,
    fontSize: 10,
    color: '#FDE68A',
  },
  followOnPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(124, 58, 237, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(196, 181, 253, 0.5)',
    borderRadius: Radii.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  followOnPillText: {
    fontFamily: Fonts.medium,
    fontSize: 10,
    color: '#DDD6FE',
  },
  timelineActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  undoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#F5F3FF',
    borderWidth: 1,
    borderColor: '#DDD6FE',
    borderRadius: Radii.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  undoBtnDisabled: {
    opacity: 0.4,
  },
  undoBtnText: {
    fontFamily: Fonts.medium,
    fontSize: 10,
    color: Colors.primary,
  },
  penaltyBtn: {
    backgroundColor: '#FFFBEB',
    borderColor: '#F59E0B',
  },
  penaltyBtnText: {
    fontFamily: Fonts.bold,
    fontSize: 11,
    color: '#B45309',
  },
  declareBtn: {
    borderColor: '#D97706',
  },
});
