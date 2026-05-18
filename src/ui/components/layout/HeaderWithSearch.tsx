import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "../../ThemeProvider";
import { ModalButton } from "./ModalButton";

export type HeaderWithSearchProps = {
  /** Current search query (controlled). */
  query: string;
  /** Called when the user types in the search field. */
  onQueryChange: (query: string) => void;
  /** Placeholder for the search input. */
  placeholder?: string;
  /** Label for the cancel button (e.g. t("common.cancel")). */
  cancelLabel?: string;
  /** Renders the default header (e.g. AppNavbar). Receives openSearch and whether search has active query for icon styling. */
  renderHeaderContent: (
    openSearch: () => void,
    hasSearchQuery: boolean,
  ) => ReactNode;
};

export function HeaderWithSearch({
  query,
  onQueryChange,
  placeholder,
  cancelLabel = "Cancel",
  renderHeaderContent,
}: HeaderWithSearchProps) {
  const { theme, mode } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [searchBarVisible, setSearchBarVisible] = useState(false);
  const searchInputRef = useRef<TextInput>(null);
  const expandProgress = useSharedValue(0);

  const openSearch = useCallback(() => {
    setSearchBarVisible(true);
    expandProgress.value = withTiming(1, { duration: 220 });
  }, [expandProgress]);

  const closeSearch = useCallback(() => {
    setSearchBarVisible(false);
    expandProgress.value = withTiming(0, { duration: 200 });
  }, [expandProgress]);

  useEffect(() => {
    if (searchBarVisible) {
      const t = setTimeout(() => searchInputRef.current?.focus(), 100);
      return () => clearTimeout(t);
    }
  }, [searchBarVisible]);

  const hasSearchQuery = query.trim().length > 0;

  const navAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(expandProgress.value, [0, 1], [1, 0]),
    transform: [
      { translateX: interpolate(expandProgress.value, [0, 1], [0, -12]) },
    ],
  }));

  const searchBarAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(expandProgress.value, [0, 1], [0, 1]),
    transform: [
      { translateX: interpolate(expandProgress.value, [0, 1], [24, 0]) },
    ],
  }));

  const headerHeight = theme.spacing.lg * 2 + theme.spacing.sm;

  return (
    <View style={[styles.container, { height: headerHeight }]}>
      <Animated.View
        style={[styles.layer, { height: headerHeight }, navAnimatedStyle]}
        pointerEvents={searchBarVisible ? "none" : "auto"}
      >
        {renderHeaderContent(openSearch, hasSearchQuery)}
      </Animated.View>
      <Animated.View
        style={[
          styles.searchBarLayer,
          {
            height: headerHeight,
            paddingHorizontal: theme.layout.contentPaddingHorizontal,
            borderBottomColor: theme.colors.border,
            backgroundColor: theme.colors.bg,
          },
          searchBarAnimatedStyle,
        ]}
        pointerEvents={searchBarVisible ? "auto" : "none"}
      >
        <View
          style={[
            styles.searchInputWrap,
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
            ref={searchInputRef}
            value={query}
            onChangeText={onQueryChange}
            placeholder={placeholder}
            placeholderTextColor={theme.colors.muted}
            style={[styles.searchInput, { color: theme.colors.fg }]}
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
            keyboardAppearance={mode === "dark" ? "dark" : "light"}
            returnKeyType="search"
          />
        </View>
        <ModalButton variant="cancel" onPress={closeSearch}>
          {cancelLabel}
        </ModalButton>
      </Animated.View>
    </View>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      position: "relative",
      overflow: "hidden",
    },
    layer: {
      position: "absolute",
      left: 0,
      right: 0,
      top: 0,
    },
    searchBarLayer: {
      position: "absolute",
      left: 0,
      right: 0,
      top: 0,
      flexDirection: "row",
      alignItems: "center",
      borderBottomWidth: 1,
    },
    searchInputWrap: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      height: 36,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      paddingLeft: theme.spacing.sm,
    },
    searchIcon: {
      marginRight: theme.spacing.xs,
    },
    searchInput: {
      flex: 1,
      height: 36,
      paddingVertical: 0,
      paddingRight: theme.spacing.sm,
      fontSize: theme.typography.body,
    },
  });
