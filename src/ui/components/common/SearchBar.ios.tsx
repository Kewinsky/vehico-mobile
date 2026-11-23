import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { SearchBarCommands } from "react-native-screens";
import { useTranslation } from "react-i18next";

import type { AppStackParamList } from "../../../app/navigation/RootNavigator";
import { useTheme } from "../../ThemeProvider";
import type { SearchBarProps } from "./SearchBar.types";

export type { SearchBarProps } from "./SearchBar.types";

export function SearchBar({ value, onChangeText, placeholder }: SearchBarProps) {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const searchRef = useRef<SearchBarCommands | null>(null);
  const nativeText = useRef("");
  const searchPlaceholder = placeholder ?? t("common.search");

  const syncText = useCallback(() => {
    if (searchRef.current && nativeText.current !== value) {
      searchRef.current.setText(value);
      nativeText.current = value;
    }
  }, [value]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerSearchBarOptions: {
        ref: searchRef,
        placeholder: searchPlaceholder,
        placement: "stacked",
        hideWhenScrolling: false,
        hideNavigationBar: false,
        obscureBackground: false,
        autoCapitalize: "none",
        barTintColor: theme.colors.card,
        textColor: theme.colors.fg,
        tintColor: theme.colors.accent,
        onChangeText: (event) => {
          nativeText.current = event.nativeEvent.text;
          onChangeText(event.nativeEvent.text);
        },
        onFocus: syncText,
      },
    });
  }, [
    navigation,
    onChangeText,
    searchPlaceholder,
    syncText,
    theme.colors.accent,
    theme.colors.card,
    theme.colors.fg,
  ]);

  useLayoutEffect(
    () => () => navigation.setOptions({ headerSearchBarOptions: undefined }),
    [navigation],
  );

  useEffect(syncText, [syncText]);

  return null;
}
