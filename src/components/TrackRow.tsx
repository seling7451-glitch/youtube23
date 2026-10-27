import { memo, useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { usePlayerStore } from '@/store/player';
import { theme } from '@/theme/theme';
import type { Track } from '@/types/music';
import { Artwork } from './Artwork';

type Props = {
  track: Track;
  index?: number;
  onPress: () => void;
  onMore?: () => void;
  showSource?: boolean;
};

export const TrackRow = memo(function TrackRow({ track, index, onPress, onMore, showSource = false }: Props) {
  const liked = usePlayerStore((state) => state.favorites.some((item) => item.id === track.id));
  const play = useCallback(() => {
    void Haptics.selectionAsync();
    onPress();
  }, [onPress]);

  return (
    <Pressable onPress={play} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <View style={styles.leading}>
        {index !== undefined && <Text style={styles.index}>{String(index + 1).padStart(2, '0')}</Text>}
        <Artwork uri={track.artwork} size={56} />
      </View>
      <View style={styles.info}>
        <Text numberOfLines={1} style={styles.title}>{track.title}</Text>
        <Text numberOfLines={1} style={styles.artist}>
          {track.artist}{showSource ? `  ·  ${track.source.toUpperCase()}` : ''}
        </Text>
      </View>
      <Text style={styles.duration}>{formatDuration(track.duration)}</Text>
      {onMore ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Trek amallari" hitSlop={8} onPress={onMore} style={styles.more}>
          <Ionicons name={liked ? 'heart' : 'ellipsis-horizontal'} size={20} color={liked ? theme.colors.accent : theme.colors.muted} />
        </Pressable>
      ) : null}
    </Pressable>
  );
});

export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '--:--';
  const minutes = Math.floor(seconds / 60);
  const remaining = Math.floor(seconds % 60);
  return `${minutes}:${remaining.toString().padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  row: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  pressed: { opacity: 0.7 },
  leading: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  index: { width: 20, color: theme.colors.muted, fontSize: 11, fontVariant: ['tabular-nums'] },
  info: { flex: 1, gap: 5 },
  title: { color: theme.colors.text, fontSize: 14, fontWeight: '600' },
  artist: { color: theme.colors.muted, fontSize: 12 },
  duration: { color: theme.colors.muted, fontSize: 11, fontVariant: ['tabular-nums'] },
  more: { width: 34, height: 40, alignItems: 'center', justifyContent: 'center' },
});
