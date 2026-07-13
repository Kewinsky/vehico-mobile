import { type ReactNode, useMemo } from "react";
import { useTranslation } from "react-i18next";

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
  children: ReactNode;
  disabled?: boolean;
  handlers: AttachmentSourceHandlers;
  includeFiles?: boolean;
};

export function AttachmentSourcePicker({
  children,
  disabled,
  handlers,
  includeFiles = true,
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

  return (
    <SourcePickerMenu disabled={disabled} items={items}>
      {children}
    </SourcePickerMenu>
  );
}
