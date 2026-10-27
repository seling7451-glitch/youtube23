export type MusicSource = 'audius' | 'jamendo' | 'local' | 'link';

export type Track = {
  id: string;
  title: string;
  artist: string;
  artwork: string | null;
  streamUrl: string;
  duration: number;
  source: MusicSource;
  license?: string;
  downloadUrl?: string;
  localUri?: string;
};

export type Playlist = {
  id: string;
  name: string;
  trackIds: string[];
  createdAt: number;
};

export type SearchProvider = 'audius' | 'jamendo';
