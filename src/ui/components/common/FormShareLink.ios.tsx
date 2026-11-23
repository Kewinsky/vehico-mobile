import { Share } from "react-native";
import { useTranslation } from "react-i18next";

import { useTheme } from "../../ThemeProvider";
import { toastCaughtError } from "../../toast/toast";
import { Button } from "./Button";
import type { FormShareLinkProps } from "./FormShareLink.types";

export type { FormShareLinkProps } from "./FormShareLink.types";

export function FormShareLink({
  item,
  subject,
  message,
  disabled = false,
  children,
}: FormShareLinkProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();

  async function handleShare() {
    if (disabled) return;
    try {
      await Share.share({ url: item, message }, { subject });
    } catch (error) {
      toastCaughtError(error, t("common.error"));
    }
  }

  return (
    <Button
      variant="ghost"
      disabled={disabled}
      onPress={() => void handleShare()}
      style={{ backgroundColor: theme.colors.bg }}
    >
      {children}
    </Button>
  );
}
