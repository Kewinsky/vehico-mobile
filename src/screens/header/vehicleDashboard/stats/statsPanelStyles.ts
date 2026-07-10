import { StyleSheet } from "react-native";

import { useTheme } from "../../../../ui/ThemeProvider";

export const makeStatsPanelStyles = (
  theme: ReturnType<typeof useTheme>["theme"],
) =>
  StyleSheet.create({
    loading: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: theme.spacing.xl,
    },
    heroCard: {
      backgroundColor: theme.colors.card,
      borderRadius: theme.radius.xl,
      padding: theme.spacing.lg,
      gap: theme.spacing.sm,
    },
    heroLabel: {
      fontWeight: theme.typography.fontWeight.bold,
      fontSize: theme.typography.body,
    },
    heroValue: {
      fontWeight: theme.typography.fontWeight.bold,
      fontSize: theme.typography.largeTitle,
    },
    heroMeta: {
      fontWeight: theme.typography.fontWeight.medium,
      fontSize: theme.typography.small,
    },
    expensesHeroRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: theme.spacing.sm,
    },
    expensesHeroLabel: {
      flex: 1,
      fontWeight: theme.typography.fontWeight.bold,
      fontSize: theme.typography.title,
    },
    expensesHeroValueGroup: {
      flexDirection: "row",
      alignItems: "baseline",
      gap: theme.spacing.xs,
      flexShrink: 0,
    },
    expensesHeroValue: {
      fontWeight: theme.typography.fontWeight.bold,
      fontSize: theme.typography.title,
    },
    expensesHeroRollingWrap: {
      justifyContent: "center",
    },
    expensesHeroCurrency: {
      fontWeight: theme.typography.fontWeight.regular,
      fontSize: theme.typography.small,
    },
    expenseSummaryBreakdownRow: {
      flexDirection: "row",
      paddingTop: theme.spacing.xs,
      gap: theme.spacing.sm,
    },
    expenseSummaryBreakdownCell: {
      flex: 1,
      minWidth: 0,
      borderRadius: theme.radius.xl,
      padding: theme.spacing.md,
      gap: theme.spacing.xs,
    },
    expenseSummaryBreakdownHeader: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: theme.spacing.xs,
    },
    expenseSummaryShareLabel: {
      fontSize: theme.typography.small - 1,
      fontWeight: theme.typography.fontWeight.medium,
      flexShrink: 0,
    },
    expenseSummaryIconBadge: {
      width: 34,
      height: 34,
      borderRadius: 999,
      alignItems: "center",
      justifyContent: "center",
    },
    expenseSummaryBreakdownLabel: {
      fontSize: theme.typography.small,
      fontWeight: theme.typography.fontWeight.medium,
    },
    expenseSummaryBreakdownValueRow: {
      flexDirection: "row",
      alignItems: "baseline",
      flexWrap: "wrap",
      gap: theme.spacing.xs,
      rowGap: 0,
    },
    expenseSummaryBreakdownValue: {
      fontWeight: theme.typography.fontWeight.bold,
      fontSize: theme.typography.title,
    },
    expenseSummaryBreakdownSuffix: {
      fontWeight: theme.typography.fontWeight.regular,
      fontSize: theme.typography.small,
    },
    tilesRow: { flexDirection: "row", gap: theme.spacing.sm },
    tile: {
      flex: 1,
      borderRadius: theme.radius.xl,
      padding: theme.spacing.md,
      justifyContent: "space-between",
    },
    tileIconLeading: {
      justifyContent: "center",
      minHeight: theme.spacing.lg * 2 + theme.spacing.md,
    },
    tileIconLeadingRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: theme.spacing.sm,
    },
    tileIconLeadingIcon: {
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    tileIconLeadingValueGroup: {
      flex: 1,
      flexDirection: "row",
      alignItems: "baseline",
      justifyContent: "flex-end",
      flexWrap: "wrap",
      gap: theme.spacing.xs,
      rowGap: 0,
    },
    tileFullWidth: {
      flex: undefined,
      width: "100%",
    },
    tileTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
      paddingBottom: theme.spacing.xs,
    },
    tileLabel: {
      fontWeight: theme.typography.fontWeight.regular,
      fontSize: theme.typography.body,
      flex: 1,
    },
    tileValueRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "baseline",
    },
    tilePressableIcon: {
      marginLeft: theme.spacing.xs,
    },
    tileValueMain: {
      fontWeight: theme.typography.fontWeight.bold,
      fontSize: theme.typography.title,
    },
    tileRollingNumberWrap: {
      justifyContent: "center",
    },
    tileValueSuffix: {
      fontWeight: theme.typography.fontWeight.regular,
      fontSize: theme.typography.small,
    },
    section: {
      marginBottom: theme.spacing.xl,
      gap: theme.spacing.sm,
    },
    sectionTitle: {
      fontWeight: theme.typography.fontWeight.bold,
      fontSize: theme.typography.title,
    },
    sectionHeaderInline: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
    },
    infoIconButton: {
      padding: 2,
    },
    sectionHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: theme.spacing.sm,
    },
    viewAllLink: {
      fontSize: theme.typography.small,
      fontWeight: theme.typography.fontWeight.bold,
    },
    oilLifeCard: {
      borderRadius: theme.radius.xl,
      padding: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    oilLifeTopRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: theme.spacing.md,
    },
    oilLifeTopCell: {
      flex: 1,
      gap: theme.spacing.xs / 2,
    },
    oilLifeLabel: {
      fontSize: theme.typography.body,
      color: theme.colors.accent,
    },
    oilLifeMainValue: {
      fontSize: theme.typography.title,
      fontWeight: theme.typography.fontWeight.bold,
    },
    oilLifeProgressTrack: {
      height: 44,
      borderRadius: 999,
      overflow: "hidden",
      backgroundColor: theme.colors.bg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      justifyContent: "center",
    },
    oilLifeProgressFill: {
      position: "absolute",
      left: 0,
      top: 0,
      bottom: 0,
      borderTopLeftRadius: 12,
      borderBottomLeftRadius: 12,
    },
    oilLifeProgressText: {
      textAlign: "center",
      fontSize: theme.typography.body,
      fontWeight: theme.typography.fontWeight.bold,
    },
    oilLifeProgressTextLayer: {
      position: "absolute",
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
      justifyContent: "center",
    },
    oilLifeProgressTextOverlay: {
      position: "absolute",
      left: 0,
      top: 0,
      bottom: 0,
      overflow: "hidden",
      justifyContent: "center",
    },
    oilLifeProgressTextOverlayInner: {
      justifyContent: "center",
    },
    recentServiceList: {
      gap: theme.spacing.sm,
    },
    empty: { fontSize: theme.typography.body },
    chartContainer: {
      width: "100%",
    },
    chartFrame: {
      width: "100%",
      flexDirection: "row",
      alignItems: "flex-start",
    },
    chartScroll: {
      flex: 1,
    },
    chartScrollContent: {
      alignItems: "flex-start",
      justifyContent: "flex-start",
    },
    legendInline: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.md,
      flexWrap: "wrap",
    },
    legendInlineItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
    },
    legendInlineDot: {
      width: 10,
      height: 10,
      borderRadius: 999,
    },
    legendInlineText: {
      fontSize: theme.typography.small,
      fontWeight: theme.typography.fontWeight.medium,
    },
    pieChartWrap: {
      width: "100%",
      alignItems: "center",
      justifyContent: "center",
    },
    legend: {
      gap: theme.spacing.md,
      width: "100%",
    },
    legendCard: {
      borderRadius: theme.radius.xl,
      padding: theme.spacing.md,
    },
    legendCardPressed: {
      opacity: 0.85,
    },
    legendExpandButton: {
      marginTop: theme.spacing.xs / 2,
      alignSelf: "flex-end",
    },
    legendRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.md,
    },
    legendRowPressed: {
      opacity: 0.7,
    },
    legendDot: {
      width: 14,
      height: 14,
      borderRadius: 999,
    },
    legendLabel: {
      fontWeight: theme.typography.fontWeight.bold,
      fontSize: theme.typography.body,
      flex: 1,
    },
    legendValueWrap: {
      flexDirection: "column",
      alignItems: "flex-end",
      gap: 2,
    },
    legendValue: {
      fontWeight: theme.typography.fontWeight.bold,
      fontSize: theme.typography.body,
      color: theme.colors.fg,
    },
  });

export type StatsPanelStyles = ReturnType<typeof makeStatsPanelStyles>;

export function useStatsPanelStyles() {
  const { theme } = useTheme();
  return makeStatsPanelStyles(theme);
}
