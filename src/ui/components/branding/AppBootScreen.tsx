import { useMemo } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from "react-native";

import { APP_DISPLAY_NAME } from "../../../config/appBrand";
import { getTheme } from "../../theme";
import { BRAND_FONT_FAMILY } from "./BrandHero";
import { Logo } from "./Logo";

type AppBootScreenProps = {
  /** When false, the brand font may still be loading. */
  fontsReady?: boolean;
};

export function AppBootScreen({ fontsReady = true }: AppBootScreenProps) {
  const colorScheme = useColorScheme();
  const theme = useMemo(
    () => getTheme(colorScheme === "dark" ? "dark" : "light"),
    [colorScheme],
  );
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <View style={styles.root}>
      <View style={styles.content}>
        <Logo width={88} height={88} />
        <Text
          style={[
            styles.title,
            fontsReady ? { fontFamily: BRAND_FONT_FAMILY } : null,
          ]}
        >
          {APP_DISPLAY_NAME}
        </Text>
        <ActivityIndicator
          color={theme.colors.accent}
          style={styles.spinner}
          size="small"
        />
      </View>
    </View>
  );
}

const makeStyles = (theme: ReturnType<typeof getTheme>) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: theme.colors.bg,
      alignItems: "center",
      justifyContent: "center",
    },
    content: {
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: theme.spacing.xl,
    },
    title: {
      marginTop: theme.spacing.md,
      fontSize: theme.typography.largeTitle,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.fg,
      letterSpacing: 0.3,
    },
    spinner: {
      marginTop: theme.spacing.lg,
    },
  });
