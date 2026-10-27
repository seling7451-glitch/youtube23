import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { EmptyState, Pill } from '@/components/Primitives';
import { TrackRow } from '@/components/TrackRow';
import { useTrackActions } from '@/components/TrackActions';
import { useMusicPlayer } from '@/providers/PlayerProvider';
import { scanLocalAudio } from '@/services/localLibrary';
import { removePlaylist, savePlaylist } from '@/services/database';
import { usePlayerStore } from '@/store/player';
import { theme } from '@/theme/theme';
import { uz } from '@/i18n/uz';
import type { Playlist, Track } from '@/types/music';

type Tab = 'liked' | 'history' | 'local' | 'playlists';

export default function LibraryScreen() {
  const [tab, setTab] = useState<Tab>('liked');
  const [linkOpen, setLinkOpen] = useState(false);
  const [playlistOpen, setPlaylistOpen] = useState(false);
  const [editPlaylistId, setEditPlaylistId] = useState<string | null>(null);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [linkTitle, setLinkTitle] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [playlistName, setPlaylistName] = useState('');
  const [editPlaylistName, setEditPlaylistName] = useState('');
  const [scanning, setScanning] = useState(false);
  const favorites = usePlayerStore((state) => state.favorites);
  const history = usePlayerStore((state) => state.history);
  const localTracks = usePlayerStore((state) => state.localTracks);
  const playlists = usePlayerStore((state) => state.playlists);
  const downloads = usePlayerStore((state) => state.downloads);
  const setLocalTracks = usePlayerStore((state) => state.setLocalTracks);
  const setPlaylists = usePlayerStore((state) => state.setPlaylists);
  const { playTrack } = useMusicPlayer();
  const trackActions = useTrackActions();
  const selectedPlaylist = playlists.find((item) => item.id === selectedPlaylistId);
  const allTracks = [...favorites, ...history, ...localTracks, ...downloads]
    .filter((track, index, list) => list.findIndex((item) => item.id === track.id) === index);
  const playlistTracks = selectedPlaylist
    ? selectedPlaylist.trackIds.flatMap((id) => {
      const track = allTracks.find((item) => item.id === id);
      return track ? [track] : [];
    })
    : [];
  const tracks = useMemo(
    () => tab === 'liked' ? favorites : tab === 'history' ? history : tab === 'local' ? localTracks : [],
    [favorites, history, localTracks, tab],
  );

  const scan = useCallback(async () => {
    setScanning(true);
    try {
      const result = await scanLocalAudio();
      setLocalTracks(result);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      Alert.alert('Ruxsat kerak', error instanceof Error ? error.message : uz.permissionDenied);
    } finally {
      setScanning(false);
    }
  }, [setLocalTracks]);

  const saveLink = useCallback(() => {
    let parsed: URL;
    try {
      parsed = new URL(linkUrl);
    } catch {
      Alert.alert('Havola noto‘g‘ri', 'Audio uchun to‘g‘ridan-to‘g‘ri http(s) yoki file havolasini kiriting.');
      return;
    }
    if (!['https:', 'http:', 'file:'].includes(parsed.protocol)) {
      Alert.alert('Havola noto‘g‘ri', 'Audio uchun to‘g‘ridan-to‘g‘ri http(s) yoki file havolasini kiriting.');
      return;
    }
    const track: Track = {
      id: `link:${encodeURIComponent(parsed.href)}`,
      title: linkTitle.trim() || parsed.pathname.split('/').pop() || 'Audio havola',
      artist: 'Shaxsiy audio',
      artwork: null,
      streamUrl: parsed.href,
      duration: 0,
      source: 'link',
      downloadUrl: parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.href : undefined,
      localUri: parsed.protocol === 'file:' ? parsed.href : undefined,
    };
    void playTrack(track);
    setLinkOpen(false);
    setLinkTitle('');
    setLinkUrl('');
  }, [linkTitle, linkUrl, playTrack]);

  const createPlaylist = useCallback(() => {
    const name = playlistName.trim();
    if (!name) return;
    const playlist: Playlist = { id: `playlist:${Date.now()}`, name, trackIds: [], createdAt: Date.now() };
    const next = [playlist, ...playlists];
    setPlaylists(next);
    void savePlaylist(playlist).catch((error: unknown) => Alert.alert('Saqlanmadi', String(error)));
    setPlaylistOpen(false);
    setPlaylistName('');
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [playlistName, playlists, setPlaylists]);

  const removePlaylistById = (id: string) => {
    Alert.alert('Pleylistni o‘chirish', 'Ushbu pleylist butunlay o‘chirilsinmi?', [
      { text: 'Bekor qilish', style: 'cancel' },
      {
        text: 'O‘chirish',
        style: 'destructive',
        onPress: () => {
          setPlaylists(playlists.filter((item) => item.id !== id));
          void removePlaylist(id).catch((error: unknown) => Alert.alert('O‘chirilmadi', String(error)));
        },
      },
    ]);
  };

  const openEditPlaylist = (playlist: Playlist) => {
    setEditPlaylistId(playlist.id);
    setEditPlaylistName(playlist.name);
  };
  const saveEditedPlaylist = () => {
    const name = editPlaylistName.trim();
    if (!name || !editPlaylistId) return;
    const updated = playlists.map((item) => item.id === editPlaylistId ? { ...item, name } : item);
    setPlaylists(updated);
    const playlist = updated.find((item) => item.id === editPlaylistId);
    if (playlist) void savePlaylist(playlist).catch((error: unknown) => Alert.alert('Saqlanmadi', String(error)));
    setEditPlaylistId(null);
  };

  const removePlaylistTrack = (track: Track) => {
    if (!selectedPlaylist) return;
    const updated = { ...selectedPlaylist, trackIds: selectedPlaylist.trackIds.filter((id) => id !== track.id) };
    const next = playlists.map((item) => item.id === updated.id ? updated : item);
    setPlaylists(next);
    void savePlaylist(updated).catch((error: unknown) => Alert.alert('Saqlanmadi', String(error)));
  };

  const renderTrack = useCallback(({ item, index }: { item: Track; index: number }) => (
    <TrackRow
      track={item}
      index={index}
      onPress={() => void playTrack(item, tracks)}
      onMore={() => trackActions(item)}
    />
  ), [playTrack, trackActions, tracks]);

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.kicker}>SIZNING MUSIQALARINGIZ</Text>
        <Text style={styles.title}>{uz.library}</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
        <Pill label={uz.liked} selected={tab === 'liked'} onPress={() => setTab('liked')} />
        <Pill label={uz.history} selected={tab === 'history'} onPress={() => setTab('history')} />
        <Pill label={uz.local} selected={tab === 'local'} onPress={() => setTab('local')} />
        <Pill label={uz.playlists} selected={tab === 'playlists'} onPress={() => setTab('playlists')} />
      </ScrollView>

      <View style={styles.actions}>
        <Pressable onPress={() => setLinkOpen(true)} style={styles.actionCard}>
          <Ionicons name="link" size={19} color={theme.colors.accent} />
          <View style={styles.actionText}><Text style={styles.actionTitle}>{uz.addLink}</Text><Text style={styles.actionCaption}>{uz.addLinkCaption}</Text></View>
          <Ionicons name="add-circle-outline" size={21} color={theme.colors.muted} />
        </Pressable>
        {tab === 'playlists' ? (
          <Pressable onPress={() => setPlaylistOpen(true)} style={styles.newPlaylist}>
            <Ionicons name="add" size={18} color={theme.colors.background} /><Text style={styles.newPlaylistText}>Yangi pleylist</Text>
          </Pressable>
        ) : null}
      </View>

      {tab === 'playlists' ? (
        selectedPlaylist ? (
          <View style={{ flex: 1 }}>
            <Pressable onPress={() => setSelectedPlaylistId(null)} style={styles.backToPlaylists}>
              <Ionicons name="arrow-back" size={17} color={theme.colors.accent} />
              <Text style={styles.backToPlaylistsText}>{selectedPlaylist.name}</Text>
            </Pressable>
            {playlistTracks.length ? (
              <FlashList
                data={playlistTracks}
                renderItem={({ item, index }) => (
                  <TrackRow
                    track={item}
                    index={index}
                    onPress={() => void playTrack(item, playlistTracks)}
                    onMore={() => removePlaylistTrack(item)}
                  />
                )}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.list}
              />
            ) : (
              <EmptyState icon="musical-notes-outline" title="Pleylist bo‘sh" caption="Boshqa trek menyusidan ushbu pleylistga qo‘shing." />
            )}
          </View>
        ) : playlists.length ? (
          <ScrollView contentContainerStyle={styles.playlists}>
            {playlists.map((playlist) => (
              <Pressable key={playlist.id} onPress={() => setSelectedPlaylistId(playlist.id)} onLongPress={() => removePlaylistById(playlist.id)} style={styles.playlistRow}>
                <View style={styles.playlistIcon}><Ionicons name="musical-notes" color={theme.colors.accent} size={22} /></View>
                <View style={{ flex: 1 }}><Text style={styles.actionTitle}>{playlist.name}</Text><Text style={styles.actionCaption}>{playlist.trackIds.length} ta trek · Bosib turing — o‘chirish</Text></View>
                <Pressable onPress={() => openEditPlaylist(playlist)} hitSlop={8} style={{ padding: 8 }}><Ionicons name="pencil-outline" size={17} color={theme.colors.muted} /></Pressable>
                <Ionicons name="chevron-forward" size={16} color={theme.colors.muted} />
              </Pressable>
            ))}
          </ScrollView>
        ) : <EmptyState icon="albums-outline" title="Pleylist yarating" caption="Trek menyusidan navbatga qo‘shib, o‘zingizning to‘plamingizni tuzing." />
      ) : tab === 'local' && localTracks.length === 0 ? (
        <EmptyState icon="phone-portrait-outline" title="Telefondagi musiqani toping" caption="Audio fayllaringizni skaner qilish uchun ruxsat bering." action={scanning ? 'Skanerlanmoqda…' : 'Musiqalarni skanerlash'} onAction={() => { void scan(); }} />
      ) : tracks.length ? (
        <FlashList data={tracks} renderItem={renderTrack} keyExtractor={(item) => item.id} contentContainerStyle={styles.list} />
      ) : (
        <EmptyState icon={tab === 'liked' ? 'heart-outline' : 'time-outline'} title={tab === 'liked' ? uz.emptyLibrary : 'Tarix hozircha bo‘sh'} caption={tab === 'liked' ? 'Trek yonidagi amallar menyusidan sevimlilarga qo‘shing.' : 'Tinglagan treklaringiz shu yerda saqlanadi.'} />
      )}

      <EntryModal
        visible={linkOpen}
        title="O‘zingizning audiongiz"
        confirm="Navbatga qo‘shish"
        onClose={() => setLinkOpen(false)}
        onSave={saveLink}
      >
        <TextInput value={linkTitle} onChangeText={setLinkTitle} placeholder="Trek nomi (ixtiyoriy)" placeholderTextColor={theme.colors.muted} style={styles.modalInput} />
        <TextInput value={linkUrl} onChangeText={setLinkUrl} placeholder="https://server.uz/audio.mp3" placeholderTextColor={theme.colors.muted} autoCapitalize="none" keyboardType="url" style={styles.modalInput} />
      </EntryModal>

      <EntryModal
        visible={playlistOpen}
        title="Yangi pleylist"
        confirm="Yaratish"
        onClose={() => setPlaylistOpen(false)}
        onSave={createPlaylist}
      >
        <TextInput value={playlistName} onChangeText={setPlaylistName} placeholder="Pleylist nomi" placeholderTextColor={theme.colors.muted} style={styles.modalInput} />
      </EntryModal>

      <EntryModal
        visible={editPlaylistId !== null}
        title="Pleylist nomini tahrirlash"
        confirm="Saqlash"
        onClose={() => setEditPlaylistId(null)}
        onSave={saveEditedPlaylist}
      >
        <TextInput value={editPlaylistName} onChangeText={setEditPlaylistName} placeholder="Pleylist nomi" placeholderTextColor={theme.colors.muted} style={styles.modalInput} />
      </EntryModal>
    </View>
  );
}

