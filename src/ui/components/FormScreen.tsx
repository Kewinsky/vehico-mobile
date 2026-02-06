import {
  createContext,
  useContext,
  useRef,
  type PropsWithChildren,
  type ReactNode,
} from "react";
import type { ScrollView as ScrollViewInstance } from "react-native";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "../ThemeProvider";

const FormScreenScrollRefContext = createContext<
  React.RefObject<ScrollViewInstance | null> | null
>(null);

export function useFormScreenScrollRef() {
  return useContext(FormScreenScrollRefContext);
}

export function FormScreen({
  children,
  padding = true,
  header,
  scrollEnabled = true,
  scrollRef,
}: PropsWithChildren<{
  padding?: boolean;
  header?: ReactNode;
  scrollEnabled?: boolean;
  scrollRef?: React.RefObject<ScrollViewInstance | null>;
}>) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const internalScrollRef = useRef<ScrollViewInstance | null>(null);
  const effectiveScrollRef = scrollRef ?? internalScrollRef;

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.colors.bg,
        paddingTop: insets.top,
      }}
    >
      {header}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <FormScreenScrollRefContext.Provider value={effectiveScrollRef}>
          <ScrollView
            ref={effectiveScrollRef}
            scrollEnabled={scrollEnabled}
            nestedScrollEnabled={false}
            contentContainerStyle={{
              flexGrow: 1,
              paddingHorizontal: theme.layout.contentPaddingHorizontal,
              paddingBottom: insets.bottom + theme.spacing.lg,
            }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "none"}
          >
            <TouchableWithoutFeedback
              onPress={Keyboard.dismiss}
              accessible={false}
            >
              <View style={{ flexGrow: 1, flexShrink: 0 }}>{children}</View>
            </TouchableWithoutFeedback>
          </ScrollView>
        </FormScreenScrollRefContext.Provider>
      </KeyboardAvoidingView>
    </View>
  );
}
