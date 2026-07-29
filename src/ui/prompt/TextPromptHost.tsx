import { useEffect, useMemo, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type KeyboardTypeOptions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "../ThemeProvider";
import {
  hideTextPrompt,
  subscribeTextPrompt,
  type TextPromptRequest,
} from "./promptStore";

function mapKeyboardType(keyboardType?: string): KeyboardTypeOptions {
  switch (keyboardType) {
    case "numeric":
    case "number-pad":
      return "number-pad";
    case "decimal-pad":
      return "decimal-pad";
    case "email-address":
      return "email-address";
    case "phone-pad":
      return "phone-pad";
    default:
      return "default";
  }
}

function resolveButtons(request: TextPromptRequest) {
  const buttons = request.buttons ?? [];
  const cancelButton =
    buttons.find((button) => button.style === "cancel") ??
    buttons[buttons.length - 1];
  const confirmButton =
    buttons.find(
      (button) => button !== cancelButton && button.style !== "cancel",
    ) ?? buttons[0];

  return { cancelButton, confirmButton };
}

/**
 * Android stand-in for iOS `Alert.prompt`.
 * Uses RN TextInput so colors follow the in-app ThemeProvider (Compose TextInput
 * only follows the system Material color scheme).
 */
export function TextPromptHost() {
  const { theme, mode } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [request, setRequest] = useState<TextPromptRequest | null>(null);
  const [value, setValue] = useState("");
  const inputRef = useRef<TextInput>(null);

  useEffect(() => subscribeTextPrompt(setRequest), []);

  useEffect(() => {
    if (!request) return;
    setValue(request.defaultValue ?? "");
    const timer = setTimeout(() => inputRef.current?.focus(), 120);
    return () => clearTimeout(timer);
  }, [request]);

  if (!request) {
    return null;
  }

  const { cancelButton, confirmButton } = resolveButtons(request);

  function dismiss() {
    hideTextPrompt();
  }

  function handleCancel() {
    const onPress = cancelButton?.onPress as (() => void) | undefined;
    onPress?.();
    dismiss();
  }

  function handleConfirm() {
    const onPress = confirmButton?.onPress as
      | ((next?: string) => void)
      | undefined;
    onPress?.(value);
    dismiss();
  }

  return (
    <Modal
      key={`${request.id}-${mode}`}
      visible
      transparent
      animationType="fade"
      onRequestClose={handleCancel}
    >
      <KeyboardAvoidingView behavior={undefined} style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={handleCancel} />
        <View
          style={[
            styles.dialog,
            { marginBottom: Math.max(insets.bottom, theme.spacing.md) },
          ]}
        >
          <Text style={styles.title}>{request.title}</Text>
          {request.message ? (
            <Text style={styles.message}>{request.message}</Text>
          ) : null}
          <TextInput
            ref={inputRef}
            value={value}
            onChangeText={setValue}
            placeholderTextColor={theme.colors.muted}
            secureTextEntry={request.secureTextEntry}
            keyboardType={mapKeyboardType(request.keyboardType)}
            autoCapitalize="sentences"
            autoCorrect={false}
            style={styles.input}
            selectionColor={theme.colors.accent}
            cursorColor={theme.colors.accent}
            onSubmitEditing={handleConfirm}
            returnKeyType="done"
          />
          <View style={styles.actions}>
            {cancelButton ? (
              <Pressable
                onPress={handleCancel}
                hitSlop={8}
                style={({ pressed }) => [
                  styles.textButton,
                  pressed && styles.textButtonPressed,
                ]}
              >
                <Text style={[styles.textButtonLabel, styles.cancelLabel]}>
                  {cancelButton.text}
                </Text>
              </Pressable>
            ) : null}
            {confirmButton ? (
              <Pressable
                onPress={handleConfirm}
                hitSlop={8}
                style={({ pressed }) => [
                  styles.textButton,
                  pressed && styles.textButtonPressed,
                ]}
              >
                <Text style={[styles.textButtonLabel, styles.confirmLabel]}>
                  {confirmButton.text}
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const makeStyles = (theme: {
  spacing: any;
  radius: any;
  typography: any;
  colors: any;
}) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: "center",
      paddingHorizontal: theme.spacing.lg,
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0,0,0,0.45)",
    },
    dialog: {
      backgroundColor: theme.colors.card,
      borderRadius: 28,
      paddingTop: theme.spacing.lg,
      paddingHorizontal: theme.spacing.lg,
      paddingBottom: theme.spacing.sm,
      gap: theme.spacing.md,
      elevation: 6,
    },
    title: {
      fontSize: theme.typography.title,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.fg,
    },
    message: {
      fontSize: theme.typography.body,
      color: theme.colors.muted,
    },
    input: {
      minHeight: 48,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.md,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      fontSize: theme.typography.body,
      color: theme.colors.fg,
      backgroundColor: theme.colors.bg,
    },
    actions: {
      flexDirection: "row",
      justifyContent: "flex-end",
      alignItems: "center",
      gap: theme.spacing.xs,
      paddingVertical: theme.spacing.xs,
    },
    textButton: {
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      borderRadius: theme.radius.md,
    },
    textButtonPressed: {
      opacity: 0.7,
    },
    textButtonLabel: {
      fontSize: theme.typography.body,
      fontWeight: theme.typography.fontWeight.bold,
    },
    cancelLabel: {
      color: theme.colors.muted,
    },
    confirmLabel: {
      color: theme.colors.accent,
    },
  });
