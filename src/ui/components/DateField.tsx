import DateTimePicker from "@react-native-community/datetimepicker";
import { useMemo, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

import { useTheme } from "../ThemeProvider";
import { Button } from "./Button";
import { TextField } from "./TextField";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function formatYmd(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function parseYmd(ymd: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
  if (!m) return new Date();
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  // Use local time to avoid UTC date shifting.
  return new Date(year, month - 1, day);
}

type Props = {
  label: string;
  value: string; // YYYY-MM-DD
  onChange: (next: string) => void;
  disabled?: boolean;
  noMarginTop?: boolean;
};

export function DateField({ label, value, onChange, disabled, noMarginTop }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [open, setOpen] = useState(false);

  const dateValue = useMemo(() => parseYmd(value), [value]);

  return (
    <View>
      <Pressable
        onPress={() => setOpen(true)}
        disabled={disabled}
        style={({ pressed }) => [pressed && !disabled ? { opacity: 0.95 } : null]}
      >
        <TextField
          noMarginTop={noMarginTop}
          label={label}
          value={value}
          editable={false}
          pointerEvents="none"
        />
      </Pressable>

      {open ? (
        <View style={styles.pickerWrap}>
          <DateTimePicker
            value={dateValue}
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={(event, selected) => {
              if (Platform.OS !== "ios") {
                // Android closes on selection/dismiss.
                setOpen(false);
                if ((event as any)?.type === "dismissed") return;
                if (selected) onChange(formatYmd(selected));
                return;
              }
              // iOS fires continuously while scrolling; keep open until user taps Done.
              if (selected) onChange(formatYmd(selected));
            }}
          />

          {Platform.OS === "ios" ? (
            <View style={styles.doneRow}>
              <Button onPress={() => setOpen(false)} variant="ghost">
                {t("common.done")}
              </Button>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    pickerWrap: {
      marginTop: 8,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.card,
      borderRadius: theme.radius.md,
      overflow: "hidden",
    },
    doneRow: {
      padding: theme.spacing.sm,
      paddingTop: 0,
    },
  });

