import type { PropsWithChildren } from "react";
import { ScrollView, type ScrollViewProps } from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "../../../../ui/ThemeProvider";
import { makeDashboardScreenStyles } from "../dashboardScreenStyles";

type VehicleDashboardScrollViewProps = PropsWithChildren<
  ScrollViewProps & {
    /** When true, content starts at the top edge (overview carousel). */
    flushTop?: boolean;
  }
>;

export function VehicleDashboardScrollView({
  children,
  flushTop = false,
  contentContainerStyle,
  ...rest
}: VehicleDashboardScrollViewProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const styles = makeDashboardScreenStyles(theme, insets);

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[
        styles.scrollContent,
        !flushTop && { paddingTop: headerHeight },
        contentContainerStyle,
      ]}
      {...rest}
    >
      {children}
    </ScrollView>
  );
}
