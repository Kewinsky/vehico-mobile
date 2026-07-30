import { Pressable, Share, StyleSheet, View } from "react-native";

import type { FormShareLinkProps } from "./FormShareLink.types";

export function FormShareLink({
  item,
  subject,
  message,
  disabled = false,
  children,
}: FormShareLinkProps) {
  async function handleShare() {
    if (disabled) return;
    try {
      await Share.share({
        message: message ?? item,
        url: item,
        title: subject,
      });
    } catch {
      // User dismissed share sheet.
    }
  }

  return (
    <View pointerEvents={disabled ? "none" : "auto"} style={disabled ? styles.disabled : undefined}>
      <Pressable onPress={() => void handleShare()} disabled={disabled}>
        {children}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  disabled: {
    opacity: 0.55,
  },
});
