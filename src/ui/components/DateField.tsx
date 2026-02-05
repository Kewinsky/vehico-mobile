import DateTimePicker from "@react-native-community/datetimepicker";
import { useEffect, useMemo, useState } from "react";
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
  pickerId?: string;
  activePickerId?: string | null;
  setActivePickerId?: (next: string | null) => void;
};

export function DateField({
  label,
  value,
  onChange,
  disabled,
  noMarginTop,
  pickerId,
  activePickerId,
  setActivePickerId,
}: Props) {
  const { t } = useTranslation();
  const { theme, mode } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [openLocal, setOpenLocal] = useState(false);
  const [draft, setDraft] = useState<Date>(() => new Date());

  const dateValue = useMemo(() => parseYmd(value), [value]);
  const controlled =
    !!pickerId && typeof setActivePickerId === "function" && activePickerId !== undefined;
  const open = controlled ? activePickerId === pickerId : openLocal;

  function setOpen(next: boolean) {
    if (controlled) setActivePickerId?.(next ? (pickerId as string) : null);
    else setOpenLocal(next);
  }

  useEffect(() => {
    if (open) setDraft(dateValue);
  }, [open, dateValue]);

  return (
    <View>
      <Pressable
        onPress={() => setOpen(true)}
        disabled={disabled}
        style={({ pressed }) => [
          pressed && !disabled ? { opacity: 0.95 } : null,
        ]}
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
            value={draft}
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            themeVariant={mode === "dark" ? "dark" : "light"}
            textColor={theme.colors.fg}
            accentColor={theme.colors.accent}
            onChange={(event, selected) => {
              if (Platform.OS !== "ios") {
                // Android closes on selection/dismiss.
                setOpen(false);
                if ((event as any)?.type === "dismissed") return;
                if (selected) onChange(formatYmd(selected));
                return;
              }
              // iOS fires continuously while scrolling; keep open until user taps Done.
              if (selected) setDraft(selected);
            }}
          />

          {Platform.OS === "ios" ? (
            <View style={styles.actionsRow}>
              <Button onPress={() => setOpen(false)} variant="ghost">
                {t("common.cancel")}
              </Button>
              <Button
                onPress={() => {
                  onChange(formatYmd(draft));
                  setOpen(false);
                }}
                variant="ghost"
              >
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
      marginTop: theme.spacing.xs,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.card,
      borderRadius: theme.radius.md,
      overflow: "hidden",
    },
    actionsRow: {
      padding: theme.spacing.sm,
      paddingTop: 0,
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: theme.spacing.sm,
    },
  });
