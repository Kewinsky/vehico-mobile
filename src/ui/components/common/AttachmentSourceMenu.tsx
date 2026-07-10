import type { ReactElement } from "react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, View, type ViewStyle } from "react-native";
import { Button, Host, Menu, RNHostView } from "@expo/ui/swift-ui";
import { buttonStyle } from "@expo/ui/swift-ui/modifiers";

import { useTheme } from "../../ThemeProvider";
import { ghostButtonTriggerStyles } from "./ghostButtonTriggerStyles";

export type AttachmentSourceMenuProps = {
  onCamera: () => void;
  onPhotos: () => void;
  onFiles: () => void;
  children: ReactElement;
  disabled?: boolean;
};

export function AttachmentSourceMenu({
  onCamera,
  onPhotos,
  onFiles,
  children,
  disabled = false,
}: AttachmentSourceMenuProps) {
  const { t } = useTranslation();
  const { mode } = useTheme();

  return (
    <View
      pointerEvents={disabled ? "none" : "auto"}
      style={[styles.host, disabled ? styles.disabled : undefined]}
    >
      <Host
        matchContents
        ignoreSafeArea="all"
        colorScheme={mode === "dark" ? "dark" : "light"}
      >
        <Menu
          modifiers={[buttonStyle("plain")]}
          label={<RNHostView matchContents>{children}</RNHostView>}
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
      </Host>
    </View>
  );
}

type AttachmentSourceMenuButtonProps = {
  label: string;
  onCamera: () => void;
  onPhotos: () => void;
  onFiles: () => void;
  disabled?: boolean;
  style?: ViewStyle;
};

const styles = StyleSheet.create({
  host: {
    alignSelf: "stretch",
    width: "100%",
  },
  disabled: {
    opacity: 0.5,
  },
});

export function AttachmentSourceMenuButton({
  label,
  onCamera,
  onPhotos,
  onFiles,
  disabled = false,
  style,
}: AttachmentSourceMenuButtonProps) {
  const { theme } = useTheme();
  const buttonStyles = useMemo(() => ghostButtonTriggerStyles(theme), [theme]);

  return (
    <View style={[buttonStyles.wrap, style]}>
      <AttachmentSourceMenu
        onCamera={onCamera}
        onPhotos={onPhotos}
        onFiles={onFiles}
        disabled={disabled}
      >
        <View style={[buttonStyles.base, disabled && buttonStyles.disabled]}>
          <Text style={buttonStyles.text}>{label}</Text>
        </View>
      </AttachmentSourceMenu>
    </View>
  );
}
