import { StyleSheet } from "react-native";

import { useTheme } from "../../../../ui/ThemeProvider";

export function useOverviewPanelStyles() {
  const { theme } = useTheme();
  return StyleSheet.create({
    page: {
      paddingHorizontal: theme.layout.contentPaddingHorizontal,
      paddingTop: theme.spacing.md,
    },
    vehicleHeaderRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.md,
    },
    vehicleHeaderText: {
      flex: 1,
      minWidth: 0,
    },
    title: {
      color: theme.colors.fg,
      fontSize: theme.typography.largeTitle,
      fontWeight: theme.typography.fontWeight.bold,
    },
    vinRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
      marginTop: theme.spacing.xs,
    },
    vinText: {
      color: theme.colors.muted,
      fontSize: theme.typography.small,
      fontWeight: theme.typography.fontWeight.medium,
    },
    publicPageCircleButton: {
      width: 44,
      height: 44,
      borderRadius: 999,
      backgroundColor: theme.colors.accent,
      alignItems: "center",
      justifyContent: "center",
    },
    panelSections: {
      gap: theme.spacing.xl,
    },
    sectionBlock: {
      gap: theme.spacing.sm,
    },
    sectionTitle: {
      color: theme.colors.fg,
      fontSize: theme.typography.title,
      fontWeight: theme.typography.fontWeight.bold,
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
    pageSubTitle: {
      color: theme.colors.muted,
      fontSize: theme.typography.small,
    },
    quickMetricsCard: {
      borderRadius: theme.radius.xl,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.sm,
    },
    quickMetricsRow: {
      flexDirection: "row",
      alignItems: "stretch",
      justifyContent: "space-between",
      gap: 0,
    },
    quickMetricCell: {
      flex: 1,
      minWidth: 0,
      alignItems: "center",
      gap: theme.spacing.xs / 2,
      paddingHorizontal: theme.spacing.xs / 2,
    },
    quickMetricPrimary: {
      fontSize: theme.typography.largeTitle,
      fontWeight: theme.typography.fontWeight.bold,
      textAlign: "center",
      width: "100%",
      lineHeight: theme.typography.largeTitle + 4,
    },
    quickMetricInlineUnit: {
      fontSize: theme.typography.small,
      fontWeight: theme.typography.fontWeight.medium,
    },
    quickMetricSecondary: {
      fontSize: theme.typography.small,
      fontWeight: theme.typography.fontWeight.medium,
      textAlign: "center",
      width: "100%",
    },
    infoCard: {
      borderRadius: theme.radius.xl,
      padding: theme.spacing.md,
      gap: theme.spacing.md,
    },
    infoCardTitle: {
      fontSize: theme.typography.title,
      fontWeight: theme.typography.fontWeight.bold,
    },
    detailsGrid: {
      gap: theme.spacing.lg,
    },
    detailsRow: {
      flexDirection: "row",
      gap: theme.spacing.xs,
      alignItems: "flex-start",
    },
    quickActionsRow: {
      flexDirection: "row",
      alignItems: "stretch",
      gap: theme.spacing.sm,
    },
    quickActionCard: {
      flex: 1,
      aspectRatio: 1,
      borderRadius: theme.radius.xl,
      alignItems: "center",
      justifyContent: "center",
      gap: theme.spacing.xs,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.sm,
    },
    quickActionIcon: {
      opacity: 0.95,
    },
    quickActionLabel: {
      fontSize: theme.typography.body,
      fontWeight: theme.typography.fontWeight.bold,
      textAlign: "center",
    },
    upcomingRemindersList: {
      gap: theme.spacing.sm,
    },
    tilesRow: {
      flexDirection: "row",
      gap: theme.spacing.sm,
      alignItems: "stretch",
    },
    formalityTileTrigger: {
      flex: 1,
      alignSelf: "stretch",
    },
    notesText: {
      fontSize: theme.typography.body,
      lineHeight: theme.typography.body + 6,
    },
    dashboardStatTileValueMain: {
      fontWeight: theme.typography.fontWeight.bold,
      fontSize: theme.typography.title,
    },
    fittedSetsList: {
      flex: 1,
      gap: theme.spacing.xs,
    },
  });
}

export type OverviewPanelStyles = ReturnType<typeof useOverviewPanelStyles>;
