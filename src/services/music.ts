import * as Network from 'expo-network';
import type { Track } from '@/types/music';
import { getTrendingAudius, searchAudius } from './audius';
import { getTrendingJamendo, searchJamendo } from './jamendo';
import { cacheValue, readCache } from './database';

export type CatalogueResult = { tracks: Track[]; offline: boolean; warning?: string };

export async function isOnline(): Promise<boolean> {
  const state = await Network.getNetworkStateAsync();
  return state.isConnected === true && state.isInternetReachable !== false;
}

export async function loadTrending(): Promise<CatalogueResult> {
  const key = 'trending-v1';
  const cached = await readCache<Track[]>(key);
  if (!(await isOnline())) return { tracks: cached ?? [], offline: true };
  const results = await Promise.allSettled([getTrendingAudius(), getTrendingJamendo()]);
  const tracks = results.flatMap((result) => (result.status === 'fulfilled' ? result.value : []));
  if (tracks.length) {
    await cacheValue(key, tracks);
    return { tracks, offline: false };
  }
  if (cached) return { tracks: cached, offline: false, warning: 'Yangilash imkonsiz, keshlangan treklar ko‘rsatilmoqda.' };
  const reason = results.find((result) => result.status === 'rejected');
  return {
    tracks: [],
    offline: false,
    warning: reason?.status === 'rejected' ? 'Katalog hozircha ochilmadi. API sozlamalarini tekshiring.' : undefined,
  };
}

export async function searchCatalogue(query: string, provider: 'audius' | 'jamendo'): Promise<CatalogueResult> {
  const key = `search-${provider}-${query.trim().toLowerCase()}`;
  const cached = await readCache<Track[]>(key);
  if (!(await isOnline())) return { tracks: cached ?? [], offline: true };
  try {
    const tracks = provider === 'audius' ? await searchAudius(query) : await searchJamendo(query);
    await cacheValue(key, tracks);
    return { tracks, offline: false };
  } catch (error) {
    if (cached) return { tracks: cached, offline: false, warning: 'Yangilash imkonsiz, keshlangan natijalar ko‘rsatilmoqda.' };
    return {
      tracks: [],
      offline: false,
      warning: error instanceof Error ? error.message : 'Qidiruv amalga oshmadi.',
    };
  }
}
