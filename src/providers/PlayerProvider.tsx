import { preload, requestNotificationPermissionsAsync, useAudioPlaylistStatus, setAudioModeAsync } from 'expo-audio';
import { useRouter } from 'expo-router';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef } from 'react';
import type { ReactNode } from 'react';
import { Alert, Platform } from 'react-native';
import { saveTrack } from '@/services/database';
import { audioPlaylist } from '@/services/audioPlaylist';
import type { Track } from '@/types/music';
import { usePlayerStore } from '@/store/player';

type PlayerContextValue = {
  playTrack: (track: Track, queue?: Track[]) => Promise<void>;
  addToQueue: (track: Track) => void;
  togglePlayback: () => void;
  next: () => void;
  previous: () => void;
  seek: (seconds: number) => void;
  openPlayer: () => void;
};

const PlayerContext = createContext<PlayerContextValue | null>(null);

function sourceFor(track: Track) {
  return { uri: track.localUri ?? track.streamUrl, name: `${track.title} — ${track.artist}` };
}

export function PlayerProvider({ children }: { children: ReactNode }) {
  const status = useAudioPlaylistStatus(audioPlaylist);
  const router = useRouter();
  const repeat = usePlayerStore((state) => state.repeat);
  const setCurrent = usePlayerStore((state) => state.setCurrent);
  const setQueue = usePlayerStore((state) => state.setQueue);
  const setPlaying = usePlayerStore((state) => state.setPlaying);
  const setPosition = usePlayerStore((state) => state.setPosition);
  const pushHistory = usePlayerStore((state) => state.pushHistory);
  const tracksRef = useRef<Track[]>([]);
  const syncGuard = useRef(false);

  const updateMetadata = useCallback((track: Track) => {
    audioPlaylist.updateLockScreenMetadata({
      title: track.title,
      artist: track.artist,
      albumTitle: 'Navo Music',
      artworkUrl: track.artwork ?? undefined,
    });
  }, []);

  const playTrack = useCallback(async (track: Track, nextTracks: Track[] = []) => {
    try {
      await setAudioModeAsync({
        playsInSilentMode: true,
        shouldPlayInBackground: true,
        interruptionMode: 'doNotMix',
      });
      const state = usePlayerStore.getState();
      const uniqueQueue = nextTracks.filter((item) => item.id !== track.id);
      if (state.shuffle) uniqueQueue.sort(() => Math.random() - 0.5);
      tracksRef.current = [track, ...uniqueQueue];
      audioPlaylist.clear();
      for (const item of tracksRef.current) audioPlaylist.add(sourceFor(item));
      audioPlaylist.skipTo(0);
      audioPlaylist.loop = usePlayerStore.getState().repeat === 'all'
        ? 'all'
        : usePlayerStore.getState().repeat === 'one' ? 'single' : 'none';
      setCurrent(track);
      setQueue(uniqueQueue);
      pushHistory(track);
      void saveTrack('history', track.id, track).catch((error: unknown) => {
        console.warn('Tinglash tarixi saqlanmadi:', error);
      });
      audioPlaylist.setActiveForLockScreen(true, {
        title: track.title,
        artist: track.artist,
        albumTitle: 'Navo Music',
        artworkUrl: track.artwork ?? undefined,
      }, {
        showNextTrack: uniqueQueue.length > 0,
        showPreviousTrack: true,
      });
      audioPlaylist.play();
      setPlaying(true);
      const nextTrack = uniqueQueue[0];
      if (nextTrack) {
        void preload(sourceFor(nextTrack), { preferredForwardBufferDuration: 10 }).catch((error: unknown) => {
          console.info('Keyingi trekni oldindan yuklab bo‘lmadi:', error);
        });
      }
    } catch (error) {
      setPlaying(false);
      Alert.alert('Ijro boshlanmadi', error instanceof Error ? error.message : 'Trekni ochib bo‘lmadi.');
    }
  }, [pushHistory, setCurrent, setPlaying, setQueue]);

  const addToQueue = useCallback((track: Track) => {
    const currentIndex = audioPlaylist.currentIndex;
    const upcoming = tracksRef.current.slice(currentIndex + 1);
    if (upcoming.some((item) => item.id === track.id)) return;
    if (audioPlaylist.trackCount === 0) {
      usePlayerStore.getState().enqueue(track);
      return;
    }
    tracksRef.current = [...tracksRef.current, track];
    audioPlaylist.add(sourceFor(track));
    setQueue([...upcoming, track]);
  }, [setQueue]);

  const next = useCallback(() => {
    if (audioPlaylist.trackCount > 1 && audioPlaylist.currentIndex < audioPlaylist.trackCount - 1) {
      audioPlaylist.next();
    } else if (repeat === 'all' && audioPlaylist.trackCount > 0) {
      audioPlaylist.skipTo(0);
    }
  }, [repeat]);

  const previous = useCallback(() => {
    if (status.currentTime > 3) {
      void audioPlaylist.seekTo(0);
    } else if (audioPlaylist.currentIndex > 0) {
      audioPlaylist.previous();
    } else {
      void audioPlaylist.seekTo(0);
    }
  }, [status.currentTime]);

  const togglePlayback = useCallback(() => {
    if (status.playing) {
      audioPlaylist.pause();
      setPlaying(false);
    } else {
      audioPlaylist.play();
      setPlaying(true);
    }
  }, [setPlaying, status.playing]);

  const seek = useCallback((seconds: number) => {
    void audioPlaylist.seekTo(seconds);
  }, []);

  const openPlayer = useCallback(() => router.push('/player'), [router]);

  useEffect(() => {
    void setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'doNotMix',
    });
    if (Platform.OS === 'android') {
      void requestNotificationPermissionsAsync().catch((error: unknown) => {
        console.warn('Bildirishnoma ruxsati so‘ralmadi:', error);
      });
    }
  }, []);

  useEffect(() => {
    setPlaying(status.playing);
    setPosition(status.currentTime, status.duration);
  }, [setPlaying, setPosition, status]);

  useEffect(() => {
    const subscription = audioPlaylist.addListener('trackChanged', ({ currentIndex }) => {
      const track = tracksRef.current[currentIndex];
      if (!track) return;
      syncGuard.current = true;
      setCurrent(track);
      setQueue(tracksRef.current.slice(currentIndex + 1));
      pushHistory(track);
      updateMetadata(track);
      void saveTrack('history', track.id, track).catch((error: unknown) => {
        console.warn('Tinglash tarixi saqlanmadi:', error);
      });
      setTimeout(() => { syncGuard.current = false; }, 250);
    });
    return () => subscription.remove();
  }, [pushHistory, setCurrent, setQueue, updateMetadata]);

  useEffect(() => {
    audioPlaylist.loop = repeat === 'all' ? 'all' : repeat === 'one' ? 'single' : 'none';
  }, [repeat]);

  useEffect(() => {
    const subscription = audioPlaylist.addListener('playlistStatusUpdate', (value) => {
      if (syncGuard.current || !value.didJustFinish || tracksRef.current.length === 0) return;
      if (value.currentIndex >= tracksRef.current.length - 1 && repeat !== 'all') {
        setPlaying(false);
      }
    });
    return () => subscription.remove();
  }, [repeat, setPlaying]);

  useEffect(() => {
    if (status.trackCount === 0 || status.isLoaded) return;
    const index = status.currentIndex;
    const timeout = setTimeout(() => {
      if (audioPlaylist.currentIndex !== index || audioPlaylist.isLoaded) return;
      const failedTrack = tracksRef.current[index];
      if (failedTrack) {
        Alert.alert('Trek ochilmadi', `“${failedTrack.title}” mavjud emas yoki tarmoqdan yuklanmadi. Keyingi trekka o‘tiladi.`);
      }
      if (index < audioPlaylist.trackCount - 1) {
        audioPlaylist.next();
      } else {
        audioPlaylist.pause();
        setPlaying(false);
      }
    }, 20_000);
    return () => clearTimeout(timeout);
  }, [setPlaying, status.currentIndex, status.isLoaded, status.trackCount]);

  const value = useMemo(
    () => ({ playTrack, addToQueue, togglePlayback, next, previous, seek, openPlayer }),
    [addToQueue, next, openPlayer, playTrack, previous, seek, togglePlayback],
  );
  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function useMusicPlayer(): PlayerContextValue {
  const context = useContext(PlayerContext);
  if (!context) throw new Error('useMusicPlayer PlayerProvider ichida ishlatilishi kerak.');
  return context;
}

export function useSleepTimer() {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { togglePlayback } = useMusicPlayer();
  const start = useCallback((minutes: number) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(togglePlayback, minutes * 60_000);
  }, [togglePlayback]);
  const cancel = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }, []);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);
  return { start, cancel };
}
