import { useMemo } from "react";
import { StyleSheet, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "../../ThemeProvider";

export type SearchBarProps = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
};

export function SearchBar({
  value,
  onChangeText,
  placeholder = "Search",
}: SearchBarProps) {
  const { theme, mode } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <View
      style={[
        styles.row,
        {
          borderBottomColor: theme.colors.border,
          backgroundColor: theme.colors.bg,
        },
      ]}
    >
      <View
        style={[
          styles.inputWrap,
          {
            backgroundColor: theme.colors.card,
            borderColor: theme.colors.border,
          },
        ]}
      >
        <Ionicons
          name="search-outline"
          size={20}
          color={theme.colors.accent}
          style={styles.searchIcon}
        />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.muted}
          style={[styles.input, { color: theme.colors.fg }]}
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
          keyboardAppearance={mode === "dark" ? "dark" : "light"}
          returnKeyType="search"
        />
      </View>
    </View>
  );
}

const makeStyles = (theme: { spacing: any; radius: any; typography: any }) =>
  StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
      paddingBottom: theme.spacing.md,
    },
    inputWrap: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      height: 36,
      borderRadius: theme.radius.md,
      paddingLeft: theme.spacing.sm,
    },
    searchIcon: {
      marginRight: theme.spacing.xs,
    },
    input: {
      flex: 1,
      height: 36,
      paddingVertical: 0,
      paddingRight: theme.spacing.sm,
      fontSize: theme.typography.body,
    },
  });
