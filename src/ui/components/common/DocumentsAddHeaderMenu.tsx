import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";
import { Plus } from "lucide-react-native";
import {
  MenuView,
  type MenuAction,
  type NativeActionEvent,
} from "@expo/ui/community/menu";

import { useTheme } from "../../ThemeProvider";

type Props = {
  onCamera: () => void;
  onPhotos: () => void;
  onFiles: () => void;
  onAddAttachment: () => void;
  disabled?: boolean;
};

export function DocumentsAddHeaderMenu({
  onCamera,
  onPhotos,
  onFiles,
  onAddAttachment,
  disabled = false,
}: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const tintColor = theme.colors.accent;
  const iconSize = theme.icons.headerButton;

  const actions = useMemo((): MenuAction[] => {
    return [
      {
        id: "vehicle-document",
        title: t("documents.addVehicleDocument"),
        image: "doc.badge.plus",
        subactions: [
          {
            id: "camera",
            title: t("attachments.camera"),
            image: "camera",
          },
          {
            id: "photos",
            title: t("attachments.photos"),
            image: "photo.on.rectangle",
          },
          {
            id: "files",
            title: t("attachments.files"),
            image: "folder",
          },
        ],
      },
      {
        id: "attachment",
        title: t("documents.addAttachment"),
        image: "paperclip",
      },
    ];
  }, [t]);

  const handlePressAction = ({ nativeEvent: { event } }: NativeActionEvent) => {
    switch (event) {
      case "camera":
        onCamera();
        break;
      case "photos":
        onPhotos();
        break;
      case "files":
        onFiles();
        break;
      case "attachment":
        onAddAttachment();
        break;
    }
  };

  return (
    <View
      pointerEvents={disabled ? "none" : "auto"}
      style={[styles.wrap, disabled && styles.disabled]}
    >
      <MenuView actions={actions} onPressAction={handlePressAction}>
        <Plus size={iconSize} color={tintColor} />
      </MenuView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 8,
    minWidth: 44,
    minHeight: 44,
  },
  disabled: {
    opacity: 0.55,
  },
});
