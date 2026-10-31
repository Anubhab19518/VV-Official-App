import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { matchesApi } from '@/api/matches.api';
import { Colors, Fonts, Radii } from '@/theme/tokens';

interface ResultModalProps {
  visible: boolean;
  onClose: () => void;
  matchId: string;
  teamA?: { id: string; name: string };
  teamB?: { id: string; name: string };
  defaultSummary?: string;
  onResultSuccess: () => void;
}

export function ResultModal({
  visible,
  onClose,
  matchId,
  teamA,
  teamB,
  defaultSummary = '',
  onResultSuccess,
}: ResultModalProps) {
  const [winnerTeamId, setWinnerTeamId] = useState<string | null>(null);
  const [summary, setSummary] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      setSummary(defaultSummary);
      setWinnerTeamId(teamA?.id || null);
    }
  }, [visible, defaultSummary, teamA]);

  const handleSubmit = async () => {
    if (!summary.trim()) {
      Alert.alert('Summary Required', 'Please enter a brief result summary.');
      return;
    }

    setSubmitting(true);
    try {
      await matchesApi.submitResult(matchId, {
        winnerTeamId,
        resultSummary: summary.trim(),
      });
      onResultSuccess();
    } catch (err: any) {
      Alert.alert(
        'Submission Failed',
        err?.message || 'Could not conclude match. Please try again.'
      );
    } finally {
      setSubmitting(false);
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
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.sheetContainer, { paddingBottom: bottomPadding }]}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Conclude Match</Text>
              <Text style={styles.subtitle}>Confirm match result and declare winner</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.body}>
            <Text style={styles.sectionHeading}>1. Declare Match Winner</Text>
            <View style={styles.winnerRow}>
              {teamA && (
                <TouchableOpacity
                  onPress={() => setWinnerTeamId(teamA.id)}
                  style={[
                    styles.winnerCard,
                    winnerTeamId === teamA.id && styles.winnerCardActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.winnerText,
                      winnerTeamId === teamA.id && styles.winnerTextActive,
                    ]}
                    numberOfLines={1}
                  >
                    {teamA.name}
                  </Text>
                </TouchableOpacity>
              )}

              {teamB && (
                <TouchableOpacity
                  onPress={() => setWinnerTeamId(teamB.id)}
                  style={[
                    styles.winnerCard,
                    winnerTeamId === teamB.id && styles.winnerCardActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.winnerText,
                      winnerTeamId === teamB.id && styles.winnerTextActive,
                    ]}
                    numberOfLines={1}
                  >
                    {teamB.name}
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                onPress={() => setWinnerTeamId(null)}
                style={[
                  styles.winnerCard,
                  winnerTeamId === null && styles.winnerCardActive,
                ]}
              >
                <Text
                  style={[
                    styles.winnerText,
                    winnerTeamId === null && styles.winnerTextActive,
                  ]}
                >
                  Tie / No Result
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionHeading}>2. Result Summary</Text>
            <Input
              value={summary}
              onChangeText={setSummary}
              placeholder="e.g. Team Red won by 15 runs"
            />
          </View>

          <View style={styles.footer}>
            <Button
              title="Submit Final Match Result"
              size="lg"
              loading={submitting}
              onPress={handleSubmit}
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
  body: {
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 12,
  },
  sectionHeading: {
    fontFamily: Fonts.bold,
    fontSize: 13,
    color: Colors.text,
    marginTop: 4,
  },
  winnerRow: {
    flexDirection: 'row',
    gap: 8,
  },
  winnerCard: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radii.md,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  winnerCardActive: {
    borderColor: Colors.primary,
    backgroundColor: '#FAF5FF',
  },
  winnerText: {
    fontFamily: Fonts.semiBold,
    fontSize: 12,
    color: Colors.text,
    textAlign: 'center',
  },
  winnerTextActive: {
    color: Colors.primary,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    marginTop: 16,
  },
  confirmBtn: {
    width: '100%',
  },
});
