import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTheme } from "../../ThemeProvider";
import type { AppTheme } from "../../theme";

type ReminderItemProps = {
  title: string;
  createdAt?: string | null;
  dueDate?: string | null;
  dueMileage?: number | null;
  currentMileage?: number | null;
  anchorMileage?: number | null;
  distanceUnit: string;
  remainingDistanceLabel: string;
  estimatedTimeLabel: string;
  dimmed?: boolean;
  onPress?: () => void;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function ReminderItem({
  title,
  createdAt,
  dueDate,
  dueMileage,
  currentMileage,
  anchorMileage,
  distanceUnit,
  remainingDistanceLabel,
  estimatedTimeLabel,
  dimmed = false,
  onPress,
}: ReminderItemProps) {
  const { theme } = useTheme();
  const styles = makeStyles(theme);

  const now = new Date();

  let dateProgress: number | null = null;
  let dateRemainingDays: number | null = null;
  let dateRemainingFraction: number | null = null;
  if (dueDate) {
    const due = new Date(dueDate);
    const created = createdAt ? new Date(createdAt) : null;
    const hasValidCreated = created != null && !Number.isNaN(created.getTime());
    const createdMs = hasValidCreated ? created.getTime() : now.getTime();
    const startMs = createdMs < due.getTime() ? createdMs : now.getTime();
    const totalMs = Math.max(1, due.getTime() - startMs);
    const remainingMs = due.getTime() - now.getTime();
    const coveredMs = totalMs - Math.max(0, remainingMs);
    dateProgress = clamp(coveredMs / totalMs, 0, 1);
    dateRemainingDays = Math.max(0, Math.ceil(remainingMs / (1000 * 60 * 60 * 24)));
    dateRemainingFraction = clamp(Math.max(0, remainingMs) / totalMs, 0, 1);
  }

  let mileageProgress: number | null = null;
  let mileageRemaining: number | null = null;
  let mileageRemainingFraction: number | null = null;
  if (dueMileage != null && currentMileage != null) {
    const startMileage = anchorMileage ?? 0;
    const totalDistance = Math.max(1, dueMileage - startMileage);
    const coveredDistance = currentMileage - startMileage;
    mileageProgress = clamp(coveredDistance / totalDistance, 0, 1);
    mileageRemaining = Math.max(0, dueMileage - currentMileage);
    mileageRemainingFraction = clamp(mileageRemaining / totalDistance, 0, 1);
  }

  const useDateForProgress =
    dateRemainingFraction != null &&
    (mileageRemainingFraction == null ||
      dateRemainingFraction <= mileageRemainingFraction);
  const progress = useDateForProgress
    ? (dateProgress ?? mileageProgress ?? 0)
    : (mileageProgress ?? dateProgress ?? 0);
  const progressPercent = Math.round(clamp(progress, 0, 1) * 100);
  const progressColor =
    dimmed
      ? theme.colors.muted
      : progressPercent > 85
        ? theme.colors.danger
        : theme.colors.accent;

  const remainingDistanceText =
    mileageRemaining != null ? `${mileageRemaining.toLocaleString()} ${distanceUnit}` : "—";
  const estimatedTimeText =
    dateRemainingDays != null ? `${dateRemainingDays}d` : "—";

  const content = (
    <View style={[styles.card, dimmed ? styles.dimmedCard : null]}>
      <View style={styles.titleRow}>
        <Text
          style={[styles.title, { color: theme.colors.fg }, dimmed ? styles.dimmedText : null]}
          numberOfLines={1}
        >
          {title}
        </Text>
        <Text style={[styles.progressPercent, { color: progressColor }]}>
          {progressPercent}%
        </Text>
      </View>

      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            { backgroundColor: progressColor },
            { width: `${Math.round(clamp(progress, 0, 1) * 100)}%` },
          ]}
        />
      </View>

      <View style={styles.metaRow}>
        <View style={styles.metaBlock}>
          <Text style={[styles.metaLabel, { color: theme.colors.muted }]}>
            {remainingDistanceLabel}
          </Text>
          <Text style={[styles.metaText, { color: theme.colors.fg }]}>
            {remainingDistanceText}
          </Text>
        </View>
        <View style={[styles.metaBlock, styles.metaBlockRight]}>
          <Text style={[styles.metaLabel, { color: theme.colors.muted }]}>
            {estimatedTimeLabel}
          </Text>
          <Text style={[styles.metaText, { color: theme.colors.fg }]}>
            {estimatedTimeText}
          </Text>
        </View>
      </View>
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [{ opacity: pressed ? 0.92 : 1 }]}>
        {content}
      </Pressable>
    );
  }

  return content;
}

const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
    card: {
      flex: 1,
      borderRadius: theme.radius.md,
      padding: theme.spacing.sm,
      backgroundColor: theme.colors.card,
      gap: theme.spacing.sm,
    },
    dimmedCard: {
      opacity: 0.7,
    },
    titleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    title: {
      flex: 1,
      minWidth: 0,
      fontSize: theme.typography.body,
      fontWeight: theme.typography.fontWeight.bold,
    },
    progressPercent: {
      fontSize: theme.typography.small,
      fontWeight: theme.typography.fontWeight.bold,
    },
    dimmedText: {
      textDecorationLine: "line-through",
    },
    progressTrack: {
      height: 8,
      borderRadius: 999,
      backgroundColor: "rgba(107,114,128,0.25)",
      overflow: "hidden",
    },
    progressFill: {
      height: "100%",
      borderRadius: 999,
      backgroundColor: theme.colors.accent,
    },
    metaRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: theme.spacing.sm,
    },
    metaBlock: {
      flex: 1,
      minWidth: 0,
      gap: theme.spacing.xs / 3,
    },
    metaBlockRight: {
      alignItems: "flex-end",
    },
    metaLabel: {
      fontSize: theme.typography.xs,
      fontWeight: theme.typography.fontWeight.medium,
      textTransform: "uppercase",
      letterSpacing: 0.4,
    },
    metaText: {
      fontSize: theme.typography.small,
      fontWeight: theme.typography.fontWeight.medium,
    },
  });
