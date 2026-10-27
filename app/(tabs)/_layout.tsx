import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MiniPlayer } from '@/components/MiniPlayer';
import { theme } from '@/theme/theme';

const labels: Record<string, string> = {
  index: 'Bosh sahifa',
  search: 'Qidiruv',
  library: 'Kutubxona',
  downloads: 'Oflayn',
};

const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
  index: 'home',
  search: 'search',
  library: 'albums',
  downloads: 'cloud-download',
};

type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

function NavigationBar({ state, descriptors, navigateToTab }: TabBarProps) {
  return (
    <View style={styles.dock}>
      <MiniPlayer />
      <View style={styles.tabs}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const options = descriptors[route.key]?.options;
          const label = options?.tabBarLabel?.toString() ?? labels[route.name] ?? route.name;
          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={label}
              onPress={() => { if (!focused) navigateToTab(route.key); }}
              style={styles.tab}
            >
              <Ionicons name={icons[route.name] ?? 'ellipse'} size={21} color={focused ? theme.colors.accent : theme.colors.muted} />
              <Text style={[styles.label, focused && styles.labelActive]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <NavigationBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: theme.colors.background } }}
    >
      <Tabs.Screen name="index" options={{ title: 'Bosh sahifa' }} />
      <Tabs.Screen name="search" options={{ title: 'Qidiruv' }} />
      <Tabs.Screen name="library" options={{ title: 'Kutubxona' }} />
      <Tabs.Screen name="downloads" options={{ title: 'Yuklanganlar' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  dock: { backgroundColor: theme.colors.background, paddingTop: 6, paddingBottom: 8, borderTopWidth: 1, borderTopColor: theme.colors.border },
  tabs: { flexDirection: 'row', justifyContent: 'space-around', paddingTop: 5 },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 5 },
  label: { color: theme.colors.muted, fontSize: 10, fontWeight: '600' },
  labelActive: { color: theme.colors.accent },
});
