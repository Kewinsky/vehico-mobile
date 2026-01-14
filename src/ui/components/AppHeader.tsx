import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../ThemeProvider';

export function AppHeader({
  onBack,
  right,
}: {
  onBack?: () => void;
  right?: ReactNode;
}) {
  const { theme } = useTheme();
  const styles = makeStyles(theme);

  return (
    <View style={styles.root}>
      <View style={styles.left}>
        {onBack ? (
          <Pressable onPress={onBack} hitSlop={10}>
            <Text style={styles.back}>Back</Text>
          </Pressable>
        ) : (
          <View style={{ width: 48 }} />
        )}
      </View>
      <Text style={styles.title}>Vehico</Text>
      <View style={styles.right}>{right ?? <View style={{ width: 48 }} />}</View>
    </View>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    root: {
      height: 52,
      paddingHorizontal: theme.spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      backgroundColor: theme.colors.bg,
    },
    left: { width: 48 },
    right: { width: 48, alignItems: 'flex-end' },
    title: {
      color: theme.colors.fg,
      fontWeight: '800',
      letterSpacing: 0.2,
    },
    back: {
      color: theme.colors.muted,
      fontWeight: '700',
    },
  });

