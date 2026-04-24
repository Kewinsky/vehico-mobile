import ToastManager, { BaseToast } from "toastify-react-native";
import { Ionicons } from "@expo/vector-icons";
import { useWindowDimensions, View, StyleSheet } from "react-native";
import { BlurView } from "expo-blur";

import { hexToRgba } from "../components/common/ChoiceChip";
import { useTheme } from "../ThemeProvider";

export function AppToasts() {
  const { mode, theme } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const horizontalInset = theme.layout.contentPaddingHorizontal;
  const toastWidth = Math.max(240, windowWidth - horizontalInset * 2);

  const renderBlurToast = (props: any) => (
    <View style={[styles.blurWrap, { width: toastWidth }]}>
      <BlurView
        intensity={mode === "dark" ? 45 : 70}
        tint={mode === "dark" ? "dark" : "light"}
        style={StyleSheet.absoluteFill}
      />
      <BaseToast
        {...props}
        width={toastWidth}
        backgroundColor="transparent"
        style={[
          props.style,
          {
            backgroundColor: "transparent",
            borderRadius: 999,
          },
        ]}
      />
    </View>
  );

  return (
    <ToastManager
      useModal={false}
      position="bottom"
      width={toastWidth}
      theme={mode === "dark" ? "dark" : "light"}
      showProgressBar={false}
      showCloseIcon={false}
      duration={3200}
      style={{
        borderRadius: 999,
        backgroundColor: "transparent",
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
      config={{
        success: renderBlurToast,
        error: renderBlurToast,
        info: renderBlurToast,
        warn: renderBlurToast,
        default: renderBlurToast,
      }}
    />
  );
}

const styles = StyleSheet.create({
  blurWrap: {
    borderRadius: 999,
    overflow: "hidden",
  },
});
