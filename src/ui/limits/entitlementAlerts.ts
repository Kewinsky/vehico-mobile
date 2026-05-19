import { Alert, type AlertOptions } from "react-native";
import type { TFunction } from "i18next";
import { getLimitErrorMessage, isLimitError } from "./limitErrorClassifier";

type MinimalNavigation = {
  navigate: (screen: any, params?: any) => void;
};

export function getPremiumUpgradeAlertButtons(
  t: TFunction,
  navigation: MinimalNavigation,
) {
  return [
    {
      text: t("limits.upgradeToPremium"),
      onPress: () => navigation.navigate("Shop"),
    },
    { text: t("common.cancel"), style: "cancel" as const },
  ];
}

export function showPremiumRequiredAlert(
  t: TFunction,
  navigation: MinimalNavigation,
  options?: {
    title?: string;
    message?: string;
    alertOptions?: AlertOptions;
  },
) {
  Alert.alert(
    options?.title ?? t("limits.premiumRequiredTitle"),
    options?.message ?? t("limits.premiumRequiredBody"),
    getPremiumUpgradeAlertButtons(t, navigation),
    options?.alertOptions,
  );
}

export function showLimitReachedAlertWithTitle(
  t: TFunction,
  navigation: MinimalNavigation,
  title: string,
  message: string,
) {
  Alert.alert(title, message, getPremiumUpgradeAlertButtons(t, navigation));
}

export function showUpgradeToPremiumAlert(
  t: TFunction,
  navigation: MinimalNavigation,
) {
  showPremiumRequiredAlert(t, navigation);
}

export function showLimitReachedAlert(
  t: TFunction,
  navigation: MinimalNavigation,
  reason?: string,
) {
  Alert.alert(
    t("limits.limitReachedTitle"),
    reason && reason.trim() ? reason : t("limits.limitReachedBody"),
    getPremiumUpgradeAlertButtons(t, navigation),
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
