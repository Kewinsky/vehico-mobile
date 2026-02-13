import { useRef, useState } from "react";
import { TextInput } from "react-native";
import type { ComponentProps } from "react";

import { useFormScreenScrollRef } from "./FormScreen";

type Props = ComponentProps<typeof TextInput> & {
  /**
   * When enabled (default), keeps the caret visible while typing at the end of a
   * multiline input by scrolling the parent `FormScreen` to the bottom.
   *
   * It intentionally does NOT try to follow edits in the middle of the text to
   * avoid jumpy UX.
   */
  followCursor?: boolean;
  /**
   * Forces a fixed height for the input. Useful to prevent the multiline input
   * from growing and instead allow scrolling inside the TextInput.
   *
   * When provided, `scrollEnabled` defaults to `true` (unless explicitly set).
   */
  fixedHeight?: number;
};

export function Textarea({
  followCursor = true,
  fixedHeight,
  onFocus,
  onBlur,
  onSelectionChange,
  onChangeText,
  onContentSizeChange,
  value,
  style,
  scrollEnabled,
  ...rest
}: Props) {
  const formScrollRef = useFormScreenScrollRef();
  const [focused, setFocused] = useState(false);
  const selectionRef = useRef<{ start: number; end: number }>({
    start: 0,
    end: 0,
  });

  const valueText = typeof value === "string" ? value : null;
  const computedScrollEnabled =
    fixedHeight != null ? (scrollEnabled ?? true) : scrollEnabled;

  function maybeScrollToCaret() {
    if (!followCursor) return;
    if (!focused) return;
    if (!formScrollRef?.current) return;
    if (valueText == null) return;

    // Only auto-scroll when typing at the end of the text.
    if (selectionRef.current.end !== valueText.length) return;

    requestAnimationFrame(() => {
      formScrollRef.current?.scrollToEnd({ animated: true });
    });
  }

  return (
    <TextInput
      {...rest}
      value={value}
      scrollEnabled={computedScrollEnabled}
      style={[
        style,
        fixedHeight != null && {
          height: fixedHeight,
          textAlignVertical: "top",
        },
      ]}
      onFocus={(e) => {
        setFocused(true);
        onFocus?.(e);
        maybeScrollToCaret();
      }}
      onBlur={(e) => {
        setFocused(false);
        onBlur?.(e);
      }}
      onSelectionChange={(e) => {
        selectionRef.current = e.nativeEvent.selection;
        onSelectionChange?.(e);
      }}
      onChangeText={(text) => {
        onChangeText?.(text);
        maybeScrollToCaret();
      }}
      onContentSizeChange={(e) => {
        onContentSizeChange?.(e);
        maybeScrollToCaret();
      }}
    />
  );
}
