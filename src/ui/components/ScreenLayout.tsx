import type { PropsWithChildren, ReactNode } from "react";
import { useMemo } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "../ThemeProvider";

export type DefaultFilterPanelProps = {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  onAddPress?: () => void;
  addLabel?: string;
  onFilterPress?: () => void;
  filterLabel?: string;
};

export type ScreenLayoutProps = PropsWithChildren<{
  /** Main title in the fixed header. */
  title: string | ReactNode;
  /**
   * When `true`, renders the default filter panel (search bar, add button, filter button).
   * When a ReactNode, renders that custom content as the panel.
   * When `false` or undefined, no panel; no borderBottom under the header.
   */
  filterPanel?: boolean | ReactNode;
  /** Props for the default filter panel when filterPanel === true. */
  filterPanelProps?: DefaultFilterPanelProps;
  /** When true, body is a ScrollView; when false, a View. */
  scrollable?: boolean;
  /** Optional style for the scroll/content container. */
  contentContainerStyle?: object;
}>;

/**
 * Reusable layout: fixed header (title + optional filter panel) and body (ScrollView or View).
 * Use to unify screens with title, optional search/filters, and scrollable or static content.
 */
export function ScreenLayout({
  title,
  filterPanel = false,
  filterPanelProps,
  scrollable = true,
  contentContainerStyle,
  children,
}: ScreenLayoutProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const hasPanel =
    filterPanel === true || (filterPanel && typeof filterPanel === "object");

  const panelContent =
    filterPanel === true ? (
      <DefaultFilterPanel theme={theme} styles={styles} {...filterPanelProps} />
    ) : typeof filterPanel === "object" && filterPanel !== null ? (
      filterPanel
    ) : null;

  const headerBlock = (
    <View
      style={[
        styles.fixedHeader,
        hasPanel ? styles.fixedHeaderBorder : undefined,
        { backgroundColor: theme.colors.bg },
      ]}
    >
      <View style={styles.titleRow}>
        {typeof title === "string" ? (
          <Text
            style={[styles.title, { color: theme.colors.fg }]}
            numberOfLines={2}
          >
            {title}
          </Text>
        ) : (
          title
        )}
      </View>
      {panelContent ? (
        <View style={styles.panelWrap}>{panelContent}</View>
      ) : null}
    </View>
  );

  return (
    <>
      {headerBlock}

      {scrollable ? (
        <ScrollView
          style={styles.bodyScroll}
          contentContainerStyle={[
            styles.bodyContentScroll,
            contentContainerStyle,
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.bodyContent, contentContainerStyle]}>
          {children}
        </View>
      )}
    </>
  );
}

function DefaultFilterPanel({
  theme,
  styles,
  searchValue = "",
  onSearchChange,
  searchPlaceholder,
  onAddPress,
  addLabel,
  onFilterPress,
  filterLabel,
}: DefaultFilterPanelProps & {
  theme: any;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <View style={styles.defaultPanelRow}>
      {onSearchChange != null && (
        <View
          style={[
            styles.searchBarWrap,
            {
              borderColor: theme.colors.border,
              backgroundColor: theme.colors.card,
            },
          ]}
        >
          <Ionicons
            name="search-outline"
            size={20}
            color={theme.colors.muted}
            style={styles.searchBarIcon}
          />
          <TextInput
            value={searchValue}
            onChangeText={onSearchChange}
            placeholder={searchPlaceholder}
            placeholderTextColor={theme.colors.muted}
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
            style={[styles.searchBarInput, { color: theme.colors.fg }]}
          />
        </View>
      )}
      {onAddPress != null && addLabel != null && (
        <Pressable
          onPress={onAddPress}
          style={({ pressed }) => [
            styles.panelButton,
            { borderColor: theme.colors.accent, opacity: pressed ? 0.8 : 1 },
          ]}
        >
          <Ionicons name="add" size={20} color={theme.colors.accent} />
          <Text
            style={[styles.panelButtonLabel, { color: theme.colors.accent }]}
          >
            {addLabel}
          </Text>
        </Pressable>
      )}
      {onFilterPress != null && (
        <Pressable
          onPress={onFilterPress}
          style={({ pressed }) => [
            styles.panelButton,
            { borderColor: theme.colors.border, opacity: pressed ? 0.8 : 1 },
          ]}
        >
          <Ionicons name="filter-outline" size={20} color={theme.colors.fg} />
          {filterLabel != null && (
            <Text style={[styles.panelButtonLabel, { color: theme.colors.fg }]}>
              {filterLabel}
            </Text>
          )}
        </Pressable>
      )}
    </View>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    fixedHeader: {
      paddingVertical: theme.spacing.md,
      paddingHorizontal:
        theme.layout?.contentPaddingHorizontal ?? theme.spacing.md,
    },
    fixedHeaderBorder: {
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    titleRow: {
      gap: theme.spacing.xs / 2,
    },
    title: {
      fontSize: theme.typography.largeTitle,
      fontWeight: "700",
    },
    panelWrap: {
      marginTop: theme.spacing.md,
    },
    defaultPanelRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    searchBarWrap: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderRadius: theme.radius?.md ?? 12,
      height: theme.spacing.lg * 2,
      paddingLeft: theme.spacing.sm,
      minWidth: 0,
    },
    searchBarIcon: {
      marginRight: theme.spacing.xs,
    },
    searchBarInput: {
      flex: 1,
      height: "100%",
      paddingVertical: 0,
      paddingRight: theme.spacing.sm,
      fontSize: theme.typography.body,
      minWidth: 0,
    },
    panelButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
      borderWidth: 1,
      borderRadius: theme.radius?.md ?? 12,
      paddingHorizontal: theme.spacing.sm,
      height: theme.spacing.lg * 2,
    },
    panelButtonLabel: {
      fontSize: theme.typography.small,
      fontWeight: "600",
    },
    bodyScroll: {
      flex: 1,
    },
    /** For ScrollView: no flex so content can grow and scroll. */
    bodyContentScroll: {
      paddingHorizontal:
        theme.layout?.contentPaddingHorizontal ?? theme.spacing.md,
      paddingBottom: theme.spacing.xl * 2,
    },
    /** For View (scrollable=false): flex so container fills space. */
    bodyContent: {
      flex: 1,
      paddingHorizontal:
        theme.layout?.contentPaddingHorizontal ?? theme.spacing.md,
    },
  });
