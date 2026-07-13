import { useCallback, useMemo, type ReactNode } from "react";
import { Alert, type StyleProp, type ViewStyle } from "react-native";
import { useTranslation } from "react-i18next";

import { Button } from "./Button";
import {
  SourcePickerMenu,
  type SourcePickerMenuItem,
} from "./SourcePickerMenu";

export type AttachmentSourceHandlers = {
  onCamera: () => void;
  onPhotos: () => void;
  onFiles: () => void;
};

type AttachmentSourcePickerProps = {
  children?: ReactNode;
  disabled?: boolean;
  handlers: AttachmentSourceHandlers;
  includeFiles?: boolean;
  label?: string;
  triggerStyle?: StyleProp<ViewStyle>;
};

export function AttachmentSourcePicker({
  children,
  disabled,
  handlers,
  includeFiles = true,
  label,
  triggerStyle,
}: AttachmentSourcePickerProps) {
  const { t } = useTranslation();

  const items = useMemo((): SourcePickerMenuItem[] => {
    const menuItems: SourcePickerMenuItem[] = [
      {
        id: "camera",
        label: t("attachments.camera"),
        systemImage: "camera",
        onPress: handlers.onCamera,
      },
      {
        id: "photos",
        label: t("attachments.photos"),
        systemImage: "photo.on.rectangle",
        onPress: handlers.onPhotos,
      },
    ];

    if (includeFiles) {
      menuItems.push({
        id: "files",
        label: t("attachments.files"),
        systemImage: "doc",
        onPress: handlers.onFiles,
      });
    }

    return menuItems;
  }, [handlers, includeFiles, t]);

  const openSourceAlert = useCallback(() => {
    if (disabled) return;

    const buttons: NonNullable<Parameters<typeof Alert.alert>[2]> = [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("attachments.camera"), onPress: handlers.onCamera },
      { text: t("attachments.photos"), onPress: handlers.onPhotos },
    ];

    if (includeFiles) {
      buttons.push({
        text: t("attachments.files"),
        onPress: handlers.onFiles,
      });
    }

    Alert.alert(
      t("attachments.addPickerTitle"),
      t("attachments.addPickerBody"),
      buttons,
      { cancelable: true },
    );
  }, [disabled, handlers, includeFiles, t]);

  if (label) {
    return (
      <Button
        variant="ghost"
        onPress={openSourceAlert}
        disabled={disabled}
        style={triggerStyle}
      >
        {label}
      </Button>
    );
  }

  return (
    <SourcePickerMenu disabled={disabled} items={items}>
      {children}
    </SourcePickerMenu>
  );
}
