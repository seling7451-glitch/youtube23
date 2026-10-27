import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { EmptyState } from '@/components/Primitives';
import { TrackRow } from '@/components/TrackRow';
import { useMusicPlayer } from '@/providers/PlayerProvider';
import {
  cancelDownload,
  clearAllDownloads,
  downloadSizeBytes,
  pauseDownload,
  removeDownloadedTrack,
  resumeDownload,
} from '@/services/downloads';
import { usePlayerStore } from '@/store/player';
import { theme } from '@/theme/theme';
import { uz } from '@/i18n/uz';
import type { Track } from '@/types/music';

export default function DownloadsScreen() {
  const downloads = usePlayerStore((state) => state.downloads);
  const setDownloads = usePlayerStore((state) => state.setDownloads);
  const networkOnline = usePlayerStore((state) => state.networkOnline);
  const progress = usePlayerStore((state) => state.downloadProgress);
  const downloadSources = usePlayerStore((state) => state.downloadSources);
  const setProgress = usePlayerStore((state) => state.setDownloadProgress);
  const setDownloadSource = usePlayerStore((state) => state.setDownloadSource);
  const [pausedIds, setPausedIds] = useState<string[]>([]);
  const { playTrack } = useMusicPlayer();
  const { data: size = 0 } = useQuery({
    queryKey: ['download-size', downloads.map((track) => track.id)],
    queryFn: async () => {
      try {
        return await downloadSizeBytes();
      } catch (error) {
        console.warn('Yuklamalar hajmi olinmadi:', error);
        throw error;
      }
    },
  });

  const remove = useCallback((track: Track) => {
    Alert.alert('Yuklangan trekni o‘chirish', `“${track.title}” qurilmadan o‘chirilsinmi?`, [
      { text: 'Bekor qilish', style: 'cancel' },
      {
        text: 'O‘chirish',
        style: 'destructive',
        onPress: () => {
          void removeDownloadedTrack(track).then(() => {
            setDownloads(downloads.filter((item) => item.id !== track.id));
          }).catch((error: unknown) => Alert.alert('O‘chirilmadi', String(error)));
        },
      },
    ]);
  }, [downloads, setDownloads]);

  const removeAll = useCallback(() => {
    Alert.alert('Barcha yuklamalarni o‘chirish', 'Yuklangan barcha treklar o‘chiriladi.', [
      { text: 'Bekor qilish', style: 'cancel' },
      {
        text: 'Hammasini o‘chirish',
        style: 'destructive',
        onPress: () => {
          void clearAllDownloads().then(() => {
            setDownloads([]);
          }).catch((error: unknown) => Alert.alert('O‘chirilmadi', String(error)));
        },
      },
    ]);
  }, [setDownloads]);

  const activeIds = Object.keys(progress);
  const handlePause = async (id: string) => {
    try {
      await pauseDownload(id);
      setPausedIds((ids) => [...new Set([...ids, id])]);
    } catch (error) {
      Alert.alert('To‘xtatib bo‘lmadi', String(error));
    }
  };
  const handleResume = async (id: string) => {
    try {
      setPausedIds((ids) => ids.filter((item) => item !== id));
      await resumeDownload(id);
    } catch (error) {
      Alert.alert('Davom ettirib bo‘lmadi', String(error));
    }
  };
  const handleCancel = async (id: string) => {
    try {
      await cancelDownload(id);
      setProgress(id, null);
      setDownloadSource(id, null);
      setPausedIds((ids) => ids.filter((item) => item !== id));
    } catch (error) {
      Alert.alert('Yuklash to‘xtatilmadi', String(error));
    }
  };

  const renderTrack = useCallback(({ item, index }: { item: Track; index: number }) => (
    <TrackRow
      track={item}
      index={index}
      onPress={() => void playTrack(item, downloads)}
      onMore={() => remove(item)}
    />
  ), [downloads, playTrack, remove]);

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.kicker}>INTERNETSIZ HAM TINGLANG</Text>
        <Text style={styles.title}>{uz.downloads}</Text>
        <Text style={styles.subtitle}>Sevimli treklaringiz doim yoningizda.</Text>
      </View>
      <View style={styles.storage}>
        <View style={styles.storageIcon}><Ionicons name="cloud-download" size={20} color={theme.colors.accent} /></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.storageTitle}>{downloads.length} ta trek</Text>
          <Text style={styles.storageCaption}>Ilova xotirasida {formatBytes(size)} joy egallaydi</Text>
        </View>
        {downloads.length ? <Pressable hitSlop={9} onPress={removeAll}><Text style={styles.clear}>Tozalash</Text></Pressable> : null}
      </View>
      {!networkOnline ? (
        <View style={styles.offline}><Ionicons name="cloud-offline-outline" size={15} color={theme.colors.accent} /><Text style={styles.offlineText}>Oflayn rejim · mavjud treklar shu yerda</Text></View>
      ) : null}
      {activeIds.map((id) => {
        const track = downloadSources[id];
        if (!track) return null;
        const fraction = progress[id] ?? 0;
        const paused = pausedIds.includes(id);
        return (
          <View key={id} style={styles.activeDownload}>
            <View style={styles.activeHeading}>
              <Text numberOfLines={1} style={styles.storageTitle}>{track.title}</Text>
              <Text style={styles.storageCaption}>{paused ? 'To‘xtatildi' : `${Math.round(fraction * 100)}%`}</Text>
            </View>
            <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${Math.min(fraction * 100, 100)}%` }]} /></View>
            <View style={styles.downloadActions}>
              <Pressable onPress={() => { void (paused ? handleResume(id) : handlePause(id)); }} style={styles.downloadButton}>
                <Ionicons name={paused ? 'play' : 'pause'} size={15} color={theme.colors.accent} />
                <Text style={styles.downloadButtonText}>{paused ? 'Davom' : 'Pauza'}</Text>
              </Pressable>
              <Pressable onPress={() => { void handleCancel(id); }} style={styles.downloadButton}>
                <Ionicons name="close" size={16} color={theme.colors.danger} />
                <Text style={[styles.downloadButtonText, { color: theme.colors.danger }]}>Bekor qilish</Text>
              </Pressable>
            </View>
          </View>
        );
      })}
      {downloads.length ? (
        <FlashList data={downloads} renderItem={renderTrack} keyExtractor={(item) => item.id} contentContainerStyle={styles.list} />
      ) : (
        <EmptyState
          icon="cloud-download-outline"
          title={uz.emptyDownloads}
          caption="Jamendo yoki shaxsiy audio havolasining amallar menyusidan oflayn saqlang."
        />
      )}
    </View>
  );
}

function formatBytes(bytes: number): string {
  if (!bytes) return '0 MB';
  return bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(0)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background, paddingHorizontal: 20, paddingTop: 23 },
  header: { marginBottom: 21 },
  kicker: { color: theme.colors.accent, fontSize: 9, fontWeight: '800', letterSpacing: 1.8 },
  title: { color: theme.colors.text, fontSize: 29, fontWeight: '800', letterSpacing: -1, marginTop: 7 },
  subtitle: { color: theme.colors.muted, fontSize: 12, marginTop: 6 },
  storage: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, borderRadius: 18, padding: 14 },
  storageIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(69,220,192,0.12)' },
  storageTitle: { color: theme.colors.text, fontSize: 13, fontWeight: '700' },
  storageCaption: { color: theme.colors.muted, fontSize: 10, marginTop: 5 },
  clear: { color: theme.colors.danger, fontSize: 11, fontWeight: '700' },
  offline: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 16 },
  offlineText: { color: theme.colors.accent, fontSize: 11 },
  list: { paddingTop: 10, paddingBottom: 20 },
  activeDownload: { marginTop: 12, padding: 13, borderRadius: 16, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, gap: 9 },
  activeHeading: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  progressTrack: { height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.12)', overflow: 'hidden' },
  progressFill: { height: 4, borderRadius: 2, backgroundColor: theme.colors.accent },
  downloadActions: { flexDirection: 'row', gap: 20 },
  downloadButton: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 2 },
  downloadButtonText: { color: theme.colors.accent, fontSize: 11, fontWeight: '700' },
});
