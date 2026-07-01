import { StyleSheet, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";

import type { AppStackParamList } from "../../app/navigation/RootNavigator";
import { HeaderContentScreen } from "../../ui/components/layout/HeaderContentScreen";
import { Tile } from "../../ui/components/common/Tile";
import { useTheme } from "../../ui/ThemeProvider";
import { useEntitlements } from "../../app/providers/EntitlementsProvider";

type Props = NativeStackScreenProps<AppStackParamList, "DataPortability">;

export function DataPortabilityScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { isPremium } = useEntitlements();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { vehicleId } = route.params;

  const tiles = useMemo(
    () => [
      {
        key: "export",
        title: t("dataPortability.exportButton"),
        icon: "share" as const,
        onPress: () => navigation.navigate("Export", { vehicleId }),
      },
      {
        key: "import",
        title: t("dataPortability.importButton"),
        icon: "download" as const,
        onPress: () => navigation.navigate("Import", { vehicleId }),
      },
    ],
    [t, navigation, vehicleId],
  );

  return (
    <HeaderContentScreen
      onBack={() => navigation.goBack()}
      showShopIcon={!isPremium}
      title={t("dataPortability.title")}
    >
      <View style={styles.row}>
        {tiles.map((item) => (
          <Tile
            key={item.key}
            onPress={item.onPress}
            minHeight={130}
            title={item.title}
            icon={
              <Ionicons
                name={item.icon}
                size={32}
                color={theme.colors.accent}
              />
            }
          />
        ))}
      </View>
    </HeaderContentScreen>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    row: {
      flexDirection: "row",
      gap: theme.spacing.sm,
    },
  });
