import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NavoLogo } from '@/components/NavoLogo';
import { SectionHeading, EmptyState } from '@/components/Primitives';
import { TrackRow } from '@/components/TrackRow';
import { useTrackActions } from '@/components/TrackActions';
import { getTrendingAudius } from '@/services/audius';
import { getTrendingJamendo } from '@/services/jamendo';
import { readCache, cacheValue } from '@/services/database';
import { isOnline } from '@/services/music';
import { useMusicPlayer } from '@/providers/PlayerProvider';
import { usePlayerStore } from '@/store/player';
import { theme } from '@/theme/theme';
import { uz } from '@/i18n/uz';
import type { Track } from '@/types/music';

export default function HomeScreen() {
  const router = useRouter();
  const { playTrack } = useMusicPlayer();
  const networkOnline = usePlayerStore((state) => state.networkOnline);
  const localTracks = usePlayerStore((state) => state.localTracks);
  const downloads = usePlayerStore((state) => state.downloads);
  const trackActions = useTrackActions();
  const [cached, setCached] = useState<Track[]>([]);

  const trending = useQuery({
    queryKey: ['trending'],
    queryFn: async () => {
      const online = await isOnline();
      if (!online) return { tracks: [], offline: true };
      const response = await Promise.allSettled([getTrendingAudius(), getTrendingJamendo()]);
      const tracks = response.flatMap((item) => item.status === 'fulfilled' ? item.value : []);
      if (tracks.length) await cacheValue('trending-v1', tracks);
      return {
        tracks,
        offline: false,
        warning: tracks.length ? undefined : 'Musiqa katalogi hozircha ochilmadi.',
      };
    },
    staleTime: 60_000,
    refetchOnMount: 'always',
  });

  useEffect(() => {
    let active = true;
    void readCache<Track[]>('trending-v1').then((value) => {
      if (active && value) setCached(value);
    }).catch((error: unknown) => console.warn('Keshdan treklar olinmadi:', error));
    return () => { active = false; };
  }, []);

  const tracks = useMemo(() => {
    if (!networkOnline) return [...downloads, ...localTracks];
    return trending.data?.tracks.length ? trending.data.tracks : cached;
  }, [cached, downloads, localTracks, networkOnline, trending.data]);

  const playAt = useCallback((track: Track) => {
    void playTrack(track, tracks);
  }, [playTrack, tracks]);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.top}>
        <View style={styles.brand}>
          <View style={styles.logoBox}><NavoLogo size={31} /></View>
          <Text style={styles.brandName}>navo<Text style={styles.brandAccent}>.</Text></Text>
        </View>
        <Pressable onPress={() => router.push('/(tabs)/library')} style={styles.avatar}>
          <Ionicons name="person" size={18} color={theme.colors.text} />
        </Pressable>
      </View>

      <Text style={styles.eyebrow}>{uz.greetingEyebrow}</Text>
      <Text style={styles.headline}>Kayfiyatingizga{'\n'}mos ohang toping.</Text>
      <Text style={styles.subtitle}>Sevimli musiqangiz — birgina teginish narida.</Text>

      <Pressable onPress={() => router.push('/(tabs)/search')} style={styles.searchCard}>
        <LinearGradient colors={['rgba(69,220,192,0.12)', 'rgba(168,128,255,0.09)']} style={StyleSheet.absoluteFill} />
        <Ionicons name="search" size={19} color={theme.colors.accent} />
        <Text style={styles.searchHint}>{uz.searchHint}</Text>
        <Ionicons name="arrow-forward" size={18} color={theme.colors.muted} />
      </Pressable>

      {!networkOnline ? (
        <View style={styles.offline}>
          <Ionicons name="cloud-offline-outline" size={16} color={theme.colors.accent} />
          <Text style={styles.offlineText}>{uz.offline} · {uz.offlineCaption}</Text>
        </View>
      ) : null}

      <View style={styles.heroWrap}>
        <LinearGradient colors={['#19483F', '#1D2340', '#302047']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <View style={styles.heroGlow} />
          <Text style={styles.heroLabel}>NAVO TAVSIYA QILADI</Text>
          <Text style={styles.heroTitle}>Yangi ovozlar,{'\n'}yangi kayfiyat.</Text>
          <Text style={styles.heroCaption}>Mustaqil ijodkorlarni kashf eting</Text>
          <Pressable onPress={() => router.push('/(tabs)/search')} style={styles.heroButton}>
            <Text style={styles.heroButtonText}>Kashf qilish</Text>
            <Ionicons name="arrow-forward" size={15} color={theme.colors.background} />
          </Pressable>
          <View style={styles.heroNote}><Ionicons name="musical-notes" size={70} color="rgba(255,255,255,0.12)" /></View>
        </LinearGradient>
      </View>

      <View style={styles.genreRow}>
        {['Lo-fi', 'Elektron', 'Jazz', 'Klassik'].map((genre, index) => (
          <Pressable
            key={genre}
            onPress={() => router.push({ pathname: '/(tabs)/search', params: { q: genre } })}
            style={[styles.genre, index === 0 && styles.genreSelected]}
          >
            <Text style={[styles.genreText, index === 0 && styles.genreTextSelected]}>{genre}</Text>
          </Pressable>
        ))}
      </View>

      <SectionHeading title={networkOnline ? uz.trending : uz.downloadsTitle} action={tracks.length ? 'Barchasi' : undefined} onPress={() => router.push(networkOnline ? '/(tabs)/search' : '/(tabs)/downloads')} />
      {trending.isLoading && cached.length === 0 && networkOnline ? (
        <View style={styles.skeletons}>
          {[0, 1, 2].map((item) => <View key={item} style={styles.skeleton} />)}
        </View>
      ) : tracks.length ? (
        tracks.slice(0, 7).map((track, index) => (
          <TrackRow
            key={track.id}
            track={track}
            index={index}
            onPress={() => playAt(track)}
            onMore={() => trackActions(track)}
            showSource
          />
        ))
      ) : (
        <EmptyState
          icon="musical-notes-outline"
          title={networkOnline ? 'Musiqa katalogi tayyorlanmoqda' : uz.emptyDownloads}
          caption={trending.data?.warning ?? 'Treklarni qidiruvdan toping yoki telefoningizdan musiqa qo‘shing.'}
          action={networkOnline ? 'Qayta urinish' : undefined}
          onAction={() => { void trending.refetch(); }}
        />
      )}

      {localTracks.length ? (
        <>
          <SectionHeading title={uz.local} action="Kutubxona" onPress={() => router.push('/(tabs)/library')} />
          {localTracks.slice(0, 3).map((track) => (
            <TrackRow key={track.id} track={track} onPress={() => void playTrack(track, localTracks)} />
          ))}
        </>
      ) : null}
      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 20 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 27 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoBox: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.surfaceRaised },
  brandName: { color: theme.colors.text, fontSize: 22, fontWeight: '800', letterSpacing: -1 },
  brandAccent: { color: theme.colors.accent },
  avatar: { width: 39, height: 39, borderRadius: 14, borderWidth: 1, borderColor: theme.colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.surface },
  eyebrow: { color: theme.colors.accent, fontSize: 10, fontWeight: '800', letterSpacing: 2 },
  headline: { marginTop: 10, color: theme.colors.text, fontSize: 32, lineHeight: 39, fontWeight: '800', letterSpacing: -1.4 },
  subtitle: { marginTop: 9, color: theme.colors.muted, fontSize: 13 },
  searchCard: { height: 55, marginTop: 22, borderRadius: 18, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', gap: 12, overflow: 'hidden' },
  searchHint: { flex: 1, color: theme.colors.muted, fontSize: 13 },
  offline: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14, padding: 11, backgroundColor: 'rgba(69,220,192,0.08)', borderRadius: 12 },
  offlineText: { color: theme.colors.accent, fontSize: 11, flex: 1 },
  heroWrap: { marginTop: 23, borderRadius: 25, overflow: 'hidden' },
  hero: { minHeight: 208, padding: 21, justifyContent: 'center', overflow: 'hidden' },
  heroGlow: { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(69,220,192,0.11)', right: -40, top: -60 },
  heroLabel: { color: '#A6F5E7', fontSize: 9, fontWeight: '800', letterSpacing: 1.8 },
  heroTitle: { marginTop: 12, color: '#FFFFFF', fontSize: 24, lineHeight: 28, fontWeight: '800', letterSpacing: -0.5 },
  heroCaption: { marginTop: 7, color: 'rgba(255,255,255,0.67)', fontSize: 11 },
  heroButton: { marginTop: 16, alignSelf: 'flex-start', borderRadius: 99, backgroundColor: theme.colors.accent, paddingVertical: 10, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 8 },
  heroButtonText: { color: theme.colors.background, fontSize: 11, fontWeight: '800' },
  heroNote: { position: 'absolute', right: 20, top: 62, transform: [{ rotate: '14deg' }] },
  genreRow: { flexDirection: 'row', gap: 8, marginTop: 19 },
  genre: { flex: 1, alignItems: 'center', backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 99, paddingVertical: 9 },
  genreSelected: { backgroundColor: 'rgba(69,220,192,0.12)', borderColor: 'rgba(69,220,192,0.4)' },
  genreText: { color: theme.colors.muted, fontSize: 11, fontWeight: '600' },
  genreTextSelected: { color: theme.colors.accent },
  skeletons: { gap: 8 },
  skeleton: { height: 72, backgroundColor: theme.colors.surface, borderRadius: 17 },
});
