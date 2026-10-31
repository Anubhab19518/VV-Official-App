import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/auth-context';
import { officialsApi } from '@/api/officials.api';
import { OfficialMatch, TournamentInvitation } from '@/types/api';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
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

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { officialDisplayName, refreshProfile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [nextMatch, setNextMatch] = useState<OfficialMatch | null>(null);
  const [matchesCount, setMatchesCount] = useState(0);
  const [tournamentsCount, setTournamentsCount] = useState(0);
  const [invitations, setInvitations] = useState<TournamentInvitation[]>([]);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const loadDashboardData = useCallback(async () => {
    try {
      const [matchesRes, tourneysRes, invitesRes] = await Promise.allSettled([
        officialsApi.getAssignedMatches(),
        officialsApi.getTournaments(),
        officialsApi.getInvitations('PENDING'),
      ]);

      if (matchesRes.status === 'fulfilled' && matchesRes.value?.data) {
        const matches = Array.isArray(matchesRes.value.data) ? matchesRes.value.data : [];
        setMatchesCount(matches.length);
        if (matches.length > 0) {
          setNextMatch(matches[0]);
        } else {
          setNextMatch(null);
        }
      }

      if (tourneysRes.status === 'fulfilled' && tourneysRes.value?.data) {
        const tourneys = Array.isArray(tourneysRes.value.data) ? tourneysRes.value.data : [];
        setTournamentsCount(tourneys.length);
      }

      if (invitesRes.status === 'fulfilled' && invitesRes.value?.data) {
        const invs = Array.isArray(invitesRes.value.data) ? invitesRes.value.data : [];
        setInvitations(invs);
      }
    } catch (e) {
      console.warn('Dashboard load error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const onRefresh = () => {
    setRefreshing(true);
    refreshProfile().catch(() => {});
    loadDashboardData();
  };

  const handleRespondInvitation = async (id: string, status: 'ACCEPTED' | 'REJECTED') => {
    setActionLoadingId(id);
    try {
      await officialsApi.respondInvitation(id, status);
      setInvitations((prev) => prev.filter((inv) => inv.id !== id));
      loadDashboardData();
      Alert.alert(
        status === 'ACCEPTED' ? 'Invitation Accepted' : 'Invitation Rejected',
        `Tournament invitation has been ${status.toLowerCase()}.`
      );
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Could not update invitation');
    } finally {
      setActionLoadingId(null);
    }
  };

  const pendingCount = invitations.length;
  const topInset = Math.max(insets.top, 24);

  return (
    <GradientBackground style={styles.container}>
      <View style={[styles.innerContainer, { paddingTop: topInset }]}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.avatar}>
                <Ionicons name="person" size={24} color="#7C3AED" />
              </View>
              <View>
                <Text style={styles.greeting}>Hello, {officialDisplayName}</Text>
                <Text style={styles.roleSubtext}>Certified Match Official • Cricket</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.bellButton}
              onPress={() => router.push('/invitations')}
              activeOpacity={0.7}
            >
              <Ionicons name="notifications-outline" size={22} color={Colors.text} />
              {pendingCount > 0 && (
                <View style={styles.bellBadge}>
                  <Text style={styles.bellBadgeText}>{pendingCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.primary} />
            </View>
          ) : (
            <>
              {/* Next Match Card */}
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Next Match</Text>
                <TouchableOpacity onPress={() => router.push('/(tabs)/matches')}>
                  <Text style={styles.viewAllText}>View All</Text>
                </TouchableOpacity>
              </View>

              {nextMatch ? (
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() => router.push(`/matches/${nextMatch.id}` as any)}
                  style={styles.nextMatchCard}
                >
                  <View style={styles.matchCardTop}>
                    <View style={styles.tournamentPill}>
                      <Ionicons name="trophy" size={13} color="#7C3AED" />
                      <Text style={styles.tournamentPillText} numberOfLines={1}>
                        {getTournamentName(nextMatch)}
                      </Text>
                    </View>
                    <View style={styles.statusPillsRow}>
                      <View style={styles.rolePill}>
                        <Text style={styles.rolePillText}>{getUmpireRole(nextMatch)}</Text>
                      </View>
                      <Badge label={nextMatch.status || 'SCHEDULED'} variant="upcoming" />
                    </View>
                  </View>

                  <View style={styles.teamsRow}>
                    <View style={styles.teamColumn}>
                      <View style={styles.teamLogoBg}>
                        <Text style={styles.teamShortBadge}>{getTeamAShort(nextMatch)}</Text>
                      </View>
                      <Text style={styles.teamName} numberOfLines={1}>
                        {getTeamAName(nextMatch)}
                      </Text>
                    </View>

                    <View style={styles.vsBadge}>
                      <Text style={styles.vsText}>VS</Text>
                    </View>

                    <View style={styles.teamColumn}>
                      <View style={[styles.teamLogoBg, styles.teamLogoBgAlt]}>
                        <Text style={[styles.teamShortBadge, styles.teamShortBadgeAlt]}>
                          {getTeamBShort(nextMatch)}
                        </Text>
                      </View>
                      <Text style={styles.teamName} numberOfLines={1}>
                        {getTeamBName(nextMatch)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.metaRow}>
                    <View style={styles.metaItem}>
                      <Ionicons name="calendar-outline" size={14} color={Colors.textSecondary} />
                      <Text style={styles.metaText}>{getFormattedSchedule(nextMatch)}</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Ionicons name="location-outline" size={14} color={Colors.textSecondary} />
                      <Text style={styles.metaText} numberOfLines={1}>
                        {getVenueText(nextMatch)}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ) : (
                <View style={styles.emptyCard}>
                  <View style={styles.emptyIconBg}>
                    <Ionicons name="calendar-outline" size={26} color={Colors.primary} />
                  </View>
                  <Text style={styles.emptyCardTitle}>No Upcoming Match</Text>
                  <Text style={styles.emptyCardSubtext}>
                    Assigned matches from organizers will appear here.
                  </Text>
                </View>
              )}

              {/* Quick Stat Action Cards */}
              <View style={styles.statsRow}>
                {/* Invitations */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => router.push('/invitations')}
                  style={styles.statCard}
                >
                  <View style={styles.statIconContainer}>
                    <Ionicons name="mail-outline" size={22} color={Colors.primary} />
                    {pendingCount > 0 && (
                      <View style={styles.statBadge}>
                        <Text style={styles.statBadgeText}>{pendingCount}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.statLabel}>Invitations</Text>
                </TouchableOpacity>

                {/* My Matches */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => router.push('/(tabs)/matches')}
                  style={styles.statCard}
                >
                  <Text style={styles.statNumber}>{matchesCount}</Text>
                  <Text style={styles.statLabel}>My Matches</Text>
                </TouchableOpacity>

                {/* My Tournaments */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => router.push('/(tabs)/tournaments')}
                  style={styles.statCard}
                >
                  <Text style={styles.statNumber}>{tournamentsCount}</Text>
                  <Text style={styles.statLabel}>Tournaments</Text>
                </TouchableOpacity>
              </View>

              {/* Recent Invitations */}
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Recent Invitations</Text>
                <TouchableOpacity onPress={() => router.push('/invitations')}>
                  <Text style={styles.viewAllText}>View All</Text>
                </TouchableOpacity>
              </View>

              {invitations.length === 0 ? (
                <View style={styles.emptyCard}>
                  <View style={styles.emptyIconBg}>
                    <Ionicons name="mail-open-outline" size={26} color={Colors.primary} />
                  </View>
                  <Text style={styles.emptyCardTitle}>No Pending Invitations</Text>
                  <Text style={styles.emptyCardSubtext}>
                    When tournament organizers invite you to officiate, they will appear here.
                  </Text>
                </View>
              ) : (
                invitations.slice(0, 3).map((inv) => (
                  <View key={inv.id} style={styles.invitationCard}>
                    <View style={styles.invitationTop}>
                      <View style={styles.invitationLogoBg}>
                        <Ionicons name="trophy" size={20} color="#7C3AED" />
                      </View>
                      <View style={styles.invitationInfo}>
                        <Text style={styles.invitationTitle}>
                          {inv.tournament?.name || 'Tournament Invitation'}
                        </Text>
                        {inv.tournament?.organizer?.name && (
                          <Text style={styles.invitationOrganizer}>
                            By {inv.tournament.organizer.name}
                          </Text>
                        )}
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
                    </View>

                    <View style={styles.invitationDetails}>
                      {inv.tournament?.startDate && (
                        <View style={styles.detailRow}>
                          <Ionicons name="calendar-outline" size={14} color={Colors.textSecondary} />
                          <Text style={styles.detailText}>
                            {inv.tournament.startDate}{' '}
                            {inv.tournament.endDate ? `– ${inv.tournament.endDate}` : ''}
                          </Text>
                        </View>
                      )}
                      {(inv.tournament?.venue || (inv.tournament as any)?.location) && (
                        <View style={styles.detailRow}>
                          <Ionicons name="location-outline" size={14} color={Colors.textSecondary} />
                          <Text style={styles.detailText}>
                            {inv.tournament?.venue || (inv.tournament as any)?.location}
                          </Text>
                        </View>
                      )}
                      <View style={styles.detailRow}>
                        <Ionicons name="person-outline" size={14} color={Colors.primary} />
                        <Text style={styles.detailText}>
                          Role: {inv.role || 'Match Official / Umpire'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.invitationActions}>
                      <Button
                        title="Reject"
                        variant="dangerOutline"
                        size="md"
                        loading={actionLoadingId === inv.id}
                        onPress={() => handleRespondInvitation(inv.id, 'REJECTED')}
                        style={styles.rejectBtn}
                      />
                      <Button
                        title="Accept"
                        variant="primary"
                        size="md"
                        loading={actionLoadingId === inv.id}
                        onPress={() => handleRespondInvitation(inv.id, 'ACCEPTED')}
                        style={styles.acceptBtn}
                      />
                    </View>
                  </View>
                ))
              )}
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
    paddingTop: 12,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EDE9FE',
    borderWidth: 1.5,
    borderColor: '#DDD6FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  greeting: {
    fontFamily: Fonts.bold,
    fontSize: 18,
    color: Colors.text,
    letterSpacing: -0.3,
  },
  roleSubtext: {
    fontFamily: Fonts.medium,
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  bellButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    shadowColor: Colors.shadowPurple,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  bellBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#EF4444',
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellBadgeText: {
    fontFamily: Fonts.bold,
    fontSize: 10,
    color: '#FFFFFF',
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: Fonts.bold,
    fontSize: 17,
    color: Colors.text,
    letterSpacing: -0.2,
  },
  viewAllText: {
    fontFamily: Fonts.semiBold,
    fontSize: 13,
    color: Colors.primary,
  },
  nextMatchCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radii.xl,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 20,
    shadowColor: Colors.shadowPurple,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
  },
  matchCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
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
  tournamentPillText: {
    fontFamily: Fonts.semiBold,
    fontSize: 11,
    color: Colors.textPurple,
  },
  statusPillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rolePill: {
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radii.sm,
    borderWidth: 1,
    borderColor: '#C4B5FD',
  },
  rolePillText: {
    fontFamily: Fonts.semiBold,
    fontSize: 10,
    color: Colors.primary,
    letterSpacing: 0.3,
  },
  teamsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: 18,
    paddingVertical: 6,
  },
  teamColumn: {
    alignItems: 'center',
    flex: 1,
  },
  teamLogoBg: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#F5F3FF',
    borderWidth: 1.5,
    borderColor: '#DDD6FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  teamLogoBgAlt: {
    backgroundColor: '#FAF5FF',
    borderColor: '#E9D5FF',
  },
  teamShortBadge: {
    fontFamily: Fonts.bold,
    fontSize: 15,
    color: '#6D28D9',
  },
  teamShortBadgeAlt: {
    color: '#7C3AED',
  },
  teamName: {
    fontFamily: Fonts.bold,
    fontSize: 13,
    color: Colors.text,
    textAlign: 'center',
  },
  vsBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8,
  },
  vsText: {
    fontFamily: Fonts.bold,
    fontSize: 11,
    color: Colors.primary,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F5F3FF',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  metaText: {
    fontFamily: Fonts.medium,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: Radii.xl,
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.shadowPurple,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  statIconContainer: {
    position: 'relative',
    marginBottom: 6,
  },
  statBadge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: '#EF4444',
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statBadgeText: {
    fontFamily: Fonts.bold,
    fontSize: 9,
    color: '#FFFFFF',
  },
  statNumber: {
    fontFamily: Fonts.bold,
    fontSize: 22,
    color: Colors.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontFamily: Fonts.medium,
    fontSize: 11,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  invitationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radii.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 12,
    shadowColor: Colors.shadowPurple,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  invitationTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  invitationLogoBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F5F3FF',
    borderWidth: 1,
    borderColor: '#DDD6FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  invitationInfo: {
    flex: 1,
  },
  invitationTitle: {
    fontFamily: Fonts.bold,
    fontSize: 15,
    color: Colors.text,
  },
  invitationOrganizer: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  invitationDetails: {
    gap: 6,
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F3FF',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  invitationActions: {
    flexDirection: 'row',
    gap: 12,
  },
  rejectBtn: {
    flex: 1,
  },
  acceptBtn: {
    flex: 1,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radii.xl,
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    gap: 6,
    shadowColor: Colors.shadowPurple,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  emptyIconBg: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#F5F3FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyCardTitle: {
    fontFamily: Fonts.semiBold,
    fontSize: 15,
    color: Colors.text,
  },
  emptyCardSubtext: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
});
