import * as MediaLibrary from 'expo-media-library/legacy';
import type { Track } from '@/types/music';

export async function scanLocalAudio(): Promise<Track[]> {
  const permission = await MediaLibrary.requestPermissionsAsync(false, ['audio']);
  if (!permission.granted) {
    throw new Error('Telefon musiqalarini ko‘rish uchun ruxsat bering.');
  }
  const assets: MediaLibrary.Asset[] = [];
  let after: string | undefined;
  let hasNextPage = true;
  while (hasNextPage) {
    const result = await MediaLibrary.getAssetsAsync({
      mediaType: MediaLibrary.MediaType.audio,
      first: 500,
      after,
      sortBy: [['creationTime', false]],
    });
    assets.push(...result.assets);
    after = result.endCursor;
    hasNextPage = result.hasNextPage;
  }
  return assets.map((asset) => ({
    id: `local:${asset.id}`,
    title: asset.filename.replace(/\.[^.]+$/, ''),
    artist: 'Telefoningizdagi audio',
    artwork: null,
    streamUrl: asset.uri,
    localUri: asset.uri,
    duration: asset.duration,
    source: 'local',
  }));
}
