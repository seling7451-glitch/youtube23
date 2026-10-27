import * as FileSystem from 'expo-file-system/legacy';
import type { Track } from '@/types/music';
import { getDatabase, saveTrack } from './database';

export type DownloadProgress = { fraction: number; bytesWritten: number; totalBytes: number };
export type DownloadHandle = {
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  cancel: () => Promise<void>;
};

const activeDownloads = new Map<string, FileSystem.DownloadResumable>();

function safeFileName(track: Track): string {
  const extension = track.source === 'jamendo'
    ? '.mp3'
    : new URL(track.downloadUrl ?? track.streamUrl).pathname.match(/\.(mp3|m4a|aac|wav|ogg|flac)$/i)?.[0] ?? '.mp3';
  const base = `${track.artist}-${track.title}`
    .normalize('NFKD')
    .replace(/[^\w.-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 100);
  return `${base || track.id.replace(':', '-')}${extension}`;
}

export async function downloadTrack(
  track: Track,
  onProgress: (progress: DownloadProgress) => void,
): Promise<Track> {
  const sourceUrl = track.downloadUrl ?? (track.source === 'link' ? track.streamUrl : null);
  if (!sourceUrl || (track.source !== 'jamendo' && track.source !== 'link')) {
    throw new Error('Ushbu trekni oflayn saqlashga manba ruxsat bermaydi.');
  }
  const db = await getDatabase();
  const root = `${FileSystem.documentDirectory}music/`;
  await FileSystem.makeDirectoryAsync(root, { intermediates: true });
  const destination = `${root}${safeFileName(track)}`;

  const task = FileSystem.createDownloadResumable(
    sourceUrl,
    destination,
    {},
    ({ totalBytesWritten, totalBytesExpectedToWrite }) => {
      onProgress({
        bytesWritten: totalBytesWritten,
        totalBytes: totalBytesExpectedToWrite,
        fraction: totalBytesExpectedToWrite > 0 ? totalBytesWritten / totalBytesExpectedToWrite : 0,
      });
    },
  );
  activeDownloads.set(track.id, task);
  try {
    const result = await task.downloadAsync();
    if (!result?.uri) throw new Error('Faylni yuklab olish yakunlanmadi.');
    const info = await FileSystem.getInfoAsync(result.uri);
    const saved: Track = { ...track, localUri: result.uri, streamUrl: result.uri };
    await db.runAsync(
      'INSERT OR REPLACE INTO downloads (id, track_json, local_uri, size) VALUES (?, ?, ?, ?)',
      saved.id,
      JSON.stringify(saved),
      result.uri,
      info.exists ? info.size ?? 0 : 0,
    );
    return saved;
  } finally {
    activeDownloads.delete(track.id);
  }
}

export async function pauseDownload(id: string): Promise<void> {
  await activeDownloads.get(id)?.pauseAsync();
}

export async function resumeDownload(id: string): Promise<void> {
  const task = activeDownloads.get(id);
  if (task) await task.resumeAsync();
}

export async function cancelDownload(id: string): Promise<void> {
  const task = activeDownloads.get(id);
  if (task) {
    await task.pauseAsync();
    await task.cancelAsync();
    activeDownloads.delete(id);
  }
}

export async function removeDownloadedTrack(track: Track): Promise<void> {
  if (track.localUri?.startsWith(FileSystem.documentDirectory ?? '')) {
    await FileSystem.deleteAsync(track.localUri, { idempotent: true });
  }
  const db = await getDatabase();
  await db.runAsync('DELETE FROM downloads WHERE id = ?', track.id);
}

export async function listDownloadedTracks(): Promise<Track[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ track_json: string }>(
    'SELECT track_json FROM downloads ORDER BY rowid DESC',
  );
  return rows.flatMap((row) => {
    try {
      return [JSON.parse(row.track_json) as Track];
    } catch {
      return [];
    }
  });
}

export async function downloadSizeBytes(): Promise<number> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ total: number | null }>('SELECT SUM(size) AS total FROM downloads');
  return row?.total ?? 0;
}

export async function clearAllDownloads(): Promise<void> {
  const tracks = await listDownloadedTracks();
  await Promise.all(tracks.map(removeDownloadedTrack));
}

export async function rememberDownload(track: Track): Promise<void> {
  await saveTrack('downloads', track.id, track);
}
