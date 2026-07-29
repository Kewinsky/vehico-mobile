import type { AlertButton } from "react-native";

export type TextPromptRequest = {
  id: string;
  title: string;
  message?: string;
  buttons?: AlertButton[];
  secureTextEntry?: boolean;
  defaultValue?: string;
  keyboardType?: string;
};

type PromptListener = (request: TextPromptRequest | null) => void;

let listener: PromptListener | null = null;

export function subscribeTextPrompt(nextListener: PromptListener) {
  listener = nextListener;
  return () => {
    if (listener === nextListener) {
      listener = null;
    }
  };
}

export function showTextPrompt(request: Omit<TextPromptRequest, "id">) {
  listener?.({
    ...request,
    id: `${Date.now()}`,
  });
}

export function hideTextPrompt() {
  listener?.(null);
}
