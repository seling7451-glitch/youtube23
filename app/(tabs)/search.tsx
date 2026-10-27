import { FlashList } from '@shopify/flash-list';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { EmptyState, Pill } from '@/components/Primitives';
import { TrackRow } from '@/components/TrackRow';
import { useTrackActions } from '@/components/TrackActions';
import { searchCatalogue } from '@/services/music';
import { getJamendoGenres } from '@/services/jamendo';
import { useMusicPlayer } from '@/providers/PlayerProvider';
import { usePlayerStore } from '@/store/player';
import { theme } from '@/theme/theme';
import { uz } from '@/i18n/uz';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import type { Track } from '@/types/music';

export default function SearchScreen() {
  const params = useLocalSearchParams<{ q?: string }>();
  const initialQuery = params.q ?? '';
  return <SearchContent key={initialQuery} initialQuery={initialQuery} />;
}

function SearchContent({ initialQuery }: { initialQuery: string }) {
  const [text, setText] = useState(initialQuery);
  const query = useDebouncedValue(text.trim());
  const [provider, setProvider] = useState<'audius' | 'jamendo'>('audius');
  const networkOnline = usePlayerStore((state) => state.networkOnline);
  const localTracks = usePlayerStore((state) => state.localTracks);
  const downloads = usePlayerStore((state) => state.downloads);
  const { playTrack } = useMusicPlayer();
  const trackActions = useTrackActions();

  const results = useQuery({
    queryKey: ['search', provider, query],
    queryFn: () => searchCatalogue(query, provider),
    enabled: query.length > 1 && networkOnline,
  });
  const genres = useQuery({
    queryKey: ['jamendo-genres'],
    queryFn: () => getJamendoGenres(),
    enabled: provider === 'jamendo' && networkOnline,
    staleTime: 60 * 60_000,
  });

  const tracks = useMemo(() => {
    if (!networkOnline) {
      const local = [...downloads, ...localTracks];
      if (!query) return local;
      const normalized = query.toLowerCase();
      return local.filter((track) => `${track.title} ${track.artist}`.toLowerCase().includes(normalized));
    }
    return results.data?.tracks ?? [];
  }, [downloads, localTracks, networkOnline, query, results.data]);

  const renderTrack = useCallback(({ item, index }: { item: Track; index: number }) => (
    <TrackRow
      track={item}
      index={index}
      showSource
      onPress={() => void playTrack(item, tracks)}
      onMore={() => trackActions(item)}
    />
  ), [playTrack, trackActions, tracks]);

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.kicker}>NAVO MUSIC</Text>
        <Text style={styles.title}>{uz.searchTitle}</Text>
        <Text style={styles.subtitle}>{uz.searchCaption}</Text>
      </View>
      <View style={styles.inputWrap}>
        <Ionicons name="search" size={20} color={theme.colors.accent} />
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder={uz.searchHint}
          placeholderTextColor={theme.colors.muted}
          returnKeyType="search"
          style={styles.input}
          autoCorrect={false}
          accessibilityLabel="Musiqa qidiruvi"
        />
        {text.length > 0 ? (
          <Pressable           onPress={() => { setText(''); }} hitSlop={10}>
            <Ionicons name="close-circle" size={19} color={theme.colors.muted} />
          </Pressable>
        ) : null}
      </View>
      {networkOnline ? (
        <View style={styles.providers}>
          <Pill label="Audius" selected={provider === 'audius'} onPress={() => setProvider('audius')} />
          <Pill label="Jamendo · CC" selected={provider === 'jamendo'} onPress={() => setProvider('jamendo')} />
        </View>
      ) : (
        <View style={styles.offline}>
          <Ionicons name="cloud-offline-outline" size={15} color={theme.colors.accent} />
          <Text style={styles.offlineText}>Oflayn — telefon va yuklangan treklar</Text>
        </View>
      )}
      {provider === 'jamendo' && genres.data?.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.genreList}>
          {genres.data.slice(0, 16).map((genre) => (
            <Pill key={genre} label={genre} selected={text === genre} onPress={() => setText(genre)} />
          ))}
        </ScrollView>
      ) : null}
      {!query && networkOnline ? (
        <EmptyState icon="sparkles-outline" title={uz.emptySearch} caption="Masalan: lo-fi, jazz yoki ijrochi nomi" />
      ) : tracks.length === 0 && !results.isFetching ? (
        <EmptyState
          icon="search-outline"
          title={query.length > 1 ? uz.noResults : uz.emptyDownloads}
          caption={results.data?.warning ?? (networkOnline ? 'Boshqa so‘z bilan qidirib ko‘ring.' : undefined)}
          action={results.isError ? 'Qayta urinish' : undefined}
          onAction={() => { void results.refetch(); }}
        />
      ) : null}
      {results.isFetching && tracks.length === 0 ? (
        <View style={styles.loadingList}>
          {[0, 1, 2, 3].map((item) => <View key={item} style={styles.skeleton} />)}
        </View>
      ) : (
        <FlashList
          data={tracks}
          renderItem={renderTrack}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background, paddingHorizontal: 20, paddingTop: 23 },
  header: { marginBottom: 20 },
  kicker: { color: theme.colors.accent, fontSize: 9, letterSpacing: 2, fontWeight: '800' },
  title: { color: theme.colors.text, fontSize: 27, fontWeight: '800', letterSpacing: -1, marginTop: 8 },
  subtitle: { color: theme.colors.muted, fontSize: 12, marginTop: 6 },
  inputWrap: { height: 54, flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 15, backgroundColor: theme.colors.surface, borderRadius: 18, borderWidth: 1, borderColor: theme.colors.border },
  input: { flex: 1, color: theme.colors.text, fontSize: 13, paddingVertical: 0 },
  providers: { flexDirection: 'row', gap: 9, paddingVertical: 15 },
  genreList: { gap: 8, paddingBottom: 13 },
  offline: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 16 },
  offlineText: { color: theme.colors.accent, fontSize: 12 },
  list: { paddingBottom: 20 },
  loadingList: { gap: 9, marginTop: 8 },
  skeleton: { height: 70, backgroundColor: theme.colors.surface, borderRadius: 15 },
});
