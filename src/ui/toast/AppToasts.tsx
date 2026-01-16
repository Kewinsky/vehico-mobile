import React from "react";
import ToastManager from "toastify-react-native";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "../ThemeProvider";

export function AppToasts() {
  const { mode } = useTheme();

  return (
    <ToastManager
      // UX: do not block interaction with the app.
      useModal={false}
      position="bottom"
      theme={mode === "dark" ? "dark" : "light"}
      showProgressBar={false}
      showCloseIcon={false}
      duration={3200}
      // Expo-friendly: pass real icon components (avoids font-linking issues).
      icons={{
        success: <Ionicons name="checkmark-circle" size={22} color="#22c55e" />,
        error: <Ionicons name="close-circle" size={22} color="#ef4444" />,
        info: <Ionicons name="information-circle" size={22} color="#FFB803" />,
        warn: <Ionicons name="warning" size={22} color="#f59e0b" />,
        default: <Ionicons name="notifications" size={22} color="#64748b" />,
      }}
    />
  );
}

