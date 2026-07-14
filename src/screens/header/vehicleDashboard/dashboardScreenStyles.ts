import { StyleSheet } from "react-native";

import type { AppTheme } from "../../../ui/theme";

export function makeDashboardScreenStyles(
  theme: AppTheme,
  insets: { bottom: number },
) {
  return StyleSheet.create({
    scrollContent: {
      paddingBottom: Math.max(
        theme.spacing.xl,
        insets.bottom + theme.spacing.md,
      ),
    },
    carouselGlow: {
      position: "absolute",
      top: 0,
      left: 0,
      zIndex: 0,
    },
    vehicleImageContainer: {
      position: "relative",
      zIndex: 1,
      overflow: "hidden",
      borderBottomLeftRadius: theme.radius.xl,
      borderBottomRightRadius: theme.radius.xl,
    },
    vehicleImagePlaceholder: {
      width: "100%",
      height: "100%",
      backgroundColor: theme.colors.border,
      alignItems: "center",
      justifyContent: "center",
    },
    page: {
      paddingHorizontal: theme.layout.contentPaddingHorizontal,
    },
    periodTabs: {
      marginBottom: theme.spacing.xs,
    },
    tilesWrap: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.sm,
    },
    tileWrapper: {},
    reminderTileIconWrap: {
      position: "relative",
    },
    reminderBadge: {
      position: "absolute",
      top: -8,
      right: -14,
      minWidth: 18,
      height: 18,
      borderRadius: 999,
      paddingHorizontal: 5,
      backgroundColor: theme.colors.danger,
      alignItems: "center",
      justifyContent: "center",
    },
    reminderBadgeText: {
      color: "#FFFFFF",
      fontSize: theme.typography.xs,
      fontWeight: theme.typography.fontWeight.bold,
      lineHeight: 14,
    },
    headerRightActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
    },
    fullScreenOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.95)",
      justifyContent: "center",
    },
    fullScreenClose: {
      position: "absolute",
      right: theme.spacing.md,
      zIndex: 10,
      width: theme.spacing.xl + theme.spacing.lg,
      height: theme.spacing.xl + theme.spacing.lg,
      borderRadius: (theme.spacing.xl + theme.spacing.lg) / 2,
      backgroundColor: "rgba(0,0,0,0.4)",
      alignItems: "center",
      justifyContent: "center",
    },
    datePickerOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.55)",
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: theme.layout.contentPaddingHorizontal,
    },
    datePickerCard: {
      width: "100%",
      maxWidth: 360,
      alignSelf: "center",
      borderRadius: theme.radius.xl,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
      backgroundColor: "transparent",
      overflow: "hidden",
    },
    datePickerContent: {
      width: "100%",
      alignItems: "center",
    },
    datePickerNative: {
      alignSelf: "center",
    },
    datePickerActions: {
      width: "100%",
      flexDirection: "row",
      justifyContent: "flex-end",
      paddingTop: theme.spacing.xs,
      gap: theme.spacing.xl,
    },
    datePickerActionText: {
      fontSize: theme.typography.body,
      fontWeight: theme.typography.fontWeight.bold,
    },
    qrModalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.55)",
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: theme.layout.contentPaddingHorizontal,
    },
    qrModalCard: {
      width: "100%",
      maxWidth: 320,
      borderRadius: theme.radius.xl,
      padding: theme.spacing.md,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    },
    qrModalClose: {
      position: "absolute",
      top: theme.spacing.sm,
      right: theme.spacing.sm,
      zIndex: 10,
      width: 34,
      height: 34,
      alignItems: "center",
      justifyContent: "center",
    },
    qrModalSubtitle: {
      marginTop: theme.spacing.xl,
      paddingHorizontal: theme.spacing.sm,
      fontSize: theme.typography.small,
      lineHeight: theme.typography.body + 2,
      textAlign: "center",
    },
    qrModalActions: {
      width: "100%",
      gap: theme.spacing.xs,
    },
    qrShareButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: theme.spacing.xs,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.radius.lg,
      backgroundColor: theme.colors.card,
    },
    qrShareButtonText: {
      fontSize: theme.typography.body,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    qrWrap: {
      margin: theme.spacing.xl,
    },
  });
}

export const carouselInlineStyles = {
  paginationOverlay: (theme: AppTheme) => ({
    position: "absolute" as const,
    bottom: theme.spacing.md,
    left: theme.spacing.md,
    zIndex: 10,
  }),
  paginationDot: {
    backgroundColor: "rgba(255,255,255,0.5)",
    borderRadius: 999,
  },
  activePaginationDot: (theme: AppTheme) => ({
    backgroundColor: theme.colors.accent,
    borderRadius: 999,
  }),
  expandButton: (theme: AppTheme) => ({
    position: "absolute" as const,
    bottom: theme.spacing.md,
    right: theme.spacing.md,
    zIndex: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  }),
};
