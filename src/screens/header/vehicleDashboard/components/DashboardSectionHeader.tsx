import type { ReactNode } from "react";
import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";

import { useTheme } from "../../../../ui/ThemeProvider";

const ACCENT_HEIGHT = 20;
const ACCENT_WIDTH = 4;

export function SectionTitleAccent() {
  const { theme } = useTheme();

  return (
    <View
      style={[styles.accent, { backgroundColor: theme.colors.accent }]}
    />
  );
}

type DashboardSectionHeaderProps = {
  title: string;
  titleStyle?: StyleProp<TextStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  right?: ReactNode;
  inlineTrailing?: ReactNode;
};

export function DashboardSectionHeader({
  title,
  titleStyle,
  containerStyle,
  right,
  inlineTrailing,
}: DashboardSectionHeaderProps) {
  const { theme } = useTheme();
  const titleStyles: StyleProp<TextStyle> = [
    {
      fontSize: theme.typography.title,
      fontWeight: theme.typography.fontWeight.bold,
      flexShrink: 1,
    },
    titleStyle,
    { color: theme.colors.fg },
  ];

  if (right) {
    return (
      <View style={[styles.row, { gap: theme.spacing.sm }, containerStyle]}>
        <View style={[styles.titleGroup, { gap: theme.spacing.sm }]}>
          <SectionTitleAccent />
          <Text style={titleStyles} numberOfLines={2}>
            {title}
          </Text>
        </View>
        {right}
      </View>
    );
  }

  return (
    <View style={[styles.inline, { gap: theme.spacing.sm }, containerStyle]}>
      <SectionTitleAccent />
      <Text style={titleStyles}>{title}</Text>
      {inlineTrailing}
    </View>
  );
}

const styles = StyleSheet.create({
  accent: {
    width: ACCENT_WIDTH,
    height: ACCENT_HEIGHT,
    borderRadius: 999,
    flexShrink: 0,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  titleGroup: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    minWidth: 0,
  },
  inline: {
    flexDirection: "row",
    alignItems: "center",
  },
});
