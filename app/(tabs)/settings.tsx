import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { PROFILE_AVATARS } from '@/src/constants/profile';
import { signOutOfFirebase } from '@/src/lib/auth';
import { canScheduleNotifications, requestNotificationAccess } from '@/src/lib/notifications';
import { buildLocalDataExport, buildPrivacySafeTelemetry } from '@/src/lib/privacy-export';
import { useAppStore } from '@/src/store/app-store';
import { ThemePreference } from '@/src/types/habits';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const THEME_OPTIONS: { label: string; value: ThemePreference; icon: IconName }[] = [
  { label: 'System', value: 'system', icon: 'desktop-outline' },
  { label: 'Light', value: 'light', icon: 'sunny-outline' },
  { label: 'Dark', value: 'dark', icon: 'moon' },
  { label: 'AMOLED', value: 'amoled', icon: 'color-filter-outline' },
];

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const preferences = useAppStore((state) => state.preferences);
  const session = useAppStore((state) => state.session);
  const premium = useAppStore((state) => state.premium);
  const habits = useAppStore((state) => state.habits);
  const logs = useAppStore((state) => state.logs);
  const setProfile = useAppStore((state) => state.setProfile);
  const setTheme = useAppStore((state) => state.setTheme);
  const setNotificationPermission = useAppStore((state) => state.setNotificationPermission);
  const setAiEnabled = useAppStore((state) => state.setAiEnabled);
  const setTelemetryEnabled = useAppStore((state) => state.setTelemetryEnabled);
  const setPremiumEntitlement = useAppStore((state) => state.setPremiumEntitlement);
  const continueAsGuest = useAppStore((state) => state.continueAsGuest);
  const markSynced = useAppStore((state) => state.markSynced);
  const resetLocalData = useAppStore((state) => state.resetLocalData);

  const contentWidth = Math.min(width - 32, 430);
  const selectedAvatar = PROFILE_AVATARS.find((avatar) => avatar.id === preferences.profileAvatarId) ?? PROFILE_AVATARS[0];
  const notificationsOn = preferences.notificationPermission === 'granted';
  const bottomPadding = Math.max(insets.bottom, 16) + 132;

  async function toggleNotifications(value: boolean) {
    if (!value) {
      setNotificationPermission('denied');
      return;
    }

    const nextValue = await requestNotificationAccess();
    setNotificationPermission(nextValue);
  }

  return (
    <View style={styles.screen}>
      <LinearGradient
        colors={['#010814', '#041225', '#020812', '#020711']}
        locations={[0, 0.36, 0.72, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.topAbyss} />
      <View style={styles.planetOuter} />
      <View style={styles.planetGlow} />
      <View style={styles.stars}>
        {Array.from({ length: 18 }, (_, index) => (
          <View
            key={index}
            style={[
              styles.star,
              {
                left: `${8 + ((index * 17) % 86)}%`,
                top: 54 + ((index * 23) % 174),
                opacity: 0.14 + (index % 5) * 0.13,
                transform: [{ scale: index % 4 === 0 ? 1.45 : 1 }],
              },
            ]}
          />
        ))}
      </View>

      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.content, { paddingBottom: bottomPadding, width: contentWidth }]}
        >
          <View style={styles.header}>
            <Text style={styles.title}>Settings</Text>
            <Pressable accessibilityLabel="Search settings" accessibilityRole="button" style={styles.searchButton}>
              <Ionicons name="search" size={34} color="#ffffff" />
            </Pressable>
          </View>

          <GlassCard compact>
            <View style={styles.profileTop}>
              <View style={[styles.profileAvatarWrap, { shadowColor: selectedAvatar.glow }]}>
                <Image source={{ uri: selectedAvatar.imageUri }} style={styles.profileAvatar} />
              </View>
              <View style={styles.profileCopy}>
                <Text style={styles.profileEyebrow}>Profile</Text>
                <TextInput
                  value={session.displayName ?? 'Friend'}
                  onChangeText={(displayName) => setProfile({ displayName })}
                  placeholder="Your name"
                  placeholderTextColor="rgba(194,207,232,0.58)"
                  style={styles.nameInput}
                />
              </View>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.avatarStrip}>
              {PROFILE_AVATARS.map((avatar) => {
                const selected = preferences.profileAvatarId === avatar.id;
                return (
                  <Pressable
                    key={avatar.id}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => setProfile({ profileAvatarId: avatar.id })}
                    style={[styles.avatarChoice, selected && { borderColor: '#2f98ff', shadowColor: avatar.glow }]}
                  >
                    <Image source={{ uri: avatar.imageUri }} style={styles.avatarChoiceImage} />
                  </Pressable>
                );
              })}
            </ScrollView>
          </GlassCard>

          <GlassCard>
            <CardHeading icon="color-palette-outline" iconColor="#2f8fff" title="Theme" />
            <View style={styles.themeTray}>
              {THEME_OPTIONS.map((option, index) => {
                const selected = preferences.theme === option.value;
                return (
                  <View key={option.value} style={styles.themeSlot}>
                    {index > 0 ? <View style={styles.themeDivider} /> : null}
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      onPress={() => setTheme(option.value)}
                      style={[styles.themeOption, selected && styles.themeOptionSelected]}
                    >
                      {option.value === 'amoled' ? (
                        <DottedRing active={selected} />
                      ) : (
                        <Ionicons name={option.icon} size={36} color={selected ? '#3698ff' : '#aebbe0'} />
                      )}
                      <Text style={[styles.themeLabel, selected && styles.themeLabelActive]}>{option.label}</Text>
                      <View style={[styles.radio, selected && styles.radioActive]}>{selected ? <View style={styles.radioDot} /> : null}</View>
                    </Pressable>
                  </View>
                );
              })}
            </View>
            <View style={styles.focusLine}>
              <Ionicons name="sparkles-outline" size={22} color="#2f8fff" />
              <Text style={styles.focusText}>Designed for focus. Easy on your eyes.</Text>
            </View>
          </GlassCard>

          <GlassCard>
            <View style={styles.topRow}>
              <CardHeading icon="notifications-outline" iconColor="#a855f7" title="Reminders" subtitle="Stay on track" />
              <Switch
                value={notificationsOn}
                onValueChange={toggleNotifications}
                trackColor={{ false: 'rgba(34,48,75,0.9)', true: '#2e7dff' }}
                thumbColor="#ffffff"
                ios_backgroundColor="rgba(34,48,75,0.9)"
              />
            </View>
            <InsetRow
              icon="time-outline"
              label="Daily reminder"
              value={canScheduleNotifications() ? '8:00 PM' : 'Unavailable'}
              onPress={() => toggleNotifications(true)}
            />
          </GlassCard>

          <GlassCard>
            <View style={styles.topRow}>
              <CardHeading icon="hardware-chip-outline" iconColor="#25d7df" title="AI controls and privacy" subtitle="Manage HabitAI’s intelligence" />
              <Ionicons name="chevron-forward" size={26} color="#9fafcf" />
            </View>
            <View style={styles.metricGrid}>
              <MetricTile icon="shield-checkmark-outline" iconColor="#2bbef0" label="Data access" value={preferences.telemetryEnabled ? 'Enabled' : 'Limited'} onPress={() => setTelemetryEnabled(!preferences.telemetryEnabled)} />
              <MetricTile icon="lock-closed-outline" iconColor="#31d58a" label="AI memory" value={preferences.aiEnabled ? 'On' : 'Off'} onPress={() => setAiEnabled(!preferences.aiEnabled)} />
              <MetricTile icon="eye-off-outline" iconColor="#20d6ca" label="Personalization" value={preferences.telemetryEnabled ? 'On' : 'Off'} onPress={() => setTelemetryEnabled(!preferences.telemetryEnabled)} />
            </View>
          </GlassCard>

          <LinearGradient
            colors={['rgba(251,191,36,0.16)', 'rgba(11,18,30,0.94)', 'rgba(255,183,18,0.08)']}
            start={{ x: 0, y: 0.4 }}
            end={{ x: 1, y: 0.6 }}
            style={styles.premiumCard}
          >
            <View style={styles.goldSparkA} />
            <View style={styles.goldSparkB} />
            <CardHeading icon="diamond-outline" iconColor="#ffbc18" title="Premium" subtitle="Unlock advanced insights" />
            <View style={styles.premiumRight}>
              <Pressable
                accessibilityRole="button"
                onPress={() => setPremiumEntitlement(premium.entitlement === 'premium' ? 'free' : 'premium')}
                style={styles.activePill}
              >
                <Ionicons name="sparkles" size={18} color="#ffce3a" />
                <Text style={styles.activePillText}>{premium.entitlement === 'premium' ? 'Active' : 'Upgrade'}</Text>
              </Pressable>
              <Ionicons name="chevron-forward" size={28} color="#ffce3a" />
            </View>
          </LinearGradient>

          <GlassCard>
            <View style={styles.topRow}>
              <CardHeading icon="documents-outline" iconColor="#2f8fff" title="Help, legal, and data" subtitle="Support, terms, and data options" />
              <Ionicons name="chevron-forward" size={26} color="#9fafcf" />
            </View>
            <ListRow icon="help-circle-outline" label="Help center" />
            <ListRow icon="document-text-outline" label="Terms of service" />
            <ListRow icon="shield-checkmark-outline" label="Privacy policy" />
            <ListRow
              icon="download-outline"
              label="Export your data"
              onPress={() => {
                const exportData = buildLocalDataExport({ habits, logs, preferences, session, premium });
                Alert.alert('Export prepared', `Local JSON export is ready in memory (${exportData.length} characters).`);
              }}
            />
            <ListRow
              icon="trash-outline"
              label="Delete your account"
              destructive
              onPress={() => {
                buildPrivacySafeTelemetry('local_data_reset_requested', { habitCount: habits.length, logCount: logs.length });
                Alert.alert('Delete local data?', 'This clears local habits, logs, and assistant history on this device.', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Delete', style: 'destructive', onPress: resetLocalData },
                ]);
              }}
            />
          </GlassCard>

          <View style={styles.utilityRail}>
            <UtilityAction label={session.mode === 'guest' ? 'Sign in' : 'Switch account'} onPress={() => router.push('/auth')} />
            <UtilityAction
              label="Sign out"
              onPress={async () => {
                await signOutOfFirebase();
                continueAsGuest();
              }}
            />
            <UtilityAction label="Sync check" onPress={markSynced} />
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function GlassCard({ children, compact = false }: { children: React.ReactNode; compact?: boolean }) {
  return <View style={[styles.card, compact && styles.compactCard]}>{children}</View>;
}

