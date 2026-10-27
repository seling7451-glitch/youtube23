import { Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import { usePlayerStore } from '@/store/player';
import { deleteTrack, savePlaylist, saveTrack } from '@/services/database';
import { downloadTrack } from '@/services/downloads';
import type { Track } from '@/types/music';
import { useMusicPlayer } from '@/providers/PlayerProvider';

export function useTrackActions() {
  const toggleFavorite = usePlayerStore((state) => state.toggleFavorite);
  const favorites = usePlayerStore((state) => state.favorites);
  const playlists = usePlayerStore((state) => state.playlists);
  const { addToQueue } = useMusicPlayer();

  return (track: Track) => {
    const liked = favorites.some((item) => item.id === track.id);
    const store = usePlayerStore.getState();
    Alert.alert(track.title, track.artist, [
      {
        text: liked ? 'Sevimlilardan olib tashlash' : 'Sevimlilarga qo‘shish',
        onPress: () => {
          const isFavorite = toggleFavorite(track);
          const operation = isFavorite
            ? saveTrack('favorites', track.id, track)
            : deleteTrack('favorites', track.id);
          void operation.catch((error: unknown) => Alert.alert('Saqlanmadi', String(error)));
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        },
      },
      {
        text: 'Navbatga qo‘shish',
        onPress: () => {
          addToQueue(track);
          void Haptics.selectionAsync();
        },
      },
      ...(playlists.length ? [{
        text: 'Pleylistga qo‘shish',
        onPress: () => Alert.alert('Pleylist tanlang', undefined, [
          ...playlists.map((playlist) => ({
            text: playlist.name,
            onPress: () => {
              const updated = { ...playlist, trackIds: [...new Set([...playlist.trackIds, track.id])] };
              const next = usePlayerStore.getState().playlists.map((item) => item.id === updated.id ? updated : item);
              usePlayerStore.getState().setPlaylists(next);
              void savePlaylist(updated).catch((error: unknown) => Alert.alert('Saqlanmadi', String(error)));
            },
          })),
          { text: 'Bekor qilish', style: 'cancel' as const },
        ]),
      }] : []),
      ...((track.source === 'link' && Boolean(track.downloadUrl)) || (track.source === 'jamendo' && Boolean(track.downloadUrl))
        ? [{
          text: 'Oflayn yuklab olish',
          onPress: () => {
            store.setDownloadSource(track.id, track);
            store.setDownloadProgress(track.id, 0);
            void downloadTrack(track, ({ fraction }) => {
              usePlayerStore.getState().setDownloadProgress(track.id, fraction);
            }).then((saved) => {
              const current = usePlayerStore.getState().downloads;
              usePlayerStore.getState().setDownloads([saved, ...current.filter((item) => item.id !== saved.id)]);
              usePlayerStore.getState().setDownloadProgress(track.id, null);
              usePlayerStore.getState().setDownloadSource(track.id, null);
              void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }).catch((error: unknown) => {
              usePlayerStore.getState().setDownloadProgress(track.id, null);
              usePlayerStore.getState().setDownloadSource(track.id, null);
              Alert.alert('Yuklab bo‘lmadi', error instanceof Error ? error.message : String(error));
            });
          },
        }]
        : []),
      { text: 'Yopish', style: 'cancel' },
    ]);
  };
}
