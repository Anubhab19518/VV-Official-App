import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { officialsApi } from '@/api/officials.api';
import { TournamentInvitation } from '@/types/api';
import { Colors, Radii, Fonts } from '@/theme/tokens';

export default function InvitationsScreen() {
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, 16);

  const [invitations, setInvitations] = useState<TournamentInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchInvitations = async () => {
    try {
      const res = await officialsApi.getInvitations();
      if (res?.data && Array.isArray(res.data)) {
        setInvitations(res.data);
      } else {
        setInvitations([]);
      }
    } catch {
      setInvitations([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchInvitations();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchInvitations();
  };

  const handleRespond = async (id: string, status: 'ACCEPTED' | 'REJECTED') => {
    setActionLoadingId(id);
    try {
      await officialsApi.respondInvitation(id, status);
      setInvitations((prev) =>
        prev.map((inv) => (inv.id === id ? { ...inv, status } : inv))
      );
      Alert.alert(
        status === 'ACCEPTED' ? 'Invitation Accepted' : 'Invitation Rejected',
        `You have ${status.toLowerCase()} the tournament invitation.`
      );
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to update invitation');
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <GradientBackground style={styles.container}>
      <View style={[styles.innerContainer, { paddingTop: topInset }]}>
        <ScreenHeader title="Tournament Invitations" showBack={true} />

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {loading ? (
            <ActivityIndicator size="large" color={Colors.primary} style={styles.loader} />
          ) : invitations.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="mail-open-outline" size={36} color={Colors.primary} />
              </View>
              <Text style={styles.emptyTitle}>No Invitations</Text>
              <Text style={styles.emptySubtext}>
                When tournament organizers invite you to officiate, they will appear here.
              </Text>
            </View>
          ) : (
            invitations.map((inv) => {
              const isPending = inv.status === 'PENDING';

              return (
                <View key={inv.id} style={styles.card}>
                  <View style={styles.cardTop}>
                    <View style={styles.logoBadge}>
                      <Ionicons name="trophy" size={20} color="#7C3AED" />
                    </View>
                    <View style={styles.topInfo}>
                      <Text style={styles.tourneyName}>
                        {inv.tournament?.name || 'Tournament Invitation'}
                      </Text>
                      {inv.tournament?.organizer?.name && (
                        <Text style={styles.organizerName}>
                          By {inv.tournament.organizer.name}
                        </Text>
                      )}
                    </View>
                    <Badge
                      label={inv.status}
                      variant={
                        inv.status === 'ACCEPTED'
                          ? 'verified'
                          : inv.status === 'REJECTED'
                          ? 'rejected'
                          : 'pending'
                      }
                    />
                  </View>

                  <View style={styles.detailsRow}>
                    {inv.tournament?.startDate && (
                      <View style={styles.detailItem}>
                        <Ionicons name="calendar-outline" size={14} color={Colors.textSecondary} />
                        <Text style={styles.detailText}>
                          {inv.tournament.startDate} {inv.tournament.endDate ? `– ${inv.tournament.endDate}` : ''}
                        </Text>
                      </View>
                    )}
                    {(inv.tournament?.venue || (inv.tournament as any)?.location) && (
                      <View style={styles.detailItem}>
                        <Ionicons name="location-outline" size={14} color={Colors.textSecondary} />
                        <Text style={styles.detailText}>
                          {inv.tournament?.venue || (inv.tournament as any)?.location}
                        </Text>
                      </View>
                    )}
                    <View style={styles.detailItem}>
                      <Ionicons name="person-outline" size={14} color={Colors.primary} />
                      <Text style={styles.detailText}>
                        Assigned Role: {inv.role || 'Match Official / Umpire'}
                      </Text>
                    </View>
                  </View>

                  {isPending && (
                    <View style={styles.actionsRow}>
                      <Button
                        title="Reject"
                        variant="dangerOutline"
                        size="md"
                        loading={actionLoadingId === inv.id}
                        onPress={() => handleRespond(inv.id, 'REJECTED')}
                        style={styles.actionBtn}
                      />
                      <Button
                        title="Accept"
                        variant="primary"
                        size="md"
                        loading={actionLoadingId === inv.id}
                        onPress={() => handleRespond(inv.id, 'ACCEPTED')}
                        style={styles.actionBtn}
                      />
                    </View>
                  )}
                </View>
              );
            })
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
  loader: {
    marginTop: 40,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 8,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
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
    marginBottom: 12,
    shadowColor: Colors.shadowPurple,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  logoBadge: {
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
  topInfo: {
    flex: 1,
  },
  tourneyName: {
    fontFamily: Fonts.bold,
    fontSize: 15,
    color: Colors.text,
  },
  organizerName: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  detailsRow: {
    gap: 6,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F3FF',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontFamily: Fonts.medium,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
  },
  actionBtn: {
    flex: 1,
  },
});
