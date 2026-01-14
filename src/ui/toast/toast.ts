import { Toast } from "toastify-react-native";

export function toastInfo(title: string, description?: string) {
  Toast.show({
    type: "info",
    text1: title,
    text2: description,
    position: "bottom",
    // keep consistent with global manager defaults
    useModal: false,
  });
}

export function toastSuccess(title: string, description?: string) {
  Toast.show({
    type: "success",
    text1: title,
    text2: description,
    position: "bottom",
    useModal: false,
  });
}

export function toastError(title: string, description?: string) {
  Toast.show({
    type: "error",
    text1: title,
    text2: description,
    position: "bottom",
    useModal: false,
  });
}

