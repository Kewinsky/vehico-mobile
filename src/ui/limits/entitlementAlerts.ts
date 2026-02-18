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

/** Show limit-reached alert (backend returned "limit reached"); use reason as body when provided. */
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

export function maybeHandleBackendEntitlementLimitError(
  err: unknown,
  t: TFunction,
  navigation: MinimalNavigation,
): boolean {
  if (!isBackendEntitlementLimitError(err)) return false;
  const msg = getErrorMessage(err);
  // When backend says "limit reached", show limit-specific message instead of generic "feature only on Premium"
  if (msg.toLowerCase().includes("limit reached")) {
    showLimitReachedAlert(t, navigation, msg);
    return true;
  }
  showUpgradeToPremiumAlert(t, navigation);
  return true;
}

