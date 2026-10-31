import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { officialsApi } from '@/api/officials.api';
import { OfficialTournament } from '@/types/api';
import { Badge } from '@/components/ui/Badge';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Colors, Radii, Fonts } from '@/theme/tokens';

export default function TournamentsScreen() {
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, 24);

  const [tournaments, setTournaments] = useState<OfficialTournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTournaments = async () => {
    try {
      const res = await officialsApi.getTournaments();
      if (res?.data && Array.isArray(res.data)) {
        setTournaments(res.data);
      } else {
        setTournaments([]);
      }
    } catch {
      setTournaments([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTournaments();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTournaments();
  };

  return (
    <GradientBackground style={styles.container}>
      <View style={[styles.innerContainer, { paddingTop: topInset }]}>
        <View style={styles.header}>
          <Text style={styles.title}>My Tournaments</Text>
          <Text style={styles.subtitle}>Officiating assignments & confirmed leagues</Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {loading ? (
            <ActivityIndicator size="large" color={Colors.primary} style={styles.loader} />
          ) : tournaments.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="trophy-outline" size={32} color={Colors.primary} />
              </View>
              <Text style={styles.emptyTitle}>No Tournaments Yet</Text>
              <Text style={styles.emptySubtext}>
                Tournaments where you have accepted officiating invitations will appear here.
              </Text>
            </View>
          ) : (
            tournaments.map((t) => (
              <View key={t.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={styles.logoBadge}>
                    <Ionicons name="trophy" size={20} color="#7C3AED" />
                  </View>
                  <View style={styles.topInfo}>
                    <Text style={styles.tourneyName}>{t.name}</Text>
                    {t.organizer?.name && (
                      <Text style={styles.organizerName}>Organized by {t.organizer.name}</Text>
                    )}
                  </View>
                  <Badge label={t.status || 'CONFIRMED'} variant="upcoming" />
                </View>

                <View style={styles.detailsRow}>
                  {t.startDate && (
                    <View style={styles.detailItem}>
                      <Ionicons name="calendar-outline" size={14} color={Colors.textSecondary} />
                      <Text style={styles.detailText}>
                        {t.startDate} {t.endDate ? `– ${t.endDate}` : ''}
                      </Text>
                    </View>
                  )}
                  {(t.venue || t.location) && (
                    <View style={styles.detailItem}>
                      <Ionicons name="location-outline" size={14} color={Colors.textSecondary} />
                      <Text style={styles.detailText}>{t.venue || t.location}</Text>
                    </View>
                  )}
                </View>
              </View>
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
    paddingBottom: 16,
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
    fontSize: 16,
    color: Colors.text,
  },
  organizerName: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  detailsRow: {
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F5F3FF',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontFamily: Fonts.medium,
    fontSize: 13,
    color: Colors.textSecondary,
  },
});
