import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useTranslation } from "react-i18next";

import { useTheme } from "../../ThemeProvider";

type Props = {
  activeIndex: number;
  style?: StyleProp<ViewStyle>;
  total: number;
};

export function CarouselPaginationCounter({ activeIndex, style, total }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();

  if (total <= 1) return null;

  const current = Math.min(Math.max(Math.floor(activeIndex), 0), total - 1) + 1;

  return (
    <View
      accessible
      accessibilityLabel={t("common.carouselPosition", { current, total })}
      style={[styles.container, style]}
      pointerEvents="none"
    >
      <Text
        style={[
          styles.text,
          {
            fontSize: theme.typography.small,
            fontWeight: theme.typography.fontWeight.semibold,
          },
        ]}
      >
        {`${current} / ${total}`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  text: {
    color: "#FFFFFF",
  },
});
