import { StyleSheet, Text, View } from 'react-native';

import { theme } from '../theme';

export function TimelineItem({
  dateLabel,
  title,
  subtitle,
}: {
  dateLabel: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rail}>
        <View style={styles.dot} />
        <View style={styles.line} />
      </View>
      <View style={styles.card}>
        <Text style={styles.date}>{dateLabel}</Text>
        <Text style={styles.title}>{title}</Text>
        {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  rail: {
    width: 18,
    alignItems: 'center',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 0,
    backgroundColor: theme.colors.accent,
    marginTop: 6,
  },
  line: {
    width: 2,
    flex: 1,
    backgroundColor: theme.colors.border,
    marginTop: 6,
  },
  card: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.card,
    gap: 6,
  },
  date: {
    fontSize: theme.typography.small,
    fontWeight: '700',
    color: theme.colors.muted,
    letterSpacing: 0.3,
  },
  title: {
    fontSize: theme.typography.body,
    fontWeight: '700',
    color: theme.colors.fg,
  },
  subtitle: {
    fontSize: theme.typography.small,
    color: theme.colors.muted,
    lineHeight: 18,
  },
});

