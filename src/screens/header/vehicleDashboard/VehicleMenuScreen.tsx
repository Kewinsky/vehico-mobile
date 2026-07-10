import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppLayout } from "../../../ui/components/layout/AppLayout";
import { NativeHeaderScrollView } from "../../../ui/components/layout/NativeHeaderScrollView";
import { useTheme } from "../../../ui/ThemeProvider";
import { useVehicleDashboard } from "./VehicleDashboardProvider";
import { useMenuPageStyles } from "./menuPageStyles";
import { ButtonsPage } from "./pages/ButtonsPage";

export default function VehicleMenuScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const menuStyles = useMenuPageStyles();
  const { loading, windowWidth, tiles, activeRemindersCount } =
    useVehicleDashboard();

  return (
    <AppLayout
      loading={loading}
      ready
      useNativeHeader
      useHorizontalContentInset={false}
    >
      <NativeHeaderScrollView
        paddingHorizontal={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: theme.layout.contentPaddingHorizontal,
          paddingBottom: Math.max(theme.spacing.xl, insets.bottom + theme.spacing.md),
        }}
      >
        <ButtonsPage
          windowWidth={windowWidth}
          styles={menuStyles}
          theme={theme}
          tiles={tiles}
          activeRemindersCount={activeRemindersCount}
        />
      </NativeHeaderScrollView>
    </AppLayout>
  );
}
