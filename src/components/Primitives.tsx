import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '@/theme/theme';

export function SectionHeading({ title, action, onPress }: { title: string; action?: string; onPress?: () => void }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action && onPress ? <Pressable onPress={onPress}><Text style={styles.action}>{action}</Text></Pressable> : null}
    </View>
  );
}

export function EmptyState({ icon, title, caption, action, onAction }: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  caption?: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.empty}>
      <LinearGradient colors={['rgba(69,220,192,0.17)', 'rgba(168,128,255,0.12)']} style={styles.iconHalo}>
        <Ionicons name={icon} size={28} color={theme.colors.accent} />
      </LinearGradient>
      <Text style={styles.emptyTitle}>{title}</Text>
      {caption ? <Text style={styles.caption}>{caption}</Text> : null}
      {action && onAction ? (
        <Pressable style={styles.retry} onPress={onAction}>
          <ActivityIndicator size="small" color={theme.colors.background} />
          <Text style={styles.retryText}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function Pill({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.pill, selected && styles.pillSelected]}>
      <Text style={[styles.pillText, selected && styles.pillTextSelected]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, marginTop: 16 },
  sectionTitle: { color: theme.colors.text, fontSize: 18, fontWeight: '700', letterSpacing: -0.3 },
  action: { color: theme.colors.accent, fontSize: 12, fontWeight: '600' },
  empty: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 36, paddingVertical: 48, gap: 10 },
  iconHalo: { width: 68, height: 68, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  emptyTitle: { color: theme.colors.text, fontSize: 16, fontWeight: '700', textAlign: 'center' },
  caption: { color: theme.colors.muted, textAlign: 'center', fontSize: 13, lineHeight: 19 },
  retry: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, backgroundColor: theme.colors.accent, paddingVertical: 11, paddingHorizontal: 16, borderRadius: theme.radius.pill },
  retryText: { color: theme.colors.background, fontWeight: '700' },
  pill: { borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, borderRadius: theme.radius.pill, paddingVertical: 9, paddingHorizontal: 15 },
  pillSelected: { backgroundColor: 'rgba(69,220,192,0.14)', borderColor: 'rgba(69,220,192,0.45)' },
  pillText: { color: theme.colors.muted, fontSize: 12, fontWeight: '600' },
  pillTextSelected: { color: theme.colors.accent },
});
