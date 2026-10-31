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
import { SquadPlayer } from '@/types/api';
import { Colors, Fonts, Radii } from '@/theme/tokens';
import { formatPlayerPosition } from '@/utils/match-helpers';

interface OpenersModalProps {
  visible: boolean;
  battingPlayers: SquadPlayer[];
  bowlingPlayers: SquadPlayer[];
  battingTeamName: string;
  bowlingTeamName: string;
  inningsNumber: number;
  onConfirm: (striker: SquadPlayer, nonStriker: SquadPlayer, bowler: SquadPlayer) => void;
}

export function OpenersModal({
  visible,
  battingPlayers,
  bowlingPlayers,
  battingTeamName,
  bowlingTeamName,
  inningsNumber,
  onConfirm,
}: OpenersModalProps) {
  const [selectedStrikerId, setSelectedStrikerId] = useState<string>('');
  const [selectedNonStrikerId, setSelectedNonStrikerId] = useState<string>('');
  const [selectedBowlerId, setSelectedBowlerId] = useState<string>('');

  useEffect(() => {
    if (visible) {
      if (battingPlayers.length > 0) {
        setSelectedStrikerId(battingPlayers[0].id);
        if (battingPlayers.length > 1) {
          setSelectedNonStrikerId(battingPlayers[1].id);
        }
      }
      if (bowlingPlayers.length > 0) {
        setSelectedBowlerId(bowlingPlayers[0].id);
      }
    }
  }, [visible, battingPlayers, bowlingPlayers]);

  const handleConfirm = () => {
    if (!selectedStrikerId || !selectedNonStrikerId || !selectedBowlerId) {
      Alert.alert('Incomplete Selection', 'Please select both opening batters and the opening bowler.');
      return;
    }
    if (selectedStrikerId === selectedNonStrikerId) {
      Alert.alert('Invalid Selection', 'Striker and Non-Striker cannot be the same player.');
      return;
    }

    const striker = battingPlayers.find((p) => p.id === selectedStrikerId);
    const nonStriker = battingPlayers.find((p) => p.id === selectedNonStrikerId);
    const bowler = bowlingPlayers.find((p) => p.id === selectedBowlerId);

    if (striker && nonStriker && bowler) {
      onConfirm(striker, nonStriker, bowler);
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
            <View>
              <Text style={styles.title}>
                {inningsNumber === 1 ? '1st Innings Setup' : '2nd Innings Setup'}
              </Text>
              <Text style={styles.subtitle}>
                Select opening batters for {battingTeamName} and opening bowler for {bowlingTeamName}
              </Text>
            </View>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* 1. Opening Striker */}
            <View style={styles.section}>
              <View style={styles.sectionTitleRow}>
                <Ionicons name="baseball" size={16} color={Colors.primary} />
                <Text style={styles.sectionTitle}>Striker (Facing First Ball)</Text>
              </View>
              <Text style={styles.sectionSubtitle}>{battingTeamName}</Text>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                <View style={styles.chipRow}>
                  {battingPlayers.map((player) => {
                    const isSelected = selectedStrikerId === player.id;
                    const isBusy = selectedNonStrikerId === player.id;
                    return (
                      <TouchableOpacity
                        key={player.id}
                        disabled={isBusy}
                        onPress={() => setSelectedStrikerId(player.id)}
                        style={[
                          styles.playerChip,
                          isSelected && styles.playerChipActive,
                          isBusy && styles.playerChipDisabled,
                        ]}
                      >
                        <Text style={[styles.playerChipName, isSelected && styles.playerChipNameActive]}>
                          {player.name}
                        </Text>
                        <Text style={styles.playerChipRole}>
                          {formatPlayerPosition(player.positions)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
            </View>

            {/* 2. Opening Non-Striker */}
            <View style={styles.section}>
              <View style={styles.sectionTitleRow}>
                <Ionicons name="body" size={16} color={Colors.primary} />
                <Text style={styles.sectionTitle}>Non-Striker (Runner End)</Text>
              </View>
              <Text style={styles.sectionSubtitle}>{battingTeamName}</Text>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                <View style={styles.chipRow}>
                  {battingPlayers.map((player) => {
                    const isSelected = selectedNonStrikerId === player.id;
                    const isBusy = selectedStrikerId === player.id;
                    return (
                      <TouchableOpacity
                        key={player.id}
                        disabled={isBusy}
                        onPress={() => setSelectedNonStrikerId(player.id)}
                        style={[
                          styles.playerChip,
                          isSelected && styles.playerChipActive,
                          isBusy && styles.playerChipDisabled,
                        ]}
                      >
                        <Text style={[styles.playerChipName, isSelected && styles.playerChipNameActive]}>
                          {player.name}
                        </Text>
                        <Text style={styles.playerChipRole}>
                          {formatPlayerPosition(player.positions)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
            </View>

            {/* 3. Opening Bowler */}
            <View style={styles.section}>
              <View style={styles.sectionTitleRow}>
                <Ionicons name="flash" size={16} color={Colors.primary} />
                <Text style={styles.sectionTitle}>Opening Bowler (Over 1)</Text>
              </View>
              <Text style={styles.sectionSubtitle}>{bowlingTeamName}</Text>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                <View style={styles.chipRow}>
                  {bowlingPlayers.map((player) => {
                    const isSelected = selectedBowlerId === player.id;
                    return (
                      <TouchableOpacity
                        key={player.id}
                        onPress={() => setSelectedBowlerId(player.id)}
                        style={[styles.playerChip, isSelected && styles.playerChipActive]}
                      >
                        <Text style={[styles.playerChipName, isSelected && styles.playerChipNameActive]}>
                          {player.name}
                        </Text>
                        <Text style={styles.playerChipRole}>
                          {formatPlayerPosition(player.positions)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
            </View>
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.footer}>
            <Button
              title="Confirm Openers & Start Inning"
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
    maxHeight: '88%',
    paddingBottom: 28,
    shadowColor: Colors.shadowPurple,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  header: {
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
    lineHeight: 16,
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontFamily: Fonts.bold,
    fontSize: 14,
    color: Colors.text,
  },
  sectionSubtitle: {
    fontFamily: Fonts.medium,
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
    marginBottom: 8,
  },
  chipScroll: {
    marginTop: 4,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 2,
  },
  playerChip: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radii.lg,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    minWidth: 110,
  },
  playerChipActive: {
    borderColor: Colors.primary,
    backgroundColor: '#FAF5FF',
  },
  playerChipDisabled: {
    opacity: 0.35,
    backgroundColor: '#F3F4F6',
  },
  playerChipName: {
    fontFamily: Fonts.semiBold,
    fontSize: 13,
    color: Colors.text,
  },
  playerChipNameActive: {
    color: Colors.primary,
  },
  playerChipRole: {
    fontFamily: Fonts.regular,
    fontSize: 10,
    color: Colors.textSecondary,
    marginTop: 2,
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
