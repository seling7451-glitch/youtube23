import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Network from 'expo-network';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { usePlayerStore } from '@/store/player';
import { getDatabase, listPlaylists, readTracks } from '@/services/database';
import { listDownloadedTracks } from '@/services/downloads';
import { PlayerProvider } from '@/providers/PlayerProvider';
import { theme } from '@/theme/theme';
import type { Playlist, Track } from '@/types/music';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 45_000,
      gcTime: 10 * 60_000,
      retry: 1,
      refetchOnWindowFocus: true,
    },
  },
});

export default function RootLayout() {
  const setFavorites = usePlayerStore((state) => state.setFavorites);
  const setHistory = usePlayerStore((state) => state.setHistory);
  const setDownloads = usePlayerStore((state) => state.setDownloads);
  const setPlaylists = usePlayerStore((state) => state.setPlaylists);
  const setNetworkOnline = usePlayerStore((state) => state.setNetworkOnline);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        await getDatabase();
        const [favoriteRows, historyRows, downloads, playlists] = await Promise.all([
          readTracks('favorites'),
          readTracks('history'),
          listDownloadedTracks(),
          listPlaylists(),
        ]);
        if (!active) return;
        const parse = (rows: string[]) => rows.flatMap((row) => {
          try { return [JSON.parse(row) as Track]; } catch { return []; }
        });
        setFavorites(parse(favoriteRows));
        setHistory(parse(historyRows));
        setDownloads(downloads);
        setPlaylists(playlists as Playlist[]);
      } catch (error) {
        console.warn('Kutubxona ma’lumotlari tiklanmadi:', error);
      }
    })();
    return () => { active = false; };
  }, [setDownloads, setFavorites, setHistory, setPlaylists]);

  useEffect(() => {
    let active = true;
    void Network.getNetworkStateAsync().then((state) => {
      if (active) setNetworkOnline(state.isConnected === true && state.isInternetReachable !== false);
    }).catch((error: unknown) => console.warn('Tarmoq holati olinmadi:', error));
    const subscription = Network.addNetworkStateListener((state) => {
      setNetworkOnline(state.isConnected === true && state.isInternetReachable !== false);
    });
    return () => {
      active = false;
      subscription.remove();
    };
  }, [setNetworkOnline]);

  return (
    <QueryClientProvider client={queryClient}>
      <PlayerProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: theme.colors.background },
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="player" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        </Stack>
      </PlayerProvider>
    </QueryClientProvider>
  );
}
