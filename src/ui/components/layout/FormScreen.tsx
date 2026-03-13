import {
  useEffect,
  useRef,
  useState,
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

import { useTheme } from "../../ThemeProvider";
import { AppLayout } from "./AppLayout";
import { FormScreenScrollRefContext } from "./FormScreenContext";

export { useFormScreenScrollRef } from "./FormScreenContext";

export function FormScreen({
  children,
  header,
  scrollEnabled = true,
  scrollRef,
  footer,
  isModal = false,
  noLayout = false,
}: PropsWithChildren<{
  padding?: boolean;
  header?: ReactNode;
  scrollEnabled?: boolean;
  scrollRef?: React.RefObject<ScrollViewInstance | null>;
  footer?: ReactNode;
  /** When true, layout assumes native modal header (no top inset, extra footer padding). */
  isModal?: boolean;
  /** When true, only render scroll + keyboard (no AppLayout). Use when wrapping with ModalLayout/HeaderLayout. */
  noLayout?: boolean;
}>) {
  const { theme } = useTheme();
  const internalScrollRef = useRef<ScrollViewInstance | null>(null);
  const effectiveScrollRef = scrollRef ?? internalScrollRef;
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (e) => setKeyboardHeight(e.endCoordinates.height),
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setKeyboardHeight(0),
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const inner = (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
    >
      <FormScreenScrollRefContext.Provider value={effectiveScrollRef}>
        <View style={{ flex: 1 }}>
          <ScrollView
            ref={effectiveScrollRef}
            scrollEnabled={scrollEnabled}
            nestedScrollEnabled={false}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              flexGrow: 1,
              paddingBottom: theme.spacing.lg + keyboardHeight / 2,
            }}
          >
            <TouchableWithoutFeedback
              onPress={Keyboard.dismiss}
              accessible={false}
            >
              <View style={{ flexGrow: 1, flexShrink: 0 }}>{children}</View>
            </TouchableWithoutFeedback>
          </ScrollView>
        </View>
      </FormScreenScrollRefContext.Provider>
    </KeyboardAvoidingView>
  );

  if (noLayout) return inner;
  return (
    <AppLayout header={header} footer={footer} isModal={isModal}>
      {inner}
    </AppLayout>
  );
}
