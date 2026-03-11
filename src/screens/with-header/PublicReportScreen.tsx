import { View, Alert } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import type { AppStackParamList } from "../../app/navigation/RootNavigator";
import { Button } from "../../ui/components/common/Button";
import { useTheme } from "../../ui/ThemeProvider";
import { useEntitlements } from "../../app/providers/EntitlementsProvider";
import { HeaderLayout } from "../../layouts";
import { ContentHeader } from "../../ui/components/layout/ContentHeader";

type Props = NativeStackScreenProps<AppStackParamList, "PublicReport">;

export function PublicReportScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { vehicleId } = route.params;
  const { isPremium } = useEntitlements();

  function onGeneratePress() {
    if (!isPremium) {
      Alert.alert(
        t("limits.premiumRequiredTitle"),
        t("limits.premiumRequiredBody"),
        [
          { text: t("common.cancel"), style: "cancel" },
          {
            text: t("limits.upgradeToPremium"),
            onPress: () => navigation.navigate("Shop"),
          },
        ],
      );
      return;
    }
    navigation.navigate("PublicReportConfigure", { vehicleId });
  }

  return (
    <HeaderLayout
      onBack={() => navigation.goBack()}
      showProfileAvatar
    >
      <ContentHeader title={t("publicReport.title")} />
      <Button onPress={onGeneratePress}>
        {t("publicReport.generateButton")}
      </Button>
      <View style={{ height: theme.spacing.sm }} />
      <Button
        onPress={() =>
          navigation.navigate("PublicReportHistory", {
            vehicleId,
          })
        }
        variant="ghost"
      >
        {t("publicReport.historyButton")}
      </Button>
    </HeaderLayout>
  );
}
