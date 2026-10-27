import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useMusicPlayer } from '@/providers/PlayerProvider';
import { usePlayerStore } from '@/store/player';
import { theme } from '@/theme/theme';
import { Artwork } from './Artwork';

export function MiniPlayer() {
  const current = usePlayerStore((state) => state.current);
  const playing = usePlayerStore((state) => state.playing);
  const position = usePlayerStore((state) => state.position);
  const duration = usePlayerStore((state) => state.duration);
  const { togglePlayback, openPlayer, next } = useMusicPlayer();
  if (!current) return null;
  const progress = duration > 0 ? Math.min(position / duration, 1) : 0;

  return (
    <Pressable onPress={openPlayer} style={styles.container}>
      <BlurView intensity={28} tint="dark" style={styles.blur}>
        <View style={styles.inner}>
          <Artwork uri={current.artwork} size={40} rounded={12} />
          <View style={styles.text}>
            <Text numberOfLines={1} style={styles.title}>{current.title}</Text>
            <Text numberOfLines={1} style={styles.artist}>{current.artist}</Text>
          </View>
          <Pressable hitSlop={10} onPress={() => { void Haptics.selectionAsync(); togglePlayback(); }} style={styles.control}>
            <Ionicons name={playing ? 'pause' : 'play'} size={24} color={theme.colors.text} />
          </Pressable>
          <Pressable hitSlop={10} onPress={() => { void Haptics.selectionAsync(); void next(); }} style={styles.control}>
            <Ionicons name="play-skip-forward" size={21} color={theme.colors.text} />
          </Pressable>
        </View>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${progress * 100}%` }]} />
        </View>
      </BlurView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { marginHorizontal: 12, marginBottom: 6, overflow: 'hidden', borderRadius: 18, borderWidth: 1, borderColor: theme.colors.border },
  blur: { backgroundColor: 'rgba(24,25,34,0.83)' },
  inner: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 9, gap: 10 },
  text: { flex: 1, gap: 3 },
  title: { color: theme.colors.text, fontWeight: '700', fontSize: 12 },
  artist: { color: theme.colors.muted, fontSize: 11 },
  control: { width: 38, height: 40, alignItems: 'center', justifyContent: 'center' },
  track: { height: 2, backgroundColor: 'rgba(255,255,255,0.1)' },
  fill: { height: 2, backgroundColor: theme.colors.accent },
});
