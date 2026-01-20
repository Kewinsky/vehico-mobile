import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../ThemeProvider';

export function TimelineItem({
  dateLabel,
  title,
  subtitle,
  badge,
  badgeVariant = 'accent',
  chevron = true,
  tone = 'default',
}: {
  dateLabel: string;
  title: string;
  subtitle?: string;
  badge?: string;
  badgeVariant?: 'accent' | 'muted';
  chevron?: boolean;
  tone?: 'default' | 'reminder';
}) {
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  const isReminder = tone === 'reminder';
  const isMutedBadge = badgeVariant === 'muted';
  return (
    <View style={styles.row}>
      <View style={styles.rail}>
        <View
          style={[
            styles.dot,
            isReminder ? { backgroundColor: theme.colors.muted } : null,
          ]}
        />
        <View style={styles.line} />
      </View>
      <View style={styles.card}>
        <View style={styles.cardRow}>
          <View style={styles.cardMain}>
            <View style={styles.pillsRow}>
              {!isReminder && (
                <View style={styles.datePill}>
                  <Text style={styles.date}>{dateLabel}</Text>
                </View>
              )}
              {badge && (
                <View
                  style={[
                    styles.badge,
                    isMutedBadge ? styles.badgeMuted : styles.badgeAccent,
                  ]}
                >
                  <Text
                    style={[
                      styles.badgeText,
                      isMutedBadge ? styles.badgeTextMuted : null,
                    ]}
                  >
                    {badge}
                  </Text>
                </View>
              )}
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
      padding: theme.spacing.sm,
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
    pillsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      flexWrap: 'wrap',
    },
    datePill: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.bg,
    },
    badge: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      borderWidth: 1,
    },
    badgeAccent: {
      borderColor: theme.colors.accent,
      backgroundColor: theme.colors.accent,
    },
    badgeMuted: {
      borderColor: theme.colors.muted,
      backgroundColor: theme.colors.muted,
    },
    badgeText: {
      fontSize: theme.typography.small,
      fontWeight: '700',
      color: '#000000',
      letterSpacing: 0.3,
    },
    badgeTextMuted: {
      color: '#000000',
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