function CardHeading({
  icon,
  iconColor,
  title,
  subtitle,
}: {
  icon: IconName;
  iconColor: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <View style={styles.heading}>
      <Ionicons name={icon} size={34} color={iconColor} />
      <View style={styles.headingCopy}>
        <Text style={styles.cardTitle}>{title}</Text>
        {subtitle ? <Text style={styles.cardSubtitle}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

function DottedRing({ active }: { active: boolean }) {
  const colors = ['#55d7ff', '#32e0c4', '#f8dd63', '#ff8aba', '#d974ff', '#7ba4ff', '#55d7ff', '#32e0c4'];

  return (
    <View style={[styles.dottedRing, active && styles.dottedRingActive]}>
      {colors.map((color, index) => (
        <View key={`${color}-${index}`} style={[styles.ringDot, { backgroundColor: color, transform: [{ rotate: `${index * 45}deg` }, { translateY: -17 }] }]} />
      ))}
    </View>
  );
}

function InsetRow({ icon, label, value, onPress }: { icon: IconName; label: string; value: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.insetRow}>
      <View style={styles.rowLeft}>
        <Ionicons name={icon} size={25} color="#96a5c8" />
        <Text style={styles.rowLabel}>{label}</Text>
      </View>
      <View style={styles.rowRight}>
        <Text style={styles.rowValue}>{value}</Text>
        <Ionicons name="chevron-forward" size={25} color="#94a5c7" />
      </View>
    </Pressable>
  );
}

function MetricTile({
  icon,
  iconColor,
  label,
  value,
  onPress,
}: {
  icon: IconName;
  iconColor: string;
  label: string;
  value: string;
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.metricTile}>
      <Ionicons name={icon} size={30} color={iconColor} />
      <View>
        <Text style={styles.metricLabel}>{label}</Text>
        <Text style={[styles.metricValue, value === 'Limited' && styles.metricValueLimited]}>{value}</Text>
      </View>
    </Pressable>
  );
}

function ListRow({ icon, label, destructive = false, onPress }: { icon: IconName; label: string; destructive?: boolean; onPress?: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.listRow}>
      <View style={styles.rowLeft}>
        <Ionicons name={icon} size={29} color={destructive ? '#ff514f' : '#8e9bbd'} />
        <Text style={[styles.listLabel, destructive && styles.listLabelDestructive]}>{label}</Text>
      </View>
      <Ionicons name="chevron-forward" size={25} color={destructive ? '#ff514f' : '#96a5c8'} />
    </Pressable>
  );
}

