import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ChevronRight } from "lucide-react-native";

import { useTheme } from "../../../../ui/ThemeProvider";

type DashboardStatTileProps = {
  icon?: keyof typeof Ionicons.glyphMap;
  iconComponent?: ReactNode;
  label: string;
  valueMain: ReactNode;
  valueMainColor?: string;
  valueSuffix?: string;
  fullWidth?: boolean;
  backgroundColor?: string;
  labelColor?: string;
  iconColor?: string;
  onPress?: () => void;
  showChevron?: boolean;
};

export function DashboardStatTile({
  icon,
  iconComponent,
  label,
  valueMain,
  valueMainColor,
  valueSuffix,
  fullWidth,
  backgroundColor,
  labelColor,
  iconColor,
  onPress,
  showChevron = false,
}: DashboardStatTileProps) {
  const { theme } = useTheme();
  const styles = makeStyles(theme);

  const tileStyle = [
    styles.dashboardStatTile,
    fullWidth && styles.dashboardStatTileFullWidth,
    { backgroundColor: backgroundColor ?? theme.colors.card },
  ];

  const tileContent = (
    <>
      <View style={styles.dashboardStatTileTitleRow}>
        {iconComponent ??
          (icon ? (
            <Ionicons
              name={icon}
              size={20}
              color={iconColor ?? theme.colors.accent}
            />
          ) : null)}
        <Text
          style={[
            styles.dashboardStatTileLabel,
            { color: labelColor ?? theme.colors.accent },
          ]}
        >
          {label}
        </Text>
        {onPress || showChevron ? (
          <ChevronRight size={18} color={iconColor ?? theme.colors.muted} />
        ) : null}
      </View>
      <View style={styles.dashboardStatTileValueRow}>
        {typeof valueMain === "string" || typeof valueMain === "number" ? (
          <Text
            style={[
              styles.dashboardStatTileValueMain,
              { color: valueMainColor ?? theme.colors.fg },
            ]}
            numberOfLines={1}
          >
            {valueMain}
          </Text>
        ) : (
          valueMain
        )}
        {valueSuffix ? (
          <Text
            style={[
              styles.dashboardStatTileValueSuffix,
              { color: theme.colors.muted },
            ]}
          >
            {" "}
            {valueSuffix}
          </Text>
        ) : null}
      </View>
    </>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [...tileStyle, pressed && { opacity: 0.85 }]}
        accessibilityRole="button"
      >
        {tileContent}
      </Pressable>
    );
  }

  return <View style={tileStyle}>{tileContent}</View>;
}

const makeStyles = (theme: ReturnType<typeof useTheme>["theme"]) =>
  StyleSheet.create({
    dashboardStatTile: {
      flex: 1,
      width: "100%",
      borderRadius: theme.radius.xl,
      padding: theme.spacing.md,
      justifyContent: "space-between",
    },
    dashboardStatTileFullWidth: {
      flex: undefined,
      width: "100%",
    },
    dashboardStatTileTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
      paddingBottom: theme.spacing.xs,
    },
    dashboardStatTileLabel: {
      fontWeight: theme.typography.fontWeight.regular,
      fontSize: theme.typography.body,
      flex: 1,
    },
    dashboardStatTileValueRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "baseline",
    },
    dashboardStatTileValueMain: {
      fontWeight: theme.typography.fontWeight.bold,
      fontSize: theme.typography.title,
    },
    dashboardStatTileValueSuffix: {
      fontWeight: theme.typography.fontWeight.regular,
      fontSize: theme.typography.small,
    },
  });
