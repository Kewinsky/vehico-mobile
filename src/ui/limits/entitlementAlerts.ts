import { Alert } from "react-native";
import type { TFunction } from "i18next";

type MinimalNavigation = {
  navigate: (screen: any, params?: any) => void;
};

function getErrorMessage(err: unknown): string {
  if (!err) return "";
  if (typeof err === "string") return err;
  if (typeof err === "object" && "message" in err) {
    const m = (err as any).message;
    return typeof m === "string" ? m : "";
  }
  return "";
}

export function isBackendEntitlementLimitError(err: unknown): boolean {
  const msg = getErrorMessage(err).toLowerCase();
  if (!msg) return false;
  // DB functions raise exceptions with human messages like:
  // "Reminder limit reached (...). Upgrade to Premium ..."
  return (
    msg.includes("limit reached") ||
    msg.includes("upgrade to premium") ||
    msg.includes("premium required")
  );
}

export function showUpgradeToPremiumAlert(
  t: TFunction,
  navigation: MinimalNavigation,
) {
  Alert.alert(t("limits.premiumRequiredTitle"), t("limits.premiumRequiredBody"), [
    { text: t("common.cancel"), style: "cancel" },
    {
      text: t("limits.upgradeToPremium"),
      onPress: () => navigation.navigate("Shop"),
    },
  ]);
}

export function maybeHandleBackendEntitlementLimitError(
  err: unknown,
  t: TFunction,
  navigation: MinimalNavigation,
): boolean {
  if (!isBackendEntitlementLimitError(err)) return false;
  showUpgradeToPremiumAlert(t, navigation);
  return true;
}

