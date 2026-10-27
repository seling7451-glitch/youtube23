import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { Artwork } from '@/components/Artwork';
import { TrackRow, formatDuration } from '@/components/TrackRow';
import { useSleepTimer, useMusicPlayer } from '@/providers/PlayerProvider';
import { useTrackActions } from '@/components/TrackActions';
import { usePlayerStore } from '@/store/player';
import { theme } from '@/theme/theme';
import { uz } from '@/i18n/uz';

export default function PlayerScreen() {
  const router = useRouter();
  const current = usePlayerStore((state) => state.current);
  const queue = usePlayerStore((state) => state.queue);
  const playing = usePlayerStore((state) => state.playing);
  const position = usePlayerStore((state) => state.position);
  const duration = usePlayerStore((state) => state.duration);
  const shuffle = usePlayerStore((state) => state.shuffle);
  const repeat = usePlayerStore((state) => state.repeat);
  const isLiked = usePlayerStore((state) => state.favorites.some((item) => item.id === current?.id));
  const toggleShuffle = usePlayerStore((state) => state.toggleShuffle);
  const cycleRepeat = usePlayerStore((state) => state.cycleRepeat);
  const { togglePlayback, next, previous, seek, playTrack } = useMusicPlayer();
  const { start } = useSleepTimer();
  const trackActions = useTrackActions();
  const rotation = useSharedValue(0);
  const [dragPosition, setDragPosition] = useState<number | null>(null);

  useEffect(() => {
    if (playing) {
      rotation.value = withRepeat(
        withTiming(rotation.value + 360, { duration: 24_000, easing: Easing.linear }),
        -1,
        false,
      );
    } else {
      cancelAnimation(rotation);
    }
    return () => cancelAnimation(rotation);
  }, [playing, rotation]);

  const albumStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotation.value}deg` }] }));

  if (!current) {
    return (
      <View style={styles.emptyScreen}>
        <Pressable onPress={() => router.back()} style={styles.close}><Ionicons name="chevron-down" size={25} color={theme.colors.text} /></Pressable>
        <Text style={styles.emptyTitle}>Hozir ijro etilayotgan trek yo‘q</Text>
      </View>
    );
  }

  const setTimer = () => {
    Alert.alert(uz.sleepTimer, 'Ijro qancha vaqtdan keyin to‘xtasin?', [
      ...[15, 30, 45, 60].map((minutes) => ({
        text: `${minutes} daqiqa`,
        onPress: () => {
          start(minutes);
          void Haptics.selectionAsync();
        },
      })),
      { text: 'Bekor qilish', style: 'cancel' as const },
    ]);
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#183E3A', '#171828', theme.colors.background]} locations={[0, 0.48, 1]} style={StyleSheet.absoluteFill} />
      <View style={styles.top}>
        <Pressable onPress={() => router.back()} style={styles.close}><Ionicons name="chevron-down" size={25} color={theme.colors.text} /></Pressable>
        <View style={styles.sourceLabel}><View style={styles.sourceDot} /><Text style={styles.sourceText}>{current.source.toUpperCase()} · IJRO</Text></View>
        <Pressable onPress={setTimer} style={styles.close}><Ionicons name="timer-outline" size={21} color={theme.colors.text} /></Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View style={[styles.albumFrame, albumStyle]}>
          <Artwork uri={current.artwork} size={288} rounded={32} />
        </Animated.View>

        <View style={styles.trackDetails}>
          <View style={{ flex: 1 }}>
            <Text numberOfLines={2} style={styles.trackTitle}>{current.title}</Text>
            <Text numberOfLines={1} style={styles.artist}>{current.artist}</Text>
          </View>
          <Pressable onPress={() => trackActions(current)} hitSlop={10} style={styles.like}>
            <Ionicons
              name={isLiked ? 'heart' : 'heart-outline'}
              size={24}
              color={theme.colors.accent}
            />
          </Pressable>
        </View>

        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={Math.max(duration, current.duration, 1)}
          value={dragPosition ?? Math.min(position, duration || current.duration)}
          minimumTrackTintColor={theme.colors.accent}
          maximumTrackTintColor="rgba(255,255,255,0.16)"
          thumbTintColor={theme.colors.text}
          onValueChange={setDragPosition}
          onSlidingComplete={(value) => { seek(value); setDragPosition(null); }}
        />
        <View style={styles.timeRow}>
          <Text style={styles.time}>{formatDuration(dragPosition ?? position)}</Text>
          <Text style={styles.time}>{formatDuration(duration || current.duration)}</Text>
        </View>

        <View style={styles.controls}>
          <Pressable onPress={() => { toggleShuffle(); void Haptics.selectionAsync(); }} style={styles.sideControl}>
            <Ionicons name="shuffle" size={21} color={shuffle ? theme.colors.accent : theme.colors.muted} />
          </Pressable>
          <Pressable onPress={() => { void previous(); void Haptics.selectionAsync(); }} style={styles.skipButton}>
            <Ionicons name="play-skip-back" size={27} color={theme.colors.text} />
          </Pressable>
          <Pressable onPress={() => { togglePlayback(); void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }} style={styles.playButton}>
            <LinearGradient colors={theme.gradient} style={styles.playGradient}>
              <Ionicons name={playing ? 'pause' : 'play'} size={31} color={theme.colors.background} />
            </LinearGradient>
          </Pressable>
          <Pressable onPress={() => { void next(); void Haptics.selectionAsync(); }} style={styles.skipButton}>
            <Ionicons name="play-skip-forward" size={27} color={theme.colors.text} />
          </Pressable>
          <Pressable onPress={cycleRepeat} style={styles.sideControl}>
            <Ionicons name={repeat === 'one' ? 'repeat' : 'repeat'} size={21} color={repeat === 'off' ? theme.colors.muted : theme.colors.accent} />
            {repeat === 'one' ? <Text style={styles.repeatOne}>1</Text> : null}
          </Pressable>
        </View>

        <View style={styles.upNextHeader}>
          <View><Text style={styles.upNextTitle}>Keyingi navbatda</Text><Text style={styles.upNextSub}>{queue.length} ta trek</Text></View>
          <Ionicons name="list" size={20} color={theme.colors.muted} />
        </View>
        {queue.slice(0, 4).map((track, index) => (
          <TrackRow
            key={track.id}
            track={track}
            index={index}
            onPress={() => void playTrack(track, queue)}
            onMore={() => trackActions(track)}
          />
        ))}
        {queue.length === 0 ? <Text style={styles.queueEmpty}>Navbatga trek qo‘shish uchun qidiruvdan foydalaning.</Text> : null}
        <View style={{ height: 28 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  emptyScreen: { flex: 1, backgroundColor: theme.colors.background, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { color: theme.colors.text, fontSize: 15 },
  top: { height: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginTop: 4 },
  close: { width: 42, height: 42, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.07)', alignItems: 'center', justifyContent: 'center' },
  sourceLabel: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  sourceDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: theme.colors.accent },
  sourceText: { color: theme.colors.muted, fontSize: 9, fontWeight: '800', letterSpacing: 1.5 },
  content: { paddingHorizontal: 25, paddingTop: 16, paddingBottom: 20 },
  albumFrame: { alignSelf: 'center', marginTop: 8, padding: 8, borderRadius: 42, backgroundColor: 'rgba(255,255,255,0.07)', shadowColor: '#45DCC0', shadowOpacity: 0.17, shadowRadius: 35, shadowOffset: { width: 0, height: 10 }, elevation: 9 },
  trackDetails: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 28 },
  trackTitle: { color: theme.colors.text, fontSize: 22, lineHeight: 27, fontWeight: '800', letterSpacing: -0.5 },
  artist: { color: theme.colors.muted, fontSize: 14, marginTop: 5 },
  like: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  slider: { height: 39, marginHorizontal: -10, marginTop: 22 },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: -4 },
  time: { color: theme.colors.muted, fontSize: 10, fontVariant: ['tabular-nums'] },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 20 },
  sideControl: { width: 40, height: 46, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  skipButton: { width: 48, height: 50, alignItems: 'center', justifyContent: 'center' },
  playButton: { width: 68, height: 68, borderRadius: 25, overflow: 'hidden' },
  playGradient: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  repeatOne: { position: 'absolute', top: 21, right: 12, color: theme.colors.accent, fontSize: 8, fontWeight: '900' },
  upNextHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 31, paddingTop: 19, borderTopWidth: 1, borderColor: theme.colors.border },
  upNextTitle: { color: theme.colors.text, fontSize: 16, fontWeight: '800' },
  upNextSub: { color: theme.colors.muted, fontSize: 10, marginTop: 4 },
  queueEmpty: { color: theme.colors.muted, fontSize: 12, paddingVertical: 15, lineHeight: 18 },
});
