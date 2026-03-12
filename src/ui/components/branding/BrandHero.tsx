import { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "../../ThemeProvider";
import { Logo } from "./Logo";
import { hexToRgba } from "../common/ChoiceChip";

type HeroIconName = React.ComponentProps<typeof Ionicons>["name"];

/** Font family for app name "Vehico". Load via useFonts in Root. */
export const BRAND_FONT_FAMILY = "ChironGoRoundTC";

type Props = {
  title: string;
  subtitle: string;
  brandTitle?: boolean;
  floatingIcons?: HeroIconName[];
};

const DEFAULT_ICONS: HeroIconName[] = [
  "car-sport-outline",
  "document-text-outline",
  "speedometer-outline",
  "notifications-outline",
];

const ICON_POSITIONS = [
  { top: 8, left: 8, rotate: "-8deg" },
  { top: 10, right: 6, rotate: "9deg" },
  { bottom: 12, left: 18, rotate: "7deg" },
  { bottom: 8, right: 14, rotate: "-10deg" },
] as const;

export function BrandHero({
  title,
  subtitle,
  brandTitle = false,
  floatingIcons = DEFAULT_ICONS,
}: Props) {
  const { theme } = useTheme();
  const styles = useMemo(
    () => makeStyles(theme, brandTitle),
    [theme, brandTitle],
  );
  const floats = useRef(floatingIcons.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    const loops = floats.map((value, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(index * 180),
          Animated.timing(value, {
            toValue: 1,
            duration: 1800,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(value, {
            toValue: 0,
            duration: 1800,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      ),
    );
    loops.forEach((loop) => loop.start());
    return () => loops.forEach((loop) => loop.stop());
  }, [floats]);

  const logoSize = 132;

  return (
    <View style={styles.wrapper}>
      <View style={styles.logoStage}>
        <Logo width={logoSize} height={logoSize} />
        {floatingIcons
          .slice(0, ICON_POSITIONS.length)
          .map((iconName, index) => {
            const position = ICON_POSITIONS[index];
            const translateY = floats[index].interpolate({
              inputRange: [0, 0.5, 1],
              outputRange: [0, -10, 0],
            });
            const scale = floats[index].interpolate({
              inputRange: [0, 0.5, 1],
              outputRange: [1, 1.04, 1],
            });

            return (
              <Animated.View
                key={`${iconName}-${index}`}
                style={[
                  styles.floatingBadge,
                  position,
                  {
                    transform: [{ translateY }, { scale }],
                  },
                ]}
              >
                <Ionicons
                  name={iconName}
                  size={20}
                  color={theme.colors.accent}
                />
              </Animated.View>
            );
          })}
      </View>

      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
    </View>
  );
}

const makeStyles = (theme: any, brandTitle: boolean) =>
  StyleSheet.create({
    wrapper: {
      alignItems: "center",
      gap: theme.spacing.md,
    },
    logoStage: {
      width: 224,
      height: 196,
      justifyContent: "center",
      alignItems: "center",
    },
    floatingBadge: {
      position: "absolute",
      width: 44,
      height: 44,
      borderRadius: 999,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: hexToRgba(theme.colors.accent, 0.12),
      borderWidth: 1,
      borderColor: hexToRgba(theme.colors.accent, 0.35),
    },
    copy: {
      alignItems: "center",
      gap: theme.spacing.xs,
      width: "100%",
    },
    title: {
      color: theme.colors.fg,
      fontSize: theme.typography.largeTitle + 6,
      fontWeight: "900" as const,
      fontFamily: brandTitle ? BRAND_FONT_FAMILY : undefined,
      textAlign: "center",
      letterSpacing: -0.7,
    },
    subtitle: {
      color: theme.colors.muted,
      fontSize: theme.typography.body,
      lineHeight: theme.typography.body + 8,
      textAlign: "center",
      maxWidth: 360,
    },
  });
