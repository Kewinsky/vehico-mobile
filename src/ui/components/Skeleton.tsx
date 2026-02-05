import { StyleSheet, View } from "react-native";
import { useMemo } from "react";

import { useTheme } from "../ThemeProvider";

type BlockProps = {
  height?: number;
  width?: number | string;
  radius?: number;
  style?: any;
};

export function SkeletonBlock({
  height = 12,
  width = "100%",
  radius,
  style,
}: BlockProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  return (
    <View
      style={[
        styles.block,
        {
          height,
          width,
          borderRadius: radius ?? theme.radius.sm,
          backgroundColor: theme.colors.border,
        },
        style,
      ]}
    />
  );
}

type ListProps = {
  rows?: number;
  style?: any;
};

export function SkeletonList({ rows = 6, style }: ListProps) {
  const { theme } = useTheme();
  return (
    <View style={style}>
      {Array.from({ length: rows }).map((_, i) => (
        <View key={i} style={{ marginBottom: theme.spacing.sm }}>
          <SkeletonBlock height={18} width="65%" />
          <View style={{ height: theme.spacing.xs }} />
          <SkeletonBlock height={12} width="45%" />
        </View>
      ))}
    </View>
  );
}

const makeStyles = (_theme: any) =>
  StyleSheet.create({
    block: {
      opacity: 0.55,
    },
  });

