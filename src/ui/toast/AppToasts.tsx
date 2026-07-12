import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "../ThemeProvider";
import { subscribe, type ToastPayload } from "./toastStore";

const TOAST_ICONS: Record<
  ToastPayload["type"],
  keyof typeof Ionicons.glyphMap
> = {
  success: "checkmark-circle",
  error: "close-circle",
  info: "information-circle",
};

export function AppToasts() {
  const { mode, theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const [renderedToast, setRenderedToast] = useState<ToastPayload | null>(
    null,
  );
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  const toastWidth = Math.max(
    240,
    windowWidth - theme.layout.contentPaddingHorizontal * 2,
  );

  useEffect(() => {
    return subscribe((next) => {
      if (next) {
        setRenderedToast(next);
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
        return;
      }

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
      ]).start(({ finished }) => {
        if (finished) {
          setRenderedToast(null);
        }
      });
    });
  }, [opacity, translateY]);

  if (!renderedToast) {
    return null;
  }

  const iconColor =
    renderedToast.type === "error"
      ? theme.colors.danger
      : theme.colors.accent;
  const message = renderedToast.description
    ? `${renderedToast.title}\n${renderedToast.description}`
    : renderedToast.title;

  return (
    <View
      pointerEvents="none"
      style={[
        styles.host,
        {
          bottom: insets.bottom + 12,
          paddingHorizontal: theme.layout.contentPaddingHorizontal,
        },
      ]}
    >
      <Animated.View
        style={{
          width: toastWidth,
          opacity,
          transform: [{ translateY }],
        }}
      >
        <BlurView
          intensity={70}
          tint={mode === "dark" ? "dark" : "light"}
          style={[
            styles.capsule,
            { borderColor: theme.colors.border },
          ]}
        >
          <View style={styles.row}>
            <Ionicons
              name={TOAST_ICONS[renderedToast.type]}
              size={20}
              color={iconColor}
            />
            <Text style={[styles.text, { color: theme.colors.fg }]}>
              {message}
            </Text>
          </View>
        </BlurView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 9999,
  },
  capsule: {
    borderRadius: 999,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  text: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 20,
  },
});
