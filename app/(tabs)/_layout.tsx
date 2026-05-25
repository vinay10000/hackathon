import { Ionicons } from '@expo/vector-icons';
import { Tabs, router } from 'expo-router';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useThemeTokens } from '@/src/theme/colors';

type TabIconName = React.ComponentProps<typeof Ionicons>['name'];

const visibleTabs: Record<string, { label: string; icon: TabIconName }> = {
  today: { label: 'Today', icon: 'sunny' },
  calendar: { label: 'Calendar', icon: 'calendar' },
  analytics: { label: 'Analytics', icon: 'stats-chart' },
  assistant: { label: 'Assistant', icon: 'sparkles' },
};

export default function TabLayout() {
  const tokens = useThemeTokens();

  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: tokens.background },
      }}
    >
      <Tabs.Screen name="today" options={{ title: 'Today' }} />
      <Tabs.Screen name="calendar" options={{ title: 'Calendar' }} />
      <Tabs.Screen name="analytics" options={{ title: 'Analytics' }} />
      <Tabs.Screen name="assistant" options={{ title: 'Assistant' }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
    </Tabs>
  );
}

function FloatingTabBar({ state, descriptors, navigation }: any) {
  const tokens = useThemeTokens();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const bottomOffset = Math.max(insets.bottom, 12);
  const railWidth = Math.min(width - 116, 440);

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <View style={[styles.wrapper, { paddingBottom: bottomOffset }]}>
        <View
          style={[
            styles.rail,
            {
              width: railWidth,
              backgroundColor: tokens.mode === 'light' ? 'rgba(255,255,255,0.92)' : 'rgba(18,18,18,0.88)',
              borderColor: tokens.mode === 'light' ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.08)',
              shadowColor: '#000000',
            },
          ]}
        >
          {state.routes
            .filter((route: any) => visibleTabs[route.name])
            .map((route: any) => {
              const routeIndex = state.routes.findIndex((candidate: any) => candidate.key === route.key);
              const isFocused = state.index === routeIndex;
              const tab = visibleTabs[route.name];
              const descriptor = descriptors[route.key];

              const onPress = () => {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });

                if (!isFocused && !event.defaultPrevented) {
                  navigation.navigate(route.name, route.params);
                }
              };

              const onLongPress = () => {
                navigation.emit({
                  type: 'tabLongPress',
                  target: route.key,
                });
              };

              return (
                <Pressable
                  key={route.key}
                  accessibilityRole="button"
                  accessibilityState={isFocused ? { selected: true } : {}}
                  accessibilityLabel={descriptor.options.tabBarAccessibilityLabel}
                  testID={descriptor.options.tabBarButtonTestID}
                  style={[
                    styles.tabButton,
                    isFocused && {
                      backgroundColor: tokens.mode === 'light' ? 'rgba(16,36,62,0.08)' : 'rgba(94,234,212,0.12)',
                    },
                  ]}
                  onLongPress={onLongPress}
                  onPress={onPress}
                >
                  <Ionicons name={tab.icon} size={22} color={isFocused ? tokens.primary : tokens.textMuted} />
                  <Text style={[styles.tabLabel, { color: isFocused ? tokens.text : tokens.textMuted }]}>{tab.label}</Text>
                </Pressable>
              );
            })}
        </View>

        <Pressable
          accessibilityLabel="Add habit"
          accessibilityRole="button"
          style={[
            styles.addButton,
            {
              backgroundColor: tokens.surface,
              borderColor: tokens.mode === 'light' ? 'rgba(255,255,255,0.45)' : tokens.border,
              shadowColor: '#000000',
            },
          ]}
          onPress={() => router.push('/habit/new')}
        >
          <Ionicons name="add" size={30} color={tokens.primary} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  rail: {
    minHeight: 84,
    borderRadius: 34,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    shadowOpacity: 0.28,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 14 },
    elevation: 20,
  },
  tabButton: {
    flex: 1,
    minHeight: 58,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 6,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  addButton: {
    position: 'absolute',
    right: 24,
    bottom: 14,
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.32,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 24,
  },
});
