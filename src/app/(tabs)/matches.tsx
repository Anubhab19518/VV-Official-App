import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { officialsApi } from '@/api/officials.api';
import { OfficialMatch } from '@/types/api';
import { Badge } from '@/components/ui/Badge';
import { GradientBackground } from '@/components/ui/GradientBackground';
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
} from '@/utils/match-helpers';

export default function MatchesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<'UPCOMING' | 'LIVE' | 'COMPLETED'>('UPCOMING');
  const [matches, setMatches] = useState<OfficialMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMatches = async () => {
    try {
      const res = await officialsApi.getAssignedMatches();
      if (res?.data && Array.isArray(res.data)) {
        setMatches(res.data);
      } else {
        setMatches([]);
      }
    } catch {
      setMatches([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMatches();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchMatches();
  };

  const filteredMatches = matches.filter((m) => {
    if (tab === 'UPCOMING') return m.status === 'SCHEDULED' || !m.status;
    if (tab === 'LIVE') return m.status === 'LIVE';
    if (tab === 'COMPLETED') return m.status === 'COMPLETED';
    return true;
  });

  const topInset = Math.max(insets.top, 24);

  return (
    <GradientBackground style={styles.container}>
      <View style={[styles.innerContainer, { paddingTop: topInset }]}>
        <View style={styles.header}>
          <Text style={styles.title}>My Matches</Text>
          <Text style={styles.subtitle}>Officiating assignments & live fixtures</Text>
        </View>

        {/* Tabs */}
        <View style={styles.tabContainer}>
          {(['UPCOMING', 'LIVE', 'COMPLETED'] as const).map((t) => (
            <TouchableOpacity
              key={t}
              onPress={() => setTab(t)}
              style={[styles.tabBtn, tab === t && styles.tabBtnActive]}
            >
              <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                {t.charAt(0) + t.slice(1).toLowerCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {loading ? (
            <ActivityIndicator size="large" color={Colors.primary} style={styles.loader} />
          ) : filteredMatches.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconBg}>
                <Ionicons name="calendar-outline" size={32} color={Colors.primary} />
              </View>
              <Text style={styles.emptyTitle}>No {tab.toLowerCase()} matches found</Text>
              <Text style={styles.emptySubtext}>
                Matches assigned to you by tournament organizers will show up here.
              </Text>
            </View>
          ) : (
            filteredMatches.map((match) => (
              <TouchableOpacity
                key={match.id}
                activeOpacity={0.8}
                onPress={() => router.push(`/matches/${match.id}` as any)}
                style={styles.card}
              >
                <View style={styles.cardTop}>
                  <View style={styles.tournamentPill}>
                    <Ionicons name="trophy" size={12} color="#7C3AED" />
                    <Text style={styles.tournamentName} numberOfLines={1}>
                      {getTournamentName(match)}
                    </Text>
                  </View>
                  <View style={styles.badgeRow}>
                    <View style={styles.rolePill}>
                      <Text style={styles.rolePillText}>{getUmpireRole(match)}</Text>
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
                </View>

                <View style={styles.matchTeamsRow}>
                  <View style={styles.teamCol}>
                    <View style={styles.teamBadgeWrapper}>
                      <View style={styles.teamShortBadgeBg}>
                        <Text style={styles.teamShortBadgeText}>{getTeamAShort(match)}</Text>
                      </View>
                      <Text style={styles.teamName} numberOfLines={1}>
                        {getTeamAName(match)}
                      </Text>
                    </View>
                    {match.score?.runsA !== undefined && (
                      <Text style={styles.scoreText}>
                        {match.score.runsA}/{match.score.wicketsA} ({match.score.oversA} ov)
                      </Text>
                    )}
                  </View>

                  <View style={styles.vsBadge}>
                    <Text style={styles.vs}>VS</Text>
                  </View>

                  <View style={[styles.teamCol, styles.teamColRight]}>
                    <View style={[styles.teamBadgeWrapper, styles.teamBadgeWrapperRight]}>
                      <Text style={[styles.teamName, styles.teamNameRight]} numberOfLines={1}>
                        {getTeamBName(match)}
                      </Text>
                      <View style={[styles.teamShortBadgeBg, styles.teamShortBadgeBgAlt]}>
                        <Text style={[styles.teamShortBadgeText, styles.teamShortBadgeTextAlt]}>
                          {getTeamBShort(match)}
                        </Text>
                      </View>
                    </View>
                    {match.score?.runsB !== undefined && (
                      <Text style={[styles.scoreText, styles.scoreTextRight]}>
                        {match.score.runsB}/{match.score.wicketsB} ({match.score.oversB} ov)
                      </Text>
                    )}
                  </View>
                </View>

                <View style={styles.cardFooter}>
                  <View style={styles.footerInfo}>
                    <Ionicons name="calendar-outline" size={13} color={Colors.textSecondary} />
                    <Text style={styles.footerText}>{getFormattedSchedule(match)}</Text>
                  </View>
                  <View style={styles.footerInfo}>
                    <Ionicons name="location-outline" size={13} color={Colors.textSecondary} />
                    <Text style={styles.footerText} numberOfLines={1}>
                      {getVenueText(match)}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
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
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
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
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 10,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: Radii.lg,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    shadowColor: Colors.shadowPurple,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  tabBtnActive: {
    backgroundColor: '#F5F3FF',
    borderColor: Colors.primary,
    borderWidth: 1.5,
  },
  tabText: {
    fontFamily: Fonts.medium,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  tabTextActive: {
    fontFamily: Fonts.bold,
    color: Colors.primary,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 36,
  },
  loader: {
    marginTop: 40,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 8,
  },
  emptyIconBg: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F5F3FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontFamily: Fonts.semiBold,
    fontSize: 16,
    color: Colors.text,
  },
  emptySubtext: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 32,
    lineHeight: 18,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radii.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 14,
    shadowColor: Colors.shadowPurple,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    gap: 8,
  },
  tournamentPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F5F3FF',
    paddingHorizontal: 9,
    paddingVertical: 3,
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
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rolePill: {
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: Radii.sm,
    borderWidth: 1,
    borderColor: '#C4B5FD',
  },
  rolePillText: {
    fontFamily: Fonts.semiBold,
    fontSize: 10,
    color: Colors.primary,
  },
  matchTeamsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    marginBottom: 14,
  },
  teamCol: {
    flex: 1,
  },
  teamColRight: {
    alignItems: 'flex-end',
  },
  teamBadgeWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  teamBadgeWrapperRight: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  teamShortBadgeBg: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F5F3FF',
    borderWidth: 1.5,
    borderColor: '#DDD6FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamShortBadgeBgAlt: {
    backgroundColor: '#FAF5FF',
    borderColor: '#E9D5FF',
  },
  teamShortBadgeText: {
    fontFamily: Fonts.bold,
    fontSize: 12,
    color: '#6D28D9',
  },
  teamShortBadgeTextAlt: {
    color: '#7C3AED',
  },
  teamName: {
    fontFamily: Fonts.bold,
    fontSize: 13,
    color: Colors.text,
    flexShrink: 1,
  },
  teamNameRight: {
    textAlign: 'right',
  },
  scoreText: {
    fontFamily: Fonts.semiBold,
    fontSize: 12,
    color: Colors.primary,
    marginTop: 4,
  },
  scoreTextRight: {
    textAlign: 'right',
  },
  vsBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8,
  },
  vs: {
    fontFamily: Fonts.bold,
    fontSize: 10,
    color: Colors.primary,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F5F3FF',
    gap: 8,
  },
  footerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 1,
  },
  footerText: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: Colors.textSecondary,
  },
});
