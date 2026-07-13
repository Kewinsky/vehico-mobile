import { StyleSheet, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { CirclePlus, History } from "lucide-react-native";
import type { AppStackParamList } from "../../app/navigation/RootNavigator";
import { useTheme } from "../../ui/ThemeProvider";
import { useEntitlements } from "../../app/providers/EntitlementsProvider";
import { HeaderLayout } from "../../layouts";
import { ContentHeader } from "../../ui/components/layout/ContentHeader";
import { NativeHeaderScrollView } from "../../ui/components/layout/NativeHeaderScrollView";
import { Tile } from "../../ui/components/common/Tile";
import { showPremiumRequiredAlert } from "../../ui/limits/entitlementAlerts";

type Props = NativeStackScreenProps<AppStackParamList, "PublicReport">;

export function PublicReportScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { vehicleId } = route.params;
  const { isPremium } = useEntitlements();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const onGeneratePress = useCallback(() => {
    if (!isPremium) {
      showPremiumRequiredAlert(t, navigation);
      return;
    }
    navigation.navigate("PublicReportConfigure", { vehicleId });
  }, [isPremium, navigation, t, vehicleId]);

  const tiles = useMemo(
    () => [
      {
        key: "generate",
        title: t("publicReport.generateButton"),
        onPress: onGeneratePress,
      },
      {
        key: "history",
        title: t("publicReport.historyButton"),
        onPress: () =>
          navigation.navigate("PublicReportHistory", {
            vehicleId,
          }),
      },
    ],
    [t, navigation, vehicleId, onGeneratePress],
  );

  return (
    <HeaderLayout onBack={() => navigation.goBack()}>
      <NativeHeaderScrollView>
        <ContentHeader title={t("publicReport.title")} />
        <View style={styles.row}>
          {tiles.map((item) => (
            <Tile
              key={item.key}
              title={item.title}
              icon={
                item.key === "generate" ? (
                  <CirclePlus size={32} color={theme.colors.accent} />
                ) : (
                  <History size={32} color={theme.colors.accent} />
                )
              }
              onPress={item.onPress}
              minHeight={130}
            />
          ))}
        </View>
      </NativeHeaderScrollView>
    </HeaderLayout>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    row: {
      flexDirection: "row",
      gap: theme.spacing.sm,
    },
  });
