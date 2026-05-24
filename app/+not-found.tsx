import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { palette } from '@/src/theme/colors';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Not found' }} />
      <View style={styles.container}>
        <Text style={styles.title}>This route does not exist yet.</Text>
        <Link href="/" style={styles.link}>
          Return to HabitAI
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: palette.text,
  },
  link: {
    color: palette.primary,
    fontWeight: '700',
  },
});
