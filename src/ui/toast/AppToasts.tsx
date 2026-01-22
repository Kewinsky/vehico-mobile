import React, { useMemo } from "react";
import ToastManager, { BaseToast } from "toastify-react-native";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "../ThemeProvider";

export function AppToasts() {
  const { mode, theme } = useTheme();

  const toastConfig = useMemo(() => {
    const borderStyle = {
      borderWidth: 1,
      borderColor: theme.colors.accent,
    };

    return {
      success: (props: any) => (
        <BaseToast
          {...props}
          style={[props.style, borderStyle]}
          icon={<Ionicons name="checkmark-circle" size={22} color={theme.colors.accent} />}
        />
      ),
      error: (props: any) => (
        <BaseToast
          {...props}
          style={[props.style, borderStyle]}
          icon={<Ionicons name="close-circle" size={22} color={theme.colors.danger} />}
        />
      ),
      info: (props: any) => (
        <BaseToast
          {...props}
          style={[props.style, borderStyle]}
          icon={<Ionicons name="information-circle" size={22} color={theme.colors.accent} />}
        />
      ),
      warn: (props: any) => (
        <BaseToast
          {...props}
          style={[props.style, borderStyle]}
          icon={<Ionicons name="warning" size={22} color="#f59e0b" />}
        />
      ),
      default: (props: any) => (
        <BaseToast
          {...props}
          style={[props.style, borderStyle]}
          icon={<Ionicons name="notifications" size={22} color={theme.colors.muted} />}
        />
      ),
    };
  }, [theme.colors.accent, theme.colors.danger, theme.colors.muted]);

  return (
    <ToastManager
      // UX: do not block interaction with the app.
      useModal={false}
      position="bottom"
      theme={mode === "dark" ? "dark" : "light"}
      showProgressBar={false}
      showCloseIcon={false}
      duration={3200}
      config={toastConfig}
    />
  );
}
