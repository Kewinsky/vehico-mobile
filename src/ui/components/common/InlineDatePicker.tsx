import DateTimePicker from "@react-native-community/datetimepicker";
import { useMemo } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

import { useTheme } from "../../ThemeProvider";
import { hexToRgba } from "./ChoiceChip";

type InlineDatePickerProps = {
  value: Date;
  onChangeDraft: (value: Date) => void;
  onConfirm: (value: Date) => void;
  onCancel: () => void;
};

export function InlineDatePicker({
  value,
  onChangeDraft,
  onConfirm,
  onCancel,
}: InlineDatePickerProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const accentBg = useMemo(
    () => hexToRgba(theme.colors.accent, 0.15),
    [theme.colors.accent],
  );

  return (
    <View style={styles.pickerWrap}>
      <DateTimePicker
        value={value}
        mode="date"
        display={Platform.OS === "ios" ? "spinner" : "default"}
        themeVariant={
          Platform.OS === "ios" && theme.colors.fg === "#FFFFFF"
            ? "dark"
            : "light"
        }
        onChange={(event, selectedDate) => {
          if (Platform.OS === "ios") {
            if (selectedDate) onChangeDraft(selectedDate);
            return;
          }

          const anyEvent = event as any;
          if (anyEvent?.type === "dismissed") {
            onCancel();
            return;
          }
          if (selectedDate) {
            onConfirm(selectedDate);
          }
        }}
      />
      {Platform.OS === "ios" ? (
        <View style={styles.pickerActionsRow}>
          <Pressable
            onPress={onCancel}
            style={({ pressed }) => [
              styles.pickerActionBtn,
              {
                borderColor: theme.colors.border,
                backgroundColor: "transparent",
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <Text
              style={[styles.pickerActionText, { color: theme.colors.muted }]}
            >
              {t("common.cancel")}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => onConfirm(value)}
            style={({ pressed }) => [
              styles.pickerActionBtn,
              {
                borderColor: theme.colors.accent,
                backgroundColor: accentBg,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <Text
              style={[styles.pickerActionText, { color: theme.colors.accent }]}
            >
              {t("common.done")}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    pickerWrap: {
      paddingBottom: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
    },
    pickerActionsRow: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: theme.spacing.sm,
      paddingTop: theme.spacing.sm,
    },
    pickerActionBtn: {
      paddingVertical: theme.spacing.xs,
      paddingHorizontal: theme.spacing.md,
      borderRadius: 9999,
      borderWidth: 1,
    },
    pickerActionText: {
      fontSize: theme.typography.body,
      fontWeight: theme.typography.fontWeight.bold,
    },
  });
