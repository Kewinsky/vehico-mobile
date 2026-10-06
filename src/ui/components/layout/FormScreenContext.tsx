import { createContext, useContext } from "react";
import type { ScrollView as ScrollViewInstance } from "react-native";

const FormScreenScrollRefContext =
  createContext<React.RefObject<ScrollViewInstance | null> | null>(null);
const FormScreenKeyboardInsetContext = createContext<number | null>(null);

export function useFormScreenScrollRef() {
  return useContext(FormScreenScrollRefContext);
}

export function useFormScreenKeyboardInset() {
  return useContext(FormScreenKeyboardInsetContext);
}

export { FormScreenKeyboardInsetContext, FormScreenScrollRefContext };