function UtilityAction({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.utilityButton}>
      <Text style={styles.utilityText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#020812',
  },
  safeArea: {
    flex: 1,
    alignItems: 'center',
  },
  content: {
    paddingTop: 20,
    gap: 14,
  },
  topAbyss: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 260,
    backgroundColor: 'rgba(0,3,10,0.38)',
  },
  planetOuter: {
    position: 'absolute',
    top: -178,
    right: -72,
    width: 392,
    height: 392,
    borderRadius: 196,
    borderWidth: 2,
    borderColor: 'rgba(42,143,255,0.72)',
    shadowColor: '#1a8dff',
    shadowOpacity: 0.65,
    shadowRadius: 30,
    shadowOffset: { width: -10, height: 18 },
  },
  planetGlow: {
    position: 'absolute',
    top: 56,
    right: 54,
    width: 2,
    height: 190,
    backgroundColor: 'rgba(45,146,255,0.9)',
    shadowColor: '#2d92ff',
    shadowOpacity: 1,
    shadowRadius: 18,
    transform: [{ rotate: '-13deg' }],
  },
  stars: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 270,
  },
  star: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#2f8fff',
  },
  header: {
    minHeight: 92,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 18,
  },
  title: {
    color: '#ffffff',
    fontSize: 62,
    lineHeight: 70,
    fontWeight: '800',
    letterSpacing: -2.3,
  },
  searchButton: {
    width: 82,
    height: 82,
    borderRadius: 41,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(13,26,48,0.9)',
    borderWidth: 1.2,
    borderColor: 'rgba(114,137,173,0.36)',
    shadowColor: '#000000',
    shadowOpacity: 0.32,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
  },
  card: {
    borderRadius: 28,
    padding: 22,
    gap: 18,
    backgroundColor: 'rgba(6,17,34,0.84)',
    borderWidth: 1.2,
    borderColor: 'rgba(92,118,155,0.36)',
    shadowColor: '#001329',
    shadowOpacity: 0.36,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 16 },
  },
  compactCard: {
    paddingVertical: 18,
  },
  profileTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  profileAvatarWrap: {
    width: 66,
    height: 66,
    borderRadius: 33,
    borderWidth: 2,
    borderColor: '#2f98ff',
    padding: 4,
    shadowOpacity: 0.55,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
  },
  profileAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: 28,
  },
  profileCopy: {
    flex: 1,
    gap: 7,
  },
  profileEyebrow: {
    color: '#92a2c4',
    fontSize: 14,
    fontWeight: '600',
  },
  nameInput: {
    minHeight: 42,
    borderRadius: 18,
    paddingHorizontal: 14,
    color: '#ffffff',
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '700',
    backgroundColor: 'rgba(7,20,40,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(96,125,169,0.32)',
  },
  avatarStrip: {
    gap: 11,
    paddingRight: 10,
  },
  avatarChoice: {
    width: 48,
    height: 48,
    borderRadius: 24,
    padding: 3,
    borderWidth: 1.5,
    borderColor: 'rgba(109,132,170,0.38)',
    backgroundColor: 'rgba(5,15,30,0.8)',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
  },
  avatarChoiceImage: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
  },
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flexShrink: 1,
  },
  headingCopy: {
    flex: 1,
    gap: 3,
  },
  cardTitle: {
    color: '#ffffff',
    fontSize: 27,
    lineHeight: 32,
    fontWeight: '800',
    letterSpacing: -0.45,
  },
  cardSubtitle: {
    color: '#c0c9de',
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '400',
  },
  themeTray: {
    minHeight: 228,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(82,107,145,0.28)',
    backgroundColor: 'rgba(8,19,36,0.82)',
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingVertical: 7,
    overflow: 'hidden',
  },
  themeSlot: {
    flex: 1,
    position: 'relative',
    justifyContent: 'center',
  },
  themeDivider: {
    position: 'absolute',
    left: 0,
    top: 12,
    bottom: 12,
    width: 1,
    backgroundColor: 'rgba(58,78,110,0.33)',
  },
  themeOption: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
    borderRadius: 27,
    borderWidth: 1.5,
    borderColor: 'transparent',
    marginHorizontal: 4,
  },
  themeOptionSelected: {
    backgroundColor: 'rgba(38,111,219,0.18)',
    borderColor: '#2f98ff',
    shadowColor: '#2f98ff',
    shadowOpacity: 0.55,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 },
  },
  themeLabel: {
    color: '#bec8e5',
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '400',
    letterSpacing: -0.2,
  },
  themeLabelActive: {
    color: '#3698ff',
  },
  radio: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: 'rgba(142,157,190,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: {
    borderColor: '#3698ff',
    shadowColor: '#3698ff',
    shadowOpacity: 0.45,
    shadowRadius: 8,
  },
  radioDot: {
    width: 15,
    height: 15,
    borderRadius: 7.5,
    backgroundColor: '#3698ff',
  },
  dottedRing: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dottedRingActive: {
    transform: [{ scale: 1.05 }],
  },
  ringDot: {
    position: 'absolute',
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  focusLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingLeft: 4,
  },
  focusText: {
    color: '#c2cbe0',
    fontSize: 19,
    lineHeight: 24,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
  },
  insetRow: {
    minHeight: 70,
    borderRadius: 25,
    paddingHorizontal: 19,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
    borderWidth: 1,
    borderColor: 'rgba(82,107,145,0.28)',
    backgroundColor: 'rgba(8,19,36,0.72)',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    flexShrink: 1,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rowLabel: {
    color: '#ffffff',
    fontSize: 21,
    fontWeight: '500',
  },
  rowValue: {
    color: '#2f95ff',
    fontSize: 21,
    fontWeight: '500',
  },
  metricGrid: {
    flexDirection: 'row',
    gap: 9,
  },
  metricTile: {
    flex: 1,
    minHeight: 92,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(82,107,145,0.28)',
    backgroundColor: 'rgba(8,19,36,0.72)',
    paddingHorizontal: 13,
    paddingVertical: 13,
    justifyContent: 'space-between',
  },
  metricLabel: {
    color: '#c6cee0',
    fontSize: 15,
    lineHeight: 18,
    fontWeight: '400',
  },
  metricValue: {
    color: '#23f0a5',
    fontSize: 17,
    lineHeight: 21,
    fontWeight: '500',
  },
  metricValueLimited: {
    color: '#24e9df',
  },
  premiumCard: {
    minHeight: 120,
    borderRadius: 24,
    borderWidth: 1.2,
    borderColor: 'rgba(255,183,18,0.68)',
    paddingHorizontal: 22,
    paddingVertical: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    overflow: 'hidden',
    shadowColor: '#ffb712',
    shadowOpacity: 0.24,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 8 },
  },
  goldSparkA: {
    position: 'absolute',
    top: 17,
    right: 135,
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#ffcd34',
  },
  goldSparkB: {
    position: 'absolute',
    bottom: 30,
    right: 102,
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#ffcd34',
  },
  premiumRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  activePill: {
    minHeight: 48,
    borderRadius: 24,
    paddingHorizontal: 22,
    borderWidth: 1.5,
    borderColor: '#ffce1f',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: 'rgba(255,193,31,0.09)',
  },
  activePillText: {
    color: '#ffdf60',
    fontSize: 21,
    fontWeight: '500',
  },
  listRow: {
    minHeight: 50,
    borderTopWidth: 1,
    borderTopColor: 'rgba(105,126,160,0.25)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  listLabel: {
    color: '#e7edf9',
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '400',
  },
  listLabelDestructive: {
    color: '#ff514f',
    fontWeight: '500',
  },
  utilityRail: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
  },
  utilityButton: {
    minHeight: 42,
    borderRadius: 21,
    paddingHorizontal: 16,
    justifyContent: 'center',
    backgroundColor: 'rgba(8,19,36,0.84)',
    borderWidth: 1,
    borderColor: 'rgba(92,118,155,0.30)',
  },
  utilityText: {
    color: '#c3cde2',
    fontSize: 14,
    fontWeight: '700',
  },
});
