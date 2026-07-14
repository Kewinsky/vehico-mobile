import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, StyleSheet, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Host, HStack, Image, Text as SwiftUIText } from "@expo/ui/swift-ui";
import { frame, glassEffect, padding } from "@expo/ui/swift-ui/modifiers";
import type { SFSymbol } from "sf-symbols-typescript";

import { useTheme } from "../ThemeProvider";
import { subscribe, type ToastPayload } from "./toastStore";

const TOAST_SYMBOLS: Record<ToastPayload["type"], SFSymbol> = {
  success: "checkmark.circle.fill",
  error: "xmark.circle.fill",
  info: "info.circle.fill",
};

const INFO_TINT = {
  light: "#007AFF",
  dark: "#0A84FF",
} as const;

function toastTint(
  type: ToastPayload["type"],
  colors: { accent: string; danger: string },
  mode: "light" | "dark",
): string {
  switch (type) {
    case "error":
      return colors.danger;
    case "info":
      return INFO_TINT[mode];
    case "success":
    default:
      return colors.accent;
  }
}
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
  const toastTextMaxWidth = toastWidth - 32 - 28;

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
    return toastTint(toast.type, theme.colors, mode);
  }, [mode, theme.colors, toast]);

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
            matchContents={{ vertical: true, horizontal: false }}
            colorScheme={mode === "dark" ? "dark" : "light"}
            style={{ width: toastWidth, maxWidth: toastWidth }}
          >
            <HStack
              spacing={10}
              alignment="center"
              fixedSize={false}
              modifiers={[
                padding({ horizontal: 16, vertical: 12 }),
                frame({ maxWidth: toastWidth }),
                glassEffect({
                  glass: { variant: "regular", interactive: false },
                  shape: "capsule",
                }),
              ]}
            >
              <Image
                systemName={TOAST_SYMBOLS[toast.type]}
                color={iconTint}
                size={20}
                fixedSize
              />
              <SwiftUIText
                fixedSize={false}
                frame={{ maxWidth: toastTextMaxWidth }}
                color={theme.colors.fg}
                size={15}
                weight="medium"
              >
                {toastMessage(toast)}
              </SwiftUIText>
            </HStack>
          </Host>
        ) : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
    alignItems: "center",
    zIndex: 9999,
    elevation: 9999,
  },
  toastWrap: {
    alignSelf: "center",
  },
});
