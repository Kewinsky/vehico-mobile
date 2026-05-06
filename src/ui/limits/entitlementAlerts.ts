import { Alert } from "react-native";
import type { TFunction } from "i18next";
import { getLimitErrorMessage, isLimitError } from "./limitErrorClassifier";

type MinimalNavigation = {
  navigate: (screen: any, params?: any) => void;
};

export function showUpgradeToPremiumAlert(
  t: TFunction,
  navigation: MinimalNavigation,
) {
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
}

export function showLimitReachedAlert(
  t: TFunction,
  navigation: MinimalNavigation,
  reason?: string,
) {
  Alert.alert(
    t("limits.limitReachedTitle"),
    reason && reason.trim() ? reason : t("limits.limitReachedBody"),
    [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("limits.upgradeToPremium"),
        onPress: () => navigation.navigate("Shop"),
      },
    ],
  );
}

export function handleAndShowLimitErrorAlert(
  err: unknown,
  t: TFunction,
  navigation: MinimalNavigation,
): boolean {
  if (!isLimitError(err)) return false;
  const msg = getLimitErrorMessage(err);
  if (msg.toLowerCase().includes("limit reached")) {
    showLimitReachedAlert(t, navigation, msg);
    return true;
  }
  showUpgradeToPremiumAlert(t, navigation);
  return true;
}

export const handleLimitError = handleAndShowLimitErrorAlert;
export { isLimitError } from "./limitErrorClassifier";
