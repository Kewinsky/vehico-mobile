import React, { useMemo } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from "react-native";

import { useTheme } from "../ThemeProvider";
import { Button } from "./Button";

type Props = {
  visible: boolean;
  title: string;
  message: string;
  cancelText: string;
  confirmText: string;
  onCancel: () => void;
  onConfirm: () => void;
  confirmVariant?: "primary" | "outlined" | "ghost";
  style?: ViewStyle;
};

/**
 * Themed in-app dialog.
 *
 * We use this instead of Alert.alert when we need consistent light/dark theming.
 * (Native alerts can't be reliably styled and may appear white in dark mode.)
 */
export function ConfirmDialog({
  visible,
  title,
  message,
  cancelText,
  confirmText,
  onCancel,
  onConfirm,
  confirmVariant = "primary",
  style,
}: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} />
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.colors.card,
              borderColor: theme.colors.border,
            },
            style,
          ]}
        >
          <Text style={[styles.title, { color: theme.colors.fg }]}>{title}</Text>
          <Text style={[styles.message, { color: theme.colors.muted }]}>
            {message}
          </Text>
          <View style={styles.actions}>
            <Button variant="ghost" onPress={onCancel} style={styles.actionBtn}>
              {cancelText}
            </Button>
            <Button
              variant={confirmVariant}
              onPress={onConfirm}
              style={styles.actionBtn}
            >
              {confirmText}
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function makeStyles(theme: any) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: theme.layout.contentPaddingHorizontal,
      backgroundColor: "rgba(0,0,0,0.45)",
    },
    card: {
      width: "100%",
      maxWidth: 520,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      padding: theme.spacing.md,
    },
    title: {
      fontSize: theme.typography.body,
      fontWeight: "800",
      marginBottom: theme.spacing.xs,
    },
    message: {
      fontSize: theme.typography.small,
      lineHeight: theme.typography.body + 4,
      marginBottom: theme.spacing.md,
    },
    actions: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: theme.spacing.sm,
    },
    actionBtn: {
      minWidth: 110,
    },
  });
}

