import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../ThemeProvider';

export function TimelineItem({
  dateLabel,
  title,
  subtitle,
  chevron = true,
}: {
  dateLabel: string;
  title: string;
  subtitle?: string;
  chevron?: boolean;
}) {
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  return (
    <View style={styles.row}>
      <View style={styles.rail}>
        <View style={styles.dot} />
        <View style={styles.line} />
      </View>
      <View style={styles.card}>
        <View style={styles.cardRow}>
          <View style={styles.cardMain}>
            <View style={styles.datePill}>
              <Text style={styles.date}>{dateLabel}</Text>
            </View>
            <Text style={styles.title}>{title}</Text>
            {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
          </View>
          {chevron ? <Text style={styles.chevron}>›</Text> : null}
        </View>
      </View>
    </View>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
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
      borderRadius: 5,
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
      padding: 14,
      backgroundColor: theme.colors.card,
    },
    cardRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    cardMain: {
      flex: 1,
      gap: 6,
    },
    datePill: {
      alignSelf: 'flex-start',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.bg,
    },
    date: {
      fontSize: theme.typography.small,
      fontWeight: '700',
      color: theme.colors.muted,
      letterSpacing: 0.3,
    },
    title: {
      fontSize: 16,
      fontWeight: '800',
      color: theme.colors.fg,
    },
    subtitle: {
      fontSize: theme.typography.small,
      color: theme.colors.muted,
      lineHeight: 18,
    },
    chevron: {
      fontSize: 18,
      color: theme.colors.muted,
      fontWeight: '900',
      marginLeft: 4,
    },
  });

