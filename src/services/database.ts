import * as SQLite from 'expo-sqlite';

let database: SQLite.SQLiteDatabase | null = null;
let opening: Promise<SQLite.SQLiteDatabase> | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (database) return database;
  opening ??= SQLite.openDatabaseAsync('navo-music.db');
  database = await opening;
  await database.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS favorites (id TEXT PRIMARY KEY, track_json TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS downloads (id TEXT PRIMARY KEY, track_json TEXT NOT NULL, local_uri TEXT NOT NULL, size INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS history (id TEXT PRIMARY KEY, track_json TEXT NOT NULL, played_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS playlists (id TEXT PRIMARY KEY, name TEXT NOT NULL, track_ids TEXT NOT NULL, created_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS query_cache (cache_key TEXT PRIMARY KEY, payload TEXT NOT NULL, saved_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
  `);
  return database;
}

export async function readTracks(table: 'favorites' | 'downloads' | 'history'): Promise<string[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ track_json: string }>(
    `SELECT track_json FROM ${table} ORDER BY ${table === 'history' ? 'played_at DESC' : 'rowid DESC'}`,
  );
  return rows.map((row) => row.track_json);
}

export async function saveTrack(table: 'favorites' | 'downloads' | 'history', id: string, track: unknown): Promise<void> {
  const db = await getDatabase();
  if (table === 'history') {
    await db.runAsync(
      'INSERT INTO history (id, track_json, played_at) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET track_json = excluded.track_json, played_at = excluded.played_at',
      id,
      JSON.stringify(track),
      Date.now(),
    );
    await db.runAsync('DELETE FROM history WHERE id NOT IN (SELECT id FROM history ORDER BY played_at DESC LIMIT 100)');
    return;
  }
  if (table === 'downloads') {
    const row = track as { localUri?: string; localSize?: number };
    await db.runAsync(
      'INSERT OR REPLACE INTO downloads (id, track_json, local_uri, size) VALUES (?, ?, ?, ?)',
      id,
      JSON.stringify(track),
      row.localUri ?? '',
      row.localSize ?? 0,
    );
    return;
  }
  await db.runAsync('INSERT OR REPLACE INTO favorites (id, track_json) VALUES (?, ?)', id, JSON.stringify(track));
}

export async function deleteTrack(table: 'favorites' | 'downloads' | 'history', id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(`DELETE FROM ${table} WHERE id = ?`, id);
}

export async function cacheValue<T>(key: string, payload: T): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'INSERT OR REPLACE INTO query_cache (cache_key, payload, saved_at) VALUES (?, ?, ?)',
    key,
    JSON.stringify(payload),
    Date.now(),
  );
}

export async function readCache<T>(key: string): Promise<T | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ payload: string }>(
    'SELECT payload FROM query_cache WHERE cache_key = ?',
    key,
  );
  if (!row) return null;
  try {
    return JSON.parse(row.payload) as T;
  } catch {
    return null;
  }
}

export async function saveSetting(key: string, value: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', key, value);
}

export async function readSetting(key: string): Promise<string | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key = ?', key);
  return row?.value ?? null;
}

export async function getDownloadBytes(): Promise<number> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ total: number | null }>('SELECT SUM(size) AS total FROM downloads');
  return row?.total ?? 0;
}

export async function listPlaylists(): Promise<{
  id: string;
  name: string;
  trackIds: string[];
  createdAt: number;
}[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ id: string; name: string; track_ids: string; created_at: number }>(
    'SELECT * FROM playlists ORDER BY created_at DESC',
  );
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    trackIds: JSON.parse(row.track_ids) as string[],
    createdAt: row.created_at,
  }));
}

export async function savePlaylist(playlist: {
  id: string;
  name: string;
  trackIds: string[];
  createdAt: number;
}): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'INSERT OR REPLACE INTO playlists (id, name, track_ids, created_at) VALUES (?, ?, ?, ?)',
    playlist.id,
    playlist.name,
    JSON.stringify(playlist.trackIds),
    playlist.createdAt,
  );
}

export async function removePlaylist(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM playlists WHERE id = ?', id);
}
