import type { ReactNode } from "react";
import { useMemo } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import { Host, ShareLink } from "@expo/ui/swift-ui";

import { shareUrl } from "../../../utils/shareContent";
import { useTheme } from "../../ThemeProvider";
import type { AppTheme } from "../../theme";

export type FormShareLinkProps = {
  item: string;
  subject?: string;
  message?: string;
  preview?: { title: string; image: string };
  disabled?: boolean;
  children: ReactNode;
  onFallbackPress?: () => void | Promise<void>;
};

export function FormShareLink({
  item,
  subject,
  message,
  preview,
  disabled = false,
  children,
  onFallbackPress,
}: FormShareLinkProps) {
  const { theme, mode: themeMode } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  if (Platform.OS === "ios") {
    return (
      <View
        pointerEvents={disabled ? "none" : "auto"}
        style={disabled ? styles.disabled : undefined}
      >
        <Host
          matchContents={{ horizontal: true, vertical: true }}
          colorScheme={themeMode === "dark" ? "dark" : "light"}
          style={styles.host}
        >
          <ShareLink
            item={item}
            subject={subject}
            message={message}
            preview={preview}
          >
            {children}
          </ShareLink>
        </Host>
      </View>
    );
  }

  return (
    <Pressable
      disabled={disabled}
      onPress={() => {
        if (disabled) return;
        if (onFallbackPress) {
          void onFallbackPress();
          return;
        }
        void shareUrl(item, { title: subject, message });
      }}
      style={({ pressed }) => [
        disabled ? styles.disabled : undefined,
        pressed && !disabled ? styles.pressed : undefined,
      ]}
    >
      {children}
    </Pressable>
  );
}

const makeStyles = (_theme: AppTheme) =>
  StyleSheet.create({
    host: {
      flexShrink: 0,
    },
    disabled: {
      opacity: 0.55,
    },
    pressed: {
      opacity: 0.85,
    },
  });
