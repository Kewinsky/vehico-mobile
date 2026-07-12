import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import type { AppTheme } from "../../../../../ui/theme";
import type { StatsPanelStyles } from "../statsPanelStyles";

export type StatTileProps = {
  icon?: keyof typeof Ionicons.glyphMap;
  iconComponent?: ReactNode;
  label?: ReactNode;
  valueMain: string;
  valueMainRollingValue?: number;
  valueSuffix?: string;
  theme: AppTheme;
  styles: StatsPanelStyles;
  fullWidth?: boolean;
  onPress?: () => void;
  accessibilityHint?: string;
  layout?: "default" | "iconLeading";
  accessibilityLabel?: string;
};

export function StatTile({
  icon,
  iconComponent,
  label,
  valueMain,
  valueMainRollingValue,
  valueSuffix,
  theme,
  styles,
  fullWidth,
  onPress,
  accessibilityHint,
  layout = "default",
  accessibilityLabel,
}: StatTileProps) {
  const defaultA11yLabel =
    accessibilityLabel ?? (typeof label === "string" ? label : undefined);

  if (layout === "iconLeading") {
    const valueA11y = `${valueMain}${
      valueSuffix != null && valueSuffix !== "" ? ` ${valueSuffix}` : ""
    }`;
    const iconLeadingA11y =
      defaultA11yLabel != null
        ? `${defaultA11yLabel}, ${valueA11y}`
        : valueA11y;

    const leadingIcon =
      iconComponent ??
      (icon ? (
        <Ionicons name={icon} size={32} color={theme.colors.accent} />
      ) : null);
    const tileContent = (
      <View style={styles.tileIconLeadingRow}>
        <View style={styles.tileIconLeadingIcon}>{leadingIcon}</View>
        <View style={styles.tileIconLeadingValueGroup}>
          <Text
            style={[styles.tileValueMain, { color: theme.colors.fg }]}
            numberOfLines={1}
          >
            {valueMain}
          </Text>
          {valueSuffix != null && valueSuffix !== "" ? (
            <Text
              style={[styles.tileValueSuffix, { color: theme.colors.muted }]}
              numberOfLines={1}
            >
              {valueSuffix}
            </Text>
          ) : null}
          {onPress ? (
            <Ionicons
              name="swap-horizontal"
              size={18}
              color={theme.colors.muted}
              style={styles.tilePressableIcon}
            />
          ) : null}
        </View>
      </View>
    );
    const tileStyle = [
      styles.tile,
      styles.tileIconLeading,
      fullWidth && styles.tileFullWidth,
      { backgroundColor: theme.colors.card },
    ];
    if (onPress) {
      return (
        <Pressable
          style={({ pressed }) => [...tileStyle, pressed && { opacity: 0.7 }]}
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={iconLeadingA11y}
          accessibilityHint={accessibilityHint}
        >
          {tileContent}
        </Pressable>
      );
    }
    return (
      <View style={tileStyle} accessibilityLabel={iconLeadingA11y}>
        {tileContent}
      </View>
    );
  }

  const tileContent = (
    <>
      <View style={styles.tileTitleRow}>
        {iconComponent ? (
          iconComponent
        ) : icon ? (
          <Ionicons name={icon} size={24} color={theme.colors.accent} />
        ) : null}
        <Text style={[styles.tileLabel, { color: theme.colors.accent }]}>
          {label}
        </Text>
      </View>
      <View style={styles.tileValueRow}>
        <Text
          style={[styles.tileValueMain, { color: theme.colors.fg }]}
          numberOfLines={1}
        >
          {valueMain}
        </Text>
        {valueSuffix != null && valueSuffix !== "" ? (
          <Text
            style={[styles.tileValueSuffix, { color: theme.colors.muted }]}
            numberOfLines={1}
          >
            {" "}
            {valueSuffix}
          </Text>
        ) : null}
        {onPress ? (
          <Ionicons
            name="swap-horizontal"
            size={18}
            color={theme.colors.muted}
            style={styles.tilePressableIcon}
          />
        ) : null}
      </View>
    </>
  );
  const tileStyle = [
    styles.tile,
    fullWidth && styles.tileFullWidth,
    { backgroundColor: theme.colors.card },
  ];
  if (onPress) {
    return (
      <Pressable
        style={({ pressed }) => [...tileStyle, pressed && { opacity: 0.7 }]}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={defaultA11yLabel}
        accessibilityHint={accessibilityHint}
      >
        {tileContent}
      </Pressable>
    );
  }
  return <View style={tileStyle}>{tileContent}</View>;
}
