import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/theme/theme';

export function Artwork({ uri, size, rounded = 16 }: { uri: string | null; size: number; rounded?: number }) {
  return (
    <View style={[styles.frame, { width: size, height: size, borderRadius: rounded }]}>
      {uri ? (
        <Image
          source={{ uri }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          cachePolicy="disk"
          transition={180}
          placeholder={{ blurhash: 'L8D,8x?b00%M~q-;xut700M{Rjof' }}
        />
      ) : (
        <LinearGradient colors={['#1E504C', '#252039']} style={StyleSheet.absoluteFill} />
      )}
      {!uri && <Ionicons name="musical-note" size={size * 0.34} color={theme.colors.accent} />}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceRaised,
  },
});
