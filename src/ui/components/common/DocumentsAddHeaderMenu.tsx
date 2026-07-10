import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";
import { Plus } from "lucide-react-native";
import { Button, Host, Menu, RNHostView } from "@expo/ui/swift-ui";
import { buttonStyle } from "@expo/ui/swift-ui/modifiers";

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
  const { theme, mode } = useTheme();
  const tintColor = theme.colors.accent;
  const iconSize = theme.icons.headerButton;

  return (
    <View
      pointerEvents={disabled ? "none" : "auto"}
      style={[styles.wrap, disabled && styles.disabled]}
    >
      <Host
        matchContents
        ignoreSafeArea="all"
        colorScheme={mode === "dark" ? "dark" : "light"}
        seedColor={tintColor}
      >
        <Menu
          modifiers={[buttonStyle("plain")]}
          label={
            <RNHostView matchContents>
              <Plus size={iconSize} color={tintColor} />
            </RNHostView>
          }
        >
          <Menu
            label={t("documents.addVehicleDocument")}
            systemImage="doc.badge.plus"
          >
            <Button
              label={t("attachments.camera")}
              systemImage="camera"
              onPress={onCamera}
            />
            <Button
              label={t("attachments.photos")}
              systemImage="photo.on.rectangle"
              onPress={onPhotos}
            />
            <Button
              label={t("attachments.files")}
              systemImage="folder"
              onPress={onFiles}
            />
          </Menu>
          <Button
            label={t("documents.addAttachment")}
            systemImage="paperclip"
            onPress={onAddAttachment}
          />
        </Menu>
      </Host>
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
