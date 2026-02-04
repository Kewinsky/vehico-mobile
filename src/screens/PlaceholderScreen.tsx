import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Screen } from "../ui/components/Screen";
import { useTheme } from "../ui/ThemeProvider";

export function PlaceholderScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <Screen>
      <View style={styles.container}>
        <Text style={styles.text}>Placeholder</Text>
      </View>
    </Screen>
  );
}

function makeStyles(theme: {
  colors: { fg: string; muted: string };
  spacing: { lg: number };
  typography: { title: number };
}) {
  return StyleSheet.create({
    container: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: theme.spacing.lg,
    },
    text: {
      fontSize: theme.typography.title,
      color: theme.colors.muted ?? theme.colors.fg,
    },
  });
}
