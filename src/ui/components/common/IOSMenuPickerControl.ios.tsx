import { useMemo, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Button, Host, Menu, RNHostView } from "@expo/ui/swift-ui";
import { buttonStyle } from "@expo/ui/swift-ui/modifiers";

import { useTheme } from "../../ThemeProvider";
import type { IOSMenuPickerControlProps } from "./IOSMenuPickerControl";

const MENU_CHEVRON_WIDTH = 20;

export function IOSMenuPickerControl({
  displayText,
  valueColor,
  options,
  onSelect,
  colorScheme,
  wrapStyle,
  hostStyle,
}: IOSMenuPickerControlProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [valueWidth, setValueWidth] = useState(0);
  const labelWidth = Math.max(0, valueWidth - MENU_CHEVRON_WIDTH);

  return (
    <View
      style={[styles.wrap, wrapStyle]}
      onLayout={(event) => {
        const width = Math.round(event.nativeEvent.layout.width);
        if (width > 0 && width !== valueWidth) {
          setValueWidth(width);
        }
      }}
    >
      <Host
        matchContents={{ vertical: true }}
        colorScheme={colorScheme}
        style={[
          styles.host,
          valueWidth > 0 ? { width: valueWidth } : null,
          hostStyle,
        ]}
      >
        <Menu
          modifiers={[buttonStyle("plain")]}
          label={
            <RNHostView matchContents>
              <Text
                style={[
                  styles.label,
                  {
                    color: valueColor,
                    width: labelWidth > 0 ? labelWidth : undefined,
                  },
                ]}
                numberOfLines={1}
              >
                {displayText}
              </Text>
            </RNHostView>
          }
        >
          {options.map((option, index) => (
            <Button
              key={`${option}-${index}`}
              label={option}
              onPress={() => onSelect(index)}
            />
          ))}
        </Menu>
      </Host>
    </View>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    wrap: {
      flex: 1,
      minWidth: 0,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "flex-end",
    },
    host: {
      minWidth: 0,
      maxWidth: "100%",
      alignSelf: "stretch",
    },
    label: {
      fontSize: theme.typography.body,
      textAlign: "right",
    },
  });
