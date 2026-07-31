import { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useTheme } from "../../ThemeProvider";

export type FormPresetChipItem = {
  id: string;
  title: string;
  /** Up to 2 lines shown under the title. */
  summaryLines?: string[];
};

type FormPresetChipsProps = {
  sectionTitle: string;
  items: FormPresetChipItem[];
  onSelect: (id: string) => void;
};

export function FormPresetChips({
  sectionTitle,
  items,
  onSelect,
}: FormPresetChipsProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  if (items.length === 0) return null;

  return (
    <>
      <Text style={[styles.sectionLabel, { color: theme.colors.muted }]}>
        {sectionTitle}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {items.map((item) => {
          const summaryLines = (item.summaryLines ?? []).slice(0, 2);
          return (
            <Pressable
              key={item.id}
              onPress={() => onSelect(item.id)}
              style={({ pressed }) => [
                styles.chip,
                pressed && { opacity: 0.85 },
              ]}
            >
              <Text
                style={[styles.chipTitle, { color: theme.colors.fg }]}
                numberOfLines={2}
              >
                {item.title}
              </Text>
              {summaryLines.length > 0 ? (
                <View style={styles.chipSummaryWrap}>
                  {summaryLines.map((line, idx) => (
                    <Text
                      key={`${item.id}-summary-${idx}`}
                      style={[
                        styles.chipSummary,
                        { color: theme.colors.muted },
                      ]}
                      numberOfLines={1}
                    >
                      {line}
                    </Text>
                  ))}
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>
      <View style={{ height: theme.spacing.sm }} />
    </>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    sectionLabel: {
      fontSize: theme.typography.small,
      fontWeight: theme.typography.fontWeight.semibold,
      marginBottom: theme.spacing.sm,
      paddingHorizontal: theme.layout.contentPaddingHorizontal,
    },
    scrollContent: {
      paddingHorizontal: theme.layout.contentPaddingHorizontal,
      gap: theme.spacing.sm,
    },
    chip: {
      borderRadius: theme.radius.xl,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
      backgroundColor: theme.colors.card,
    },
    chipTitle: {
      fontSize: theme.typography.body,
      fontWeight: theme.typography.fontWeight.bold,
    },
    chipSummaryWrap: {
      marginTop: theme.spacing.sm,
    },
    chipSummary: {
      fontSize: theme.typography.small,
    },
  });
