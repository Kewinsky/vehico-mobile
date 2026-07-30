import { useEffect, useMemo, useRef, useState, type ComponentProps } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "../ThemeProvider";
import { subscribe, type ToastPayload } from "./toastStore";

const TOAST_ICONS: Record<
  ToastPayload["type"],
  ComponentProps<typeof Ionicons>["name"]
> = {
  success: "checkmark-circle",
  error: "close-circle",
  info: "information-circle",
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

  const styles = useMemo(() => makeStyles(theme, mode), [theme, mode]);

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
          <View style={styles.toastCard}>
            <Ionicons
              name={TOAST_ICONS[toast.type]}
              size={20}
              color={iconTint}
            />
            <Text style={styles.toastText}>{toastMessage(toast)}</Text>
          </View>
        ) : null}
      </Animated.View>
    </View>
  );
}

const makeStyles = (theme: any, mode: "light" | "dark") =>
  StyleSheet.create({
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
    toastCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 999,
      backgroundColor:
        mode === "dark" ? "rgba(28,28,30,0.96)" : "rgba(255,255,255,0.96)",
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      shadowColor: "#000",
      shadowOpacity: 0.12,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 6,
    },
    toastText: {
      flexShrink: 1,
      color: theme.colors.fg,
      fontSize: 15,
      fontWeight: theme.typography.fontWeight.medium,
      lineHeight: 20,
    },
  });
