import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal, Pressable,
  ScrollView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';

interface VoiceCommandsHelpProps {
  visible: boolean;
  onClose: () => void;
}

interface CommandGroup {
  title: string;
  icon: string;
  color: string;
  commands: { trigger: string; description: string }[];
}

const COMMAND_GROUPS: CommandGroup[] = [
  {
    title: 'Scanning',
    icon: 'camera',
    color: '#3B82F6',
    commands: [
      { trigger: '"Scan" / "Capture"', description: 'Take a photo' },
      { trigger: '"Batch" / "Auto scan"', description: 'Start batch mode' },
      { trigger: '"Stop batch"', description: 'End batch scanning' },
      { trigger: '"Flash"', description: 'Toggle flashlight' },
      { trigger: '"Flip" / "Switch"', description: 'Switch camera' },
      { trigger: '"Gallery"', description: 'Import from photos' },
    ],
  },
  {
    title: 'Navigation',
    icon: 'navigate',
    color: '#8B5CF6',
    commands: [
      { trigger: '"Continue" / "Done"', description: 'Proceed to next step' },
      { trigger: '"Cancel" / "Back"', description: 'Go back' },
      { trigger: '"Settings"', description: 'Open settings' },
    ],
  },
  {
    title: 'Reading',
    icon: 'volume-high',
    color: '#10B981',
    commands: [
      { trigger: '"Read" / "Read aloud"', description: 'Read document text' },
      { trigger: '"Stop reading"', description: 'Stop narration' },
      { trigger: '"Faster" / "Slower"', description: 'Adjust reading speed' },
    ],
  },
  {
    title: 'Document Actions',
    icon: 'document-text',
    color: '#F59E0B',
    commands: [
      { trigger: '"Export PDF"', description: 'Save as PDF' },
      { trigger: '"Share"', description: 'Share document' },
      { trigger: '"Delete"', description: 'Delete document' },
      { trigger: '"Lock" / "Encrypt"', description: 'Password protect' },
    ],
  },
  {
    title: 'Math',
    icon: 'calculator',
    color: '#EF4444',
    commands: [
      { trigger: '"Solve" / "Calculate"', description: 'Open math solver' },
    ],
  },
  {
    title: 'General',
    icon: 'help-circle',
    color: '#6366F1',
    commands: [
      { trigger: '"Help"', description: 'Show this guide' },
      { trigger: '"Yes" / "No"', description: 'Confirm or deny' },
    ],
  },
];

export const VoiceCommandsHelp: React.FC<VoiceCommandsHelpProps> = ({ visible, onClose }) => {
  const { colors, shadows } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Voice Commands</Text>
          <View style={styles.closeBtn} />
        </View>

        {/* Intro */}
        <View style={[styles.introBanner, { backgroundColor: colors.primary + '12' }]}>
          <View style={[styles.introIcon, { backgroundColor: colors.primary + '20' }]}>
            <Ionicons name="mic" size={24} color={colors.primary} />
          </View>
          <View style={styles.introText}>
            <Text style={[styles.introTitle, { color: colors.primary }]}>Voice Control</Text>
            <Text style={[styles.introDesc, { color: colors.textSecondary }]}>
              Enable voice feedback in Settings to hear confirmations. Say commands naturally — the app understands variations.
            </Text>
          </View>
        </View>

        {/* Command Groups */}
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {COMMAND_GROUPS.map((group) => (
            <View key={group.title} style={[styles.group, { backgroundColor: colors.surface }, shadows.sm]}>
              <View style={styles.groupHeader}>
                <View style={[styles.groupIcon, { backgroundColor: group.color + '18' }]}>
                  <Ionicons name={group.icon as any} size={18} color={group.color} />
                </View>
                <Text style={[styles.groupTitle, { color: colors.textPrimary }]}>{group.title}</Text>
              </View>
              {group.commands.map((cmd, i) => (
                <View key={i} style={[styles.commandRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}>
                  <Text style={[styles.trigger, { color: colors.primary }]}>{cmd.trigger}</Text>
                  <Text style={[styles.desc, { color: colors.textSecondary }]}>{cmd.description}</Text>
                </View>
              ))}
            </View>
          ))}
          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 56 : 16, paddingBottom: 12 },
  closeBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '700' },

  introBanner: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, padding: 16, borderRadius: 16, gap: 12, marginBottom: 16 },
  introIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  introText: { flex: 1 },
  introTitle: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  introDesc: { fontSize: 12, lineHeight: 18 },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, gap: 12 },

  group: { borderRadius: 16, padding: 16 },
  groupHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  groupIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  groupTitle: { fontSize: 15, fontWeight: '700' },

  commandRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  trigger: { fontSize: 13, fontWeight: '600', flex: 1 },
  desc: { fontSize: 12, textAlign: 'right', flex: 1 },
});

export default VoiceCommandsHelp;
