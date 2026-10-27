import type { Track } from '@/types/music';

const API = 'https://api.jamendo.com/v3.0';
const CLIENT_ID = process.env.EXPO_PUBLIC_JAMENDO_CLIENT_ID;

type JamendoTrack = {
  id: string;
  name: string;
  duration: number;
  artist_name: string;
  image?: string;
  audio: string;
  audiodownload?: string;
  license_ccurl?: string;
  audiodownload_allowed?: boolean;
};

type JamendoResponse = { results?: JamendoTrack[]; headers?: { status?: string } };

function ensureClientId(): string {
  if (!CLIENT_ID) throw new Error('Jamendo uchun .env fayliga client ID kiriting.');
  return CLIENT_ID;
}

function mapTrack(track: JamendoTrack): Track {
  return {
    id: `jamendo:${track.id}`,
    title: track.name,
    artist: track.artist_name,
    artwork: track.image ?? null,
    streamUrl: track.audio,
    duration: track.duration,
    source: 'jamendo',
    license: track.license_ccurl,
    downloadUrl: track.audiodownload_allowed ? track.audiodownload : undefined,
  };
}

async function request(params: URLSearchParams, signal?: AbortSignal): Promise<Track[]> {
  params.set('client_id', ensureClientId());
  params.set('format', 'json');
  params.set('audioformat', 'mp32');
  params.set('limit', '25');
  const response = await fetch(`${API}/tracks/?${params.toString()}`, { signal });
  if (!response.ok) throw new Error(`Jamendo javobi: ${response.status}`);
  const body = (await response.json()) as JamendoResponse;
  if (body.headers?.status && body.headers.status !== 'success') {
    throw new Error('Jamendo so‘rovni bajara olmadi.');
  }
  return (body.results ?? []).map(mapTrack);
}

export async function searchJamendo(query: string, signal?: AbortSignal): Promise<Track[]> {
  const params = new URLSearchParams({ namesearch: query, include: 'musicinfo' });
  return request(params, signal);
}

export async function getTrendingJamendo(signal?: AbortSignal): Promise<Track[]> {
  return request(new URLSearchParams({ order: 'popularity_total', include: 'musicinfo' }), signal);
}

export async function getJamendoGenres(signal?: AbortSignal): Promise<string[]> {
  const response = await fetch(`${API}/tags/?client_id=${encodeURIComponent(ensureClientId())}&format=json&limit=20`);
  if (!response.ok) throw new Error(`Janrlar yuklanmadi: ${response.status}`);
  const body = (await response.json()) as { results?: { name: string }[] };
  return (body.results ?? []).map((tag) => tag.name);
}
