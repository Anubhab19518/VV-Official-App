import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { RecordDlsInterruptionPayload } from '@/types/api';
import { Colors, Fonts, Radii } from '@/theme/tokens';

interface DlsModalProps {
  visible: boolean;
  onClose: () => void;
  inningsNumber: number;
  currentOvers: number;
  currentBalls: number;
  currentWickets: number;
  initialTotalOvers: number;
  onSubmitInterruption: (payload: RecordDlsInterruptionPayload) => Promise<void>;
}

export function DlsModal({
  visible,
  onClose,
  inningsNumber,
  currentOvers,
  currentBalls,
  currentWickets,
  initialTotalOvers,
  onSubmitInterruption,
}: DlsModalProps) {
  const [oversLost, setOversLost] = useState<number>(2);
  const [revisedOvers, setRevisedOvers] = useState<number>(
    Math.max(1, initialTotalOvers - 2)
  );
  const [reason, setReason] = useState<string>('Rain delay');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      const defaultLost = 2;
      setOversLost(defaultLost);
      setRevisedOvers(Math.max(1, initialTotalOvers - defaultLost));
      setReason('Rain delay');
      setSubmitting(false);
    }
  }, [visible, initialTotalOvers]);

  const handleOversLostChange = (delta: number) => {
    const nextLost = Math.max(1, Math.min(initialTotalOvers - 1, oversLost + delta));
    setOversLost(nextLost);
    setRevisedOvers(Math.max(1, initialTotalOvers - nextLost));
  };

  const handleRevisedOversChange = (delta: number) => {
    const nextRevised = Math.max(
      Math.ceil(currentOvers + (currentBalls > 0 ? 1 : 0)),
      Math.min(initialTotalOvers - 1, revisedOvers + delta)
    );
    setRevisedOvers(nextRevised);
    setOversLost(Math.max(0, initialTotalOvers - nextRevised));
  };

  const handleSubmit = async () => {
    const oversAtInterruption = parseFloat(`${currentOvers}.${currentBalls}`);

    if (revisedOvers < oversAtInterruption) {
      Alert.alert(
        'Invalid Overs',
        `Revised total overs (${revisedOvers}) cannot be less than overs already bowled (${oversAtInterruption}).`
      );
      return;
    }

    setSubmitting(true);
    try {
      await onSubmitInterruption({
        inningsNumber: (inningsNumber === 1 ? 1 : 2) as 1 | 2,
        oversAtInterruption,
        wicketsAtInterruption: currentWickets,
        oversLost,
        revisedOversTotal: revisedOvers,
        reason,
      });
      onClose();
    } catch {
      // Alert handled by caller
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
            <View style={styles.headerTitleRow}>
              <View style={styles.rainIconBg}>
                <Ionicons name="rainy" size={20} color="#D97706" />
              </View>
              <View>
                <Text style={styles.title}>Rain / DLS Interruption</Text>
                <Text style={styles.subtitle}>
                  Calculate revised target under Law 11 & DLS Standard Edition
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Match State at Interruption Card */}
            <View style={styles.stateCard}>
              <Text style={styles.stateCardTitle}>Match State at Interruption</Text>
              <View style={styles.stateRow}>
                <View style={styles.stateCol}>
                  <Text style={styles.stateLabel}>Innings</Text>
                  <Text style={styles.stateValue}>Innings {inningsNumber}</Text>
                </View>
                <View style={styles.stateCol}>
                  <Text style={styles.stateLabel}>Overs Bowled</Text>
                  <Text style={styles.stateValue}>
                    {currentOvers}.{currentBalls} ov
                  </Text>
                </View>
                <View style={styles.stateCol}>
                  <Text style={styles.stateLabel}>Wickets Down</Text>
                  <Text style={styles.stateValue}>{currentWickets} wkts</Text>
                </View>
                <View style={styles.stateCol}>
                  <Text style={styles.stateLabel}>Initial Overs</Text>
                  <Text style={styles.stateValue}>{initialTotalOvers}.0 ov</Text>
                </View>
              </View>
            </View>

            {/* Stepper 1: Overs Lost */}
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionHeading}>Overs Deducted Due to Delay</Text>
              <View style={styles.stepperContainer}>
                <TouchableOpacity
                  style={[styles.stepperBtn, oversLost <= 1 && styles.stepperBtnDisabled]}
                  onPress={() => handleOversLostChange(-1)}
                  disabled={oversLost <= 1}
                >
                  <Ionicons name="remove" size={20} color={oversLost <= 1 ? Colors.textMuted : Colors.primary} />
                </TouchableOpacity>
                <View style={styles.stepperValueContainer}>
                  <Text style={styles.stepperValue}>{oversLost}</Text>
                  <Text style={styles.stepperUnit}>overs lost</Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.stepperBtn,
                    oversLost >= initialTotalOvers - 1 && styles.stepperBtnDisabled,
                  ]}
                  onPress={() => handleOversLostChange(1)}
                  disabled={oversLost >= initialTotalOvers - 1}
                >
                  <Ionicons
                    name="add"
                    size={20}
                    color={oversLost >= initialTotalOvers - 1 ? Colors.textMuted : Colors.primary}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Stepper 2: Revised Total Overs */}
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionHeading}>Revised Match Quota (Overs)</Text>
              <View style={styles.stepperContainer}>
                <TouchableOpacity
                  style={[
                    styles.stepperBtn,
                    revisedOvers <= Math.ceil(currentOvers + (currentBalls > 0 ? 1 : 0)) &&
                      styles.stepperBtnDisabled,
                  ]}
                  onPress={() => handleRevisedOversChange(-1)}
                  disabled={
                    revisedOvers <= Math.ceil(currentOvers + (currentBalls > 0 ? 1 : 0))
                  }
                >
                  <Ionicons
                    name="remove"
                    size={20}
                    color={
                      revisedOvers <= Math.ceil(currentOvers + (currentBalls > 0 ? 1 : 0))
                        ? Colors.textMuted
                        : Colors.primary
                    }
                  />
                </TouchableOpacity>
                <View style={styles.stepperValueContainer}>
                  <Text style={[styles.stepperValue, { color: Colors.primary }]}>
                    {revisedOvers}
                  </Text>
                  <Text style={styles.stepperUnit}>total overs</Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.stepperBtn,
                    revisedOvers >= initialTotalOvers && styles.stepperBtnDisabled,
                  ]}
                  onPress={() => handleRevisedOversChange(1)}
                  disabled={revisedOvers >= initialTotalOvers}
                >
                  <Ionicons
                    name="add"
                    size={20}
                    color={revisedOvers >= initialTotalOvers ? Colors.textMuted : Colors.primary}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Interruption Reason Input */}
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionHeading}>Interruption Notes / Reason</Text>
              <TextInput
                style={styles.textInput}
                value={reason}
                onChangeText={setReason}
                placeholder="e.g. Rain stoppage, bad light, ground delay"
                placeholderTextColor={Colors.textMuted}
              />
            </View>

            {/* DLS Formula Explanation Banner */}
            <View style={styles.infoBanner}>
              <Ionicons name="information-circle-outline" size={18} color="#7C3AED" />
              <Text style={styles.infoBannerText}>
                The DLS algorithm recalculates the available resource percentage based on wickets lost and overs remaining. Innings 2 target will adjust automatically.
              </Text>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <Button
              title={submitting ? 'Applying DLS Adjustment...' : 'Apply DLS Revised Target'}
              size="lg"
              variant="primary"
              disabled={submitting}
              onPress={handleSubmit}
              icon={<Ionicons name="flash-outline" size={18} color="#FFFFFF" />}
              style={styles.applyBtn}
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
    maxHeight: '90%',
    paddingBottom: 28,
    shadowColor: Colors.shadowPurple,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  rainIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: Fonts.bold,
    fontSize: 17,
    color: Colors.text,
  },
  subtitle: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
    maxWidth: 240,
  },
  closeBtn: {
    padding: 6,
    borderRadius: Radii.full,
    backgroundColor: Colors.surfaceSubtle,
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  stateCard: {
    backgroundColor: '#F5F3FF',
    borderWidth: 1,
    borderColor: '#DDD6FE',
    borderRadius: Radii.lg,
    padding: 12,
    marginBottom: 16,
  },
  stateCardTitle: {
    fontFamily: Fonts.bold,
    fontSize: 11,
    color: '#6D28D9',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  stateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stateCol: {
    alignItems: 'center',
  },
  stateLabel: {
    fontFamily: Fonts.regular,
    fontSize: 10,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  stateValue: {
    fontFamily: Fonts.bold,
    fontSize: 13,
    color: Colors.text,
  },
  sectionBlock: {
    marginBottom: 16,
  },
  sectionHeading: {
    fontFamily: Fonts.bold,
    fontSize: 13,
    color: Colors.text,
    marginBottom: 8,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radii.lg,
    padding: 6,
  },
  stepperBtn: {
    width: 44,
    height: 44,
    borderRadius: Radii.md,
    backgroundColor: '#F5F3FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnDisabled: {
    backgroundColor: '#F3F4F6',
  },
  stepperValueContainer: {
    alignItems: 'center',
  },
  stepperValue: {
    fontFamily: Fonts.extraBold,
    fontSize: 22,
    color: Colors.text,
  },
  stepperUnit: {
    fontFamily: Fonts.medium,
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  textInput: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radii.lg,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: Colors.text,
    backgroundColor: '#FFFFFF',
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#FAF5FF',
    borderWidth: 1,
    borderColor: '#E9D5FF',
    borderRadius: Radii.md,
    padding: 10,
    marginBottom: 16,
  },
  infoBannerText: {
    flex: 1,
    fontFamily: Fonts.regular,
    fontSize: 11,
    color: '#6D28D9',
    lineHeight: 16,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  applyBtn: {
    width: '100%',
    backgroundColor: Colors.primary,
  },
});
