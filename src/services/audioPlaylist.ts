import { createAudioPlaylist } from 'expo-audio';

export const audioPlaylist = createAudioPlaylist({
  sources: [],
  updateInterval: 500,
  loop: 'none',
});
