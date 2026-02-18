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
  /** Title (required). */
  title: string | ReactNode;
  /**
   * Optional panel below title. ReactNode = custom content (define in screen). true = default search+add+filter panel (use filterPanelProps).
   */
  filterPanel?: boolean | ReactNode;
  filterPanelProps?: DefaultFilterPanelProps;
  /** When true, body is ScrollView (title + panel + children scroll together). When false, header + View(children). */
  scrollable?: boolean;
  /** When true, render only the header block (for FlatList ListHeaderComponent). Ignores children and scrollable. */
  listHeaderOnly?: boolean;
  contentContainerStyle?: object;
}>;

/**
 * One layout: title (required) + optional filterPanel. Either wraps children in ScrollView/View, or renders only header (listHeaderOnly for FlatList).
 */
export function ScreenLayout({
  title,
  filterPanel = false,
  filterPanelProps,
  scrollable = true,
  listHeaderOnly = false,
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

  const headerContent = (
    <>
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
    </>
  );

  const header = (headerStyle: object, fullWidthBorder?: boolean) => {
    if (fullWidthBorder) {
      return (
        <View
          style={[
            styles.headerOuterFullWidth,
            hasPanel ? styles.headerBlockBorder : undefined,
            { backgroundColor: theme.colors.bg },
          ]}
        >
          <View style={styles.headerInner}>{headerContent}</View>
        </View>
      );
    }
    return (
      <View
        style={[
          headerStyle,
          hasPanel ? styles.headerBlockBorder : undefined,
          { backgroundColor: theme.colors.bg },
        ]}
      >
        {headerContent}
      </View>
    );
  };

  if (listHeaderOnly) {
    return header(styles.headerBlockInScroll, true);
  }
  if (scrollable) {
    return (
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
        {header(styles.headerBlockInScroll, true)}
        {children}
      </ScrollView>
    );
  }
  return (
    <>
      {header(styles.headerBlock)}
      <View style={[styles.bodyContent, contentContainerStyle]}>
        {children}
      </View>
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
    headerBlock: {
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.layout.contentPaddingHorizontal,
    },
    /** Header inside ScrollView: no horizontal padding (content container has it). */
    headerBlockInScroll: {
      paddingVertical: theme.spacing.md,
    },
    /** Full-width header wrapper: negative margin so border spans screen width. */
    headerOuterFullWidth: {
      marginHorizontal: -theme.layout.contentPaddingHorizontal,
      paddingVertical: theme.spacing.md,
    },
    /** Inner padding to align with scroll content. */
    headerInner: {
      paddingHorizontal: theme.layout.contentPaddingHorizontal,
    },
    headerBlockBorder: {
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    titleRow: {
      gap: theme.spacing.xs / 2,
    },
    title: {
      fontSize: theme.typography.largeTitle,
      fontWeight: theme.typography.fontWeight.bold,
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
      fontWeight: theme.typography.fontWeight.bold,
    },
    bodyScroll: {
      flex: 1,
    },
    /** For ScrollView: no flex so content can grow and scroll. */
    bodyContentScroll: {
      paddingHorizontal: theme.layout.contentPaddingHorizontal,
      paddingBottom: theme.spacing.xl * 2,
    },
    /** For View (scrollable=false): flex so container fills space. */
    bodyContent: {
      flex: 1,
      paddingHorizontal: theme.layout.contentPaddingHorizontal,
    },
  });
