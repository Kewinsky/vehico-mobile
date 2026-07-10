import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Host, Label } from "@expo/ui/swift-ui";
import { glassEffect, padding, tint } from "@expo/ui/swift-ui/modifiers";
import type { SFSymbol } from "sf-symbols-typescript";

import { useTheme } from "../ThemeProvider";
import { subscribe, type ToastPayload } from "./toastStore";

const TOAST_SYMBOLS: Record<ToastPayload["type"], SFSymbol> = {
  success: "checkmark.circle.fill",
  error: "xmark.circle.fill",
  info: "info.circle.fill",
};

function toastMessage(toast: ToastPayload): string {
  if (toast.description) {
    return `${toast.title}\n${toast.description}`;
  }
  return toast.title;
}

export function AppToasts() {
  const { mode, theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const [toast, setToast] = useState<ToastPayload | null>(null);
  const toastWidth = Math.max(
    240,
    windowWidth - theme.layout.contentPaddingHorizontal * 2,
  );

  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  useEffect(() => subscribe(setToast), []);

  useEffect(() => {
    if (!toast) {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 20,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
      return;
    }

    translateY.setValue(20);
    opacity.setValue(0);
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        speed: 18,
        bounciness: 4,
      }),
    ]).start();
  }, [opacity, toast, translateY]);

  const iconTint = useMemo(() => {
    if (!toast) return theme.colors.accent;
    return toast.type === "error" ? theme.colors.danger : theme.colors.accent;
  }, [theme.colors.accent, theme.colors.danger, toast]);

  return (
    <View pointerEvents="box-none" style={styles.root}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.toastWrap,
          {
            width: toastWidth,
            marginBottom: insets.bottom + 12,
            opacity,
            transform: [{ translateY }],
          },
        ]}
      >
        {toast ? (
          <Host
            matchContents={{ vertical: true }}
            colorScheme={mode === "dark" ? "dark" : "light"}
            seedColor={theme.colors.accent}
            style={{ width: toastWidth }}
          >
            <Label
              title={toastMessage(toast)}
              systemImage={TOAST_SYMBOLS[toast.type]}
              modifiers={[
                padding({ horizontal: 16, vertical: 12 }),
                glassEffect({
                  glass: { variant: "regular", interactive: false },
                  shape: "capsule",
                }),
                tint(iconTint),
              ]}
            />
          </Host>
        ) : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
    justifyContent: "flex-end",
    alignItems: "center",
    zIndex: 9999,
    elevation: 9999,
  },
  toastWrap: {
    alignSelf: "center",
  },
});
