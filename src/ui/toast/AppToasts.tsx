import ToastManager from "toastify-react-native";
import { Ionicons } from "@expo/vector-icons";

import { hexToRgba } from "../components/common/ChoiceChip";
import { useTheme } from "../ThemeProvider";

export function AppToasts() {
  const { mode, theme } = useTheme();

  return (
    <ToastManager
      useModal={true}
      position="bottom"
      theme={mode === "dark" ? "dark" : "light"}
      showProgressBar={false}
      showCloseIcon={false}
      duration={3200}
      style={{
        borderWidth: 1,
        borderColor: hexToRgba(theme.colors.accent, 0.28),
        shadowColor: hexToRgba(theme.colors.accent, 0.65),
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: mode === "dark" ? 0.34 : 0.2,
        shadowRadius: 18,
        elevation: 10,
      }}
      icons={{
        success: (
          <Ionicons
            name="checkmark-circle"
            size={22}
            color={theme.colors.accent}
          />
        ),
        error: (
          <Ionicons name="close-circle" size={22} color={theme.colors.danger} />
        ),
        info: (
          <Ionicons
            name="information-circle"
            size={22}
            color={theme.colors.accent}
          />
        ),
        warn: <Ionicons name="warning" size={22} color="#f59e0b" />,
        default: (
          <Ionicons name="notifications" size={22} color={theme.colors.muted} />
        ),
      }}
    />
  );
}
