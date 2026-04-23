import { Ionicons } from "@expo/vector-icons";
import { Weight } from "lucide-react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

import type { VehicleWheel } from "../../../types/domain";
import { formatWheelDimensions } from "../../../services/wheels/wheelsRepo";
import { useTheme } from "../../ThemeProvider";
import type { AppTheme } from "../../theme";
import { BoltTypeIcon } from "../icons/BoltTypeIcon";

type WheelItemProps = {
  wheel: VehicleWheel;
  onPress?: () => void;
};

export function WheelItem({ wheel, onPress }: WheelItemProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  const [expanded, setExpanded] = useState(false);
  const chevronAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(chevronAnim, {
      toValue: expanded ? 1 : 0,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [expanded, chevronAnim]);

  const summary = useMemo(() => {
    const parts = [
      formatWheelDimensions(wheel.width_inch, wheel.diameter_inch),
    ];
    if (wheel.et_offset != null) parts.push(`ET${wheel.et_offset}`);
    if (wheel.bolt_pattern?.trim()) parts.push(wheel.bolt_pattern.trim());
    return parts.join(" · ");
  }, [wheel]);

  const details = useMemo(
    () => [
      {
        key: "center_bore",
        icon: (
          <Ionicons
            name="radio-button-on-outline"
            size={16}
            color={theme.colors.muted}
          />
        ),
        label: t("wheelForm.centerBore"),
        value:
          wheel.center_bore_mm != null
            ? `${wheel.center_bore_mm} mm`
            : t("common.no", { defaultValue: "—" }),
      },
      {
        key: "bolt_type",
        icon: <BoltTypeIcon size={16} color={theme.colors.muted} />,
        label: t("wheelForm.boltType"),
        value: wheel.bolt_type?.trim() || t("common.no", { defaultValue: "—" }),
      },
      {
        key: "weight",
        icon: <Weight size={16} color={theme.colors.muted} />,
        label: t("wheelForm.weight"),
        value:
          wheel.weight_kg != null
            ? `${wheel.weight_kg} kg`
            : t("common.no", { defaultValue: "—" }),
      },
    ],
    [t, theme.colors.muted, wheel],
  );

  const content = (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.headerMain}>
          <View style={styles.row1}>
            <Text
              style={[styles.title, { color: theme.colors.fg }]}
              numberOfLines={1}
            >
              {wheel.name}
            </Text>
            {wheel.is_currently_fitted ? (
              <View
                style={[styles.badge, { backgroundColor: theme.colors.accent }]}
              >
                <Text style={styles.badgeText}>
                  {t("wheels.currentlyFitted")}
                </Text>
              </View>
            ) : null}
          </View>
          <Text
            style={[styles.summary, { color: theme.colors.muted }]}
            numberOfLines={1}
          >
            {summary}
          </Text>
        </View>
        <Pressable
          onPress={(event) => {
            event.stopPropagation();
            setExpanded((prev) => !prev);
          }}
          style={({ pressed }) => [
            styles.toggleButton,
            {
              backgroundColor: theme.colors.accent,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <Animated.View
            style={{
              transform: [
                {
                  rotate: chevronAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ["0deg", "180deg"],
                  }),
                },
              ],
            }}
          >
            <Ionicons name="chevron-down" size={18} color="#000000" />
          </Animated.View>
        </Pressable>
      </View>

      {expanded ? (
        <View style={styles.detailsWrap}>
          {details.map((detail) => (
            <View key={detail.key} style={styles.detailRow}>
              <View style={styles.detailLeft}>
                {detail.icon}
                <Text
                  style={[styles.detailLabel, { color: theme.colors.muted }]}
                >
                  {detail.label}
                </Text>
              </View>
              <Text
                style={[styles.detailValue, { color: theme.colors.fg }]}
                numberOfLines={1}
              >
                {detail.value}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [{ opacity: pressed ? 0.94 : 1 }]}
      >
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
      gap: theme.spacing.xs / 2,
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    headerMain: {
      flex: 1,
      minWidth: 0,
      gap: theme.spacing.xs / 2,
    },
    row1: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
      alignSelf: "flex-start",
      maxWidth: "100%",
    },
    title: {
      flexShrink: 1,
      minWidth: 0,
      fontSize: theme.typography.body,
      fontWeight: theme.typography.fontWeight.bold,
    },
    badge: {
      borderRadius: 999,
      paddingHorizontal: theme.spacing.xs,
      paddingVertical: theme.spacing.xs / 2,
    },
    badgeText: {
      fontSize: theme.typography.xs,
      fontWeight: theme.typography.fontWeight.bold,
      color: "#000000",
    },
    summary: {
      fontSize: theme.typography.small,
      lineHeight: theme.typography.body + 2,
    },
    toggleButton: {
      width: 28,
      height: 28,
      borderRadius: theme.radius.md,
      alignItems: "center",
      justifyContent: "center",
    },
    detailsWrap: {
      marginTop: theme.spacing.xs,
      gap: theme.spacing.xs,
    },
    detailRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: theme.spacing.sm,
    },
    detailLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs / 2,
      flex: 1,
      minWidth: 0,
    },
    detailLabel: {
      fontSize: theme.typography.small,
    },
    detailValue: {
      maxWidth: "55%",
      fontSize: theme.typography.small,
      fontWeight: theme.typography.fontWeight.medium,
      textAlign: "right",
    },
  });
