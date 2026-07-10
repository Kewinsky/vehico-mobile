import { StyleSheet } from "react-native";

import { useTheme } from "../../../ui/ThemeProvider";

export function useMenuPageStyles() {
  const { theme } = useTheme();
  return StyleSheet.create({
    page: {
      alignSelf: "stretch",
    },
    tilesWrap: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.sm,
      justifyContent: "center",
    },
    tileWrapper: {
      width: "48%",
    },
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
  });
}
