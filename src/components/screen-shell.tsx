import { PropsWithChildren, ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useThemeTokens } from '@/src/theme/colors';

type ScreenShellProps = PropsWithChildren<{
  title: string;
  subtitle?: string;
  action?: ReactNode;
  scroll?: boolean;
}>;

export function ScreenShell({ title, subtitle, action, children, scroll = true }: ScreenShellProps) {
  const tokens = useThemeTokens();
  const insets = useSafeAreaInsets();
  const Container = scroll ? ScrollView : View;
  const bottomClearance = 156 + Math.max(insets.bottom, 12);

  return (
    <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: tokens.background }]}>
      <Container
        contentContainerStyle={[styles.content, { paddingBottom: bottomClearance }]}
        style={styles.container}
      >
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={[styles.title, { color: tokens.text }]}>{title}</Text>
            {subtitle ? <Text style={[styles.subtitle, { color: tokens.textMuted }]}>{subtitle}</Text> : null}
          </View>
          {action}
        </View>
        {children}
      </Container>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    padding: 20,
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
  },
  headerText: {
    flex: 1,
    gap: 6,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 21,
  },
});
