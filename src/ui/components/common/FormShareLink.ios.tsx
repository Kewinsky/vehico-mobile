import type { ReactNode } from "react";
import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Host, ShareLink } from "@expo/ui/swift-ui";

import { useTheme } from "../../ThemeProvider";
import type { AppTheme } from "../../theme";
import type { FormShareLinkProps } from "./FormShareLink.types";

export type { FormShareLinkProps } from "./FormShareLink.types";

export function FormShareLink({
  item,
  subject,
  message,
  preview,
  disabled = false,
  children,
}: FormShareLinkProps) {
  const { theme, mode: themeMode } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

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

const makeStyles = (_theme: AppTheme) =>
  StyleSheet.create({
    host: {
      flexShrink: 0,
    },
    disabled: {
      opacity: 0.55,
    },
  });
