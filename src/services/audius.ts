import type { Track } from '@/types/music';

const API = 'https://api.audius.co/v1';
const APP_NAME = 'NavoMusic';
const API_KEY = process.env.EXPO_PUBLIC_AUDIUS_API_KEY;

type AudiusTrack = {
  id: string;
  title: string;
  duration: number;
  artwork?: { '150x150'?: string; '480x480'?: string; '1000x1000'?: string };
  user?: { name?: string; handle?: string };
  genre?: string;
};

type AudiusResponse = { data?: AudiusTrack[] };

async function request(path: string, signal?: AbortSignal): Promise<AudiusResponse> {
  const url = new URL(`${API}${path}`);
  url.searchParams.set('app_name', APP_NAME);
  if (API_KEY) url.searchParams.set('api_key', API_KEY);
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`Audius javobi: ${response.status}`);
  return (await response.json()) as AudiusResponse;
}

function mapTrack(track: AudiusTrack): Track {
  return {
    id: `audius:${track.id}`,
    title: track.title,
    artist: track.user?.name ?? track.user?.handle ?? 'Noma’lum ijrochi',
    artwork: track.artwork?.['480x480'] ?? track.artwork?.['150x150'] ?? null,
    streamUrl: `${API}/tracks/${encodeURIComponent(track.id)}/stream?app_name=${APP_NAME}${API_KEY ? `&api_key=${encodeURIComponent(API_KEY)}` : ''}`,
    duration: track.duration,
    source: 'audius',
  };
}

export async function searchAudius(query: string, signal?: AbortSignal): Promise<Track[]> {
  if (!query.trim()) return [];
  const result = await request(`/tracks/search?query=${encodeURIComponent(query)}&limit=25`, signal);
  return (result.data ?? []).map(mapTrack);
}

export async function getTrendingAudius(signal?: AbortSignal): Promise<Track[]> {
  const result = await request('/tracks/trending?limit=20', signal);
  return (result.data ?? []).map(mapTrack);
}

export async function getAudiusGenres(signal?: AbortSignal): Promise<Track[]> {
  const result = await request('/tracks/trending?limit=30&genre=Electronic', signal);
  return (result.data ?? []).map(mapTrack);
}
