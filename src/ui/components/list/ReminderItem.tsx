import { Ionicons } from "@expo/vector-icons";
import { Trash2, Undo2 } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ExclusiveSwipeable } from "../common/ExclusiveSwipeable";
import { useTranslation } from "react-i18next";

import { useUnitDisplay } from "../../../app/hooks/useUnitDisplay";
import { useTheme } from "../../ThemeProvider";
import type { AppTheme } from "../../theme";
import { groupThousands } from "../../../utils/numberFormatting";

type ReminderItemProps = {
  title: string;
  createdAt?: string | null;
  dueDate?: string | null;
  dueMileage?: number | null;
  currentMileage?: number | null;
  anchorMileage?: number | null;
  remainingDistanceLabel: string;
  estimatedTimeLabel: string;
  dimmed?: boolean;
  done?: boolean;
  onPress?: () => void;
  onToggleDone?: () => void;
  onDelete?: () => void;
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
  remainingDistanceLabel,
  estimatedTimeLabel,
  dimmed = false,
  done = false,
  onPress,
  onToggleDone,
  onDelete,
}: ReminderItemProps) {
  const { i18n } = useTranslation();
  const { theme } = useTheme();
  const { distanceUnitLabel } = useUnitDisplay();
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
  const primaryTextColor = dimmed ? theme.colors.muted : theme.colors.fg;

  const remainingDistanceText =
    mileageRemaining != null
      ? `${groupThousands(mileageRemaining, 0, i18n.language)} ${distanceUnitLabel}`
      : "—";
  const estimatedTimeText =
    dateRemainingDays != null ? `${dateRemainingDays}d` : "—";

  const content = (
    <View style={styles.card}>
      <View style={styles.titleRow}>
        <Text
          style={[styles.title, { color: primaryTextColor }, dimmed ? styles.dimmedText : null]}
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
          <Text style={[styles.metaText, { color: primaryTextColor }]}>
            {remainingDistanceText}
          </Text>
        </View>
        <View style={[styles.metaBlock, styles.metaBlockRight]}>
          <Text style={[styles.metaLabel, { color: theme.colors.muted }]}>
            {estimatedTimeLabel}
          </Text>
          <Text style={[styles.metaText, { color: primaryTextColor }]}>
            {estimatedTimeText}
          </Text>
        </View>
      </View>
    </View>
  );

  const baseContent = onPress ? (
    <Pressable onPress={onPress} style={({ pressed }) => [{ opacity: pressed ? 0.92 : 1 }]}>
      {content}
    </Pressable>
  ) : (
    content
  );

  if (!onToggleDone && !onDelete) return baseContent;

  return (
    <ExclusiveSwipeable
      rightThreshold={32}
      renderRightActions={() => (
        <View style={styles.swipeActionsWrap}>
          {onToggleDone ? (
            <Pressable
              onPress={onToggleDone}
              style={[
                styles.swipeActionBtn,
                {
                  backgroundColor: done
                    ? theme.colors.muted
                    : theme.colors.accent,
                },
              ]}
            >
              {done ? (
                <Undo2 size={22} color="#000000" />
              ) : (
                <Ionicons name="checkmark" size={24} color="#000000" />
              )}
            </Pressable>
          ) : null}
          {onDelete ? (
            <Pressable
              onPress={onDelete}
              style={[styles.swipeActionBtn, { backgroundColor: theme.colors.danger }]}
            >
              <Trash2 size={20} color="#000000" />
            </Pressable>
          ) : null}
        </View>
      )}
    >
      {baseContent}
    </ExclusiveSwipeable>
  );
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
    swipeActionsWrap: {
      flexDirection: "row",
      alignItems: "stretch",
      marginLeft: theme.spacing.xs,
      borderRadius: theme.radius.md,
      overflow: "hidden",
    },
    swipeActionBtn: {
      width: 72,
      alignItems: "center",
      justifyContent: "center",
    },
  });
