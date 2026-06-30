import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NewHabitSheet } from '@/src/components/new-habit-sheet';
import { useThemeTokens } from '@/src/theme/colors';

type TabIconName = React.ComponentProps<typeof Ionicons>['name'];

const visibleTabs: Record<string, { label: string; icon: TabIconName }> = {
  today: { label: 'Today', icon: 'sunny' },
  calendar: { label: 'Calendar', icon: 'calendar' },
  assistant: { label: 'Assistant', icon: 'sparkles' },
  settings: { label: 'Settings', icon: 'settings-outline' },
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
      <Tabs.Screen name="assistant" options={{ title: 'Assistant' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
    </Tabs>
  );
}

function FloatingTabBar({ state, descriptors, navigation }: any) {
  const tokens = useThemeTokens();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [newHabitOpen, setNewHabitOpen] = useState(false);
  const bottomOffset = Math.max(insets.bottom, 26);
  const maxRailWidth = 420;
  const addButtonSize = 60;
  const sidePadding = 16;
  const addButtonGap = 14;
  const railWidth = Math.min(width - addButtonSize - addButtonGap - sidePadding * 2, maxRailWidth);
  const tabRoutes = state.routes.filter((route: any) => visibleTabs[route.name]);
  const visibleTabCount = tabRoutes.length;
  const railInnerWidth = Math.max(railWidth - 28, 200);
  const inactiveTabWidth = Math.max(
    42,
    Math.floor((railInnerWidth - 52) / Math.max(visibleTabCount - 1, 1)),
  );
  const activeTabWidth = Math.min(64, railInnerWidth - inactiveTabWidth * Math.max(visibleTabCount - 1, 0));
  const activeRoute = state.routes[state.index];

  if (activeRoute?.name === 'assistant') {
    return null;
  }

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      {newHabitOpen ? <NewHabitSheet visible onClose={() => setNewHabitOpen(false)} /> : null}
      <View pointerEvents="box-none" style={[styles.wrapper, { paddingBottom: bottomOffset }]}>
        <View
          pointerEvents="auto"
          style={[
            styles.rail,
            {
              width: railWidth,
              backgroundColor:
                tokens.mode === 'light' ? 'rgba(16,36,62,0.76)' : tokens.mode === 'dark' ? 'rgba(17,29,47,0.88)' : 'rgba(5,5,5,0.92)',
              borderColor:
                tokens.mode === 'light' ? 'rgba(37,99,235,0.18)' : tokens.mode === 'dark' ? 'rgba(96,165,250,0.16)' : 'rgba(94,234,212,0.18)',
              shadowColor: '#000000',
            },
          ]}
        >
          {tabRoutes.map((route: any) => {
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
                    {
                      width: isFocused ? activeTabWidth : inactiveTabWidth,
                    },
                    isFocused && {
                      backgroundColor: tokens.mode === 'light' ? 'rgba(255,255,255,0.14)' : tokens.primarySoft,
                      borderColor: tokens.mode === 'light' ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.06)',
                    },
                  ]}
                  onLongPress={onLongPress}
                  onPress={onPress}
                >
                  <Ionicons
                    name={tab.icon}
                    size={22}
                    color={isFocused ? '#ffffff' : tokens.mode === 'light' ? 'rgba(255,255,255,0.88)' : tokens.textMuted}
                  />
                  <Text
                    adjustsFontSizeToFit
                    minimumFontScale={0.72}
                    numberOfLines={1}
                    style={[
                      styles.tabLabel,
                      {
                        color: isFocused ? '#ffffff' : tokens.mode === 'light' ? 'rgba(255,255,255,0.88)' : tokens.textMuted,
                        maxWidth: isFocused ? activeTabWidth - 10 : inactiveTabWidth - 8,
                      },
                    ]}
                  >
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
        </View>

        <Pressable
          accessibilityLabel="Add habit"
          accessibilityRole="button"
          pointerEvents="auto"
          style={[
            styles.addButton,
            {
              backgroundColor: tokens.mode === 'light' ? tokens.primary : tokens.surface,
              borderColor:
                tokens.mode === 'light' ? 'rgba(255,255,255,0.22)' : tokens.mode === 'dark' ? 'rgba(96,165,250,0.16)' : 'rgba(94,234,212,0.18)',
              shadowColor: '#000000',
            },
          ]}
          onPress={() => setNewHabitOpen(true)}
          >
          <Ionicons
            name="add"
            size={22}
            color={tokens.mode === 'light' ? '#ffffff' : tokens.primary}
            style={{ transform: [{ translateY: -1 }] }}
          />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'stretch',
  },
  rail: {
    minHeight: 72,
    borderRadius: 36,
    borderWidth: 1,
    paddingLeft: 10,
    paddingRight: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 4,
    marginLeft: 16,
    marginBottom: 12,
    shadowOpacity: 0.34,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 16 },
    elevation: 24,
  },
  tabButton: {
    minHeight: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingHorizontal: 4,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: 'transparent',
    flexShrink: 0,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '500',
    lineHeight: 11,
    textAlign: 'center',
  },
  addButton: {
    position: 'absolute',
    right: 14,
    bottom: 40,
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.36,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 22,
  },
});