function EntryModal({ visible, title, confirm, onClose, onSave, children }: {
  visible: boolean;
  title: string;
  confirm: string;
  onClose: () => void;
  onSave: () => void;
  children: React.ReactNode;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalShade}>
        <View style={styles.modal}>
          <Text style={styles.modalTitle}>{title}</Text>
          {children}
          <View style={styles.modalButtons}>
            <Pressable onPress={onClose} style={styles.modalCancel}><Text style={styles.actionCaption}>{uz.cancel}</Text></Pressable>
            <Pressable onPress={onSave} style={styles.modalConfirm}><Text style={styles.confirmText}>{confirm}</Text></Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background, paddingHorizontal: 20, paddingTop: 23 },
  header: { marginBottom: 18 },
  kicker: { color: theme.colors.accent, fontSize: 9, fontWeight: '800', letterSpacing: 1.8 },
  title: { color: theme.colors.text, fontSize: 29, fontWeight: '800', letterSpacing: -1, marginTop: 7 },
  tabs: { gap: 8, paddingBottom: 15 },
  actions: { gap: 9, marginBottom: 11 },
  actionCard: { flexDirection: 'row', alignItems: 'center', gap: 11, minHeight: 65, padding: 12, borderRadius: 17, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border },
  actionText: { flex: 1, gap: 4 },
  actionTitle: { color: theme.colors.text, fontSize: 13, fontWeight: '700' },
  actionCaption: { color: theme.colors.muted, fontSize: 11 },
  newPlaylist: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 7, backgroundColor: theme.colors.accent, borderRadius: 13, padding: 12 },
  newPlaylistText: { color: theme.colors.background, fontWeight: '700', fontSize: 12 },
  list: { paddingBottom: 20 },
  backToPlaylists: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 9 },
  backToPlaylistsText: { color: theme.colors.text, fontSize: 14, fontWeight: '700' },
  playlists: { gap: 10, paddingVertical: 4 },
  playlistRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 68, padding: 10, backgroundColor: theme.colors.surface, borderRadius: 16, borderWidth: 1, borderColor: theme.colors.border },
  playlistIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(69,220,192,0.12)' },
  modalShade: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', paddingHorizontal: 22 },
  modal: { padding: 20, borderRadius: 22, backgroundColor: theme.colors.surfaceRaised, gap: 12 },
  modalTitle: { color: theme.colors.text, fontSize: 19, fontWeight: '800', marginBottom: 4 },
  modalInput: { minHeight: 49, borderRadius: 13, paddingHorizontal: 13, color: theme.colors.text, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, fontSize: 12 },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 10, marginTop: 6 },
  modalCancel: { padding: 11 },
  modalConfirm: { backgroundColor: theme.colors.accent, paddingVertical: 11, paddingHorizontal: 15, borderRadius: 12 },
  confirmText: { color: theme.colors.background, fontSize: 12, fontWeight: '800' },
});
