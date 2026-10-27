import { create } from 'zustand';
import type { Playlist, Track } from '@/types/music';

type PlayerState = {
  current: Track | null;
  queue: Track[];
  favorites: Track[];
  downloads: Track[];
  localTracks: Track[];
  history: Track[];
  playlists: Playlist[];
  playing: boolean;
  position: number;
  duration: number;
  shuffle: boolean;
  repeat: 'off' | 'one' | 'all';
  networkOnline: boolean;
  downloadProgress: Record<string, number>;
  downloadSources: Record<string, Track>;
  setCurrent: (track: Track | null) => void;
  setQueue: (tracks: Track[]) => void;
  setPlaying: (playing: boolean) => void;
  setPosition: (position: number, duration: number) => void;
  setNetworkOnline: (online: boolean) => void;
  setDownloadProgress: (id: string, value: number | null) => void;
  setDownloadSource: (id: string, track: Track | null) => void;
  setLocalTracks: (tracks: Track[]) => void;
  setDownloads: (tracks: Track[]) => void;
  setFavorites: (tracks: Track[]) => void;
  setHistory: (tracks: Track[]) => void;
  setPlaylists: (playlists: Playlist[]) => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  toggleFavorite: (track: Track) => boolean;
  pushHistory: (track: Track) => void;
  enqueue: (track: Track) => void;
};

export const usePlayerStore = create<PlayerState>((set, get) => ({
  current: null,
  queue: [],
  favorites: [],
  downloads: [],
  localTracks: [],
  history: [],
  playlists: [],
  playing: false,
  position: 0,
  duration: 0,
  shuffle: false,
  repeat: 'off',
  networkOnline: true,
  downloadProgress: {},
  downloadSources: {},
  setCurrent: (current) => set({ current, position: 0 }),
  setQueue: (queue) => set({ queue }),
  setPlaying: (playing) => set({ playing }),
  setPosition: (position, duration) => set({ position, duration }),
  setNetworkOnline: (networkOnline) => set({ networkOnline }),
  setDownloadProgress: (id, value) =>
    set((state) => {
      const progress = { ...state.downloadProgress };
      if (value === null) delete progress[id];
      else progress[id] = value;
      return { downloadProgress: progress };
    }),
  setDownloadSource: (id, track) =>
    set((state) => {
      const sources = { ...state.downloadSources };
      if (track === null) delete sources[id];
      else sources[id] = track;
      return { downloadSources: sources };
    }),
  setLocalTracks: (localTracks) => set({ localTracks }),
  setDownloads: (downloads) => set({ downloads }),
  setFavorites: (favorites) => set({ favorites }),
  setHistory: (history) => set({ history }),
  setPlaylists: (playlists) => set({ playlists }),
  toggleShuffle: () => set((state) => ({ shuffle: !state.shuffle })),
  cycleRepeat: () =>
    set((state) => ({
      repeat: state.repeat === 'off' ? 'all' : state.repeat === 'all' ? 'one' : 'off',
    })),
  toggleFavorite: (track) => {
    const liked = get().favorites.some((item) => item.id === track.id);
    set((state) => ({
      favorites: liked
        ? state.favorites.filter((item) => item.id !== track.id)
        : [track, ...state.favorites],
    }));
    return !liked;
  },
  pushHistory: (track) =>
    set((state) => ({
      history: [track, ...state.history.filter((item) => item.id !== track.id)].slice(0, 100),
    })),
  enqueue: (track) => set((state) => ({ queue: [...state.queue, track] })),
}));
