import { StyleSheet, View } from "react-native";
import { Host, HStack, RNHostView, ShareLink } from "@expo/ui/swift-ui";
import {
  buttonStyle,
  contentShape,
  controlSize,
  disabled as disabledModifier,
  frame,
  shapes,
  tint,
} from "@expo/ui/swift-ui/modifiers";

import { useTheme } from "../../ThemeProvider";
import type { FormShareLinkProps } from "./FormShareLink.types";

export type { FormShareLinkProps } from "./FormShareLink.types";

export function FormShareLink({
  item,
  subject,
  message,
  preview,
  disabled = false,
  children,
}: FormShareLinkProps) {
  const { theme, mode } = useTheme();

  return (
    <View
      pointerEvents={disabled ? "none" : "auto"}
      style={styles.container}
    >
      <Host
        matchContents={{ vertical: true }}
        colorScheme={mode}
        style={styles.host}
      >
        <ShareLink
          item={item}
          subject={subject}
          message={message}
          preview={preview}
          modifiers={[
            buttonStyle("glass"),
            controlSize("large"),
            tint(theme.colors.fg),
            disabledModifier(disabled),
            frame({ maxWidth: Infinity, minHeight: 44 }),
          ]}
        >
          <HStack
            modifiers={[
              frame({ maxWidth: Infinity }),
              contentShape(shapes.rectangle()),
            ]}
          >
            <RNHostView matchContents={{ vertical: true }}>
              <View pointerEvents="none" style={styles.content}>
                {children}
              </View>
            </RNHostView>
          </HStack>
        </ShareLink>
      </Host>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: "stretch",
    width: "100%",
  },
  host: {
    width: "100%",
  },
  content: {
    minHeight: 24,
    width: "100%",
    alignItems: "center",
  },
});
