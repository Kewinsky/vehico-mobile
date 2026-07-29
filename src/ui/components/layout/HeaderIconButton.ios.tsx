import { HeaderButton } from "@react-navigation/elements";

import type { HeaderIconButtonProps } from "./HeaderIconButton.types";

export type { HeaderIconButtonProps } from "./HeaderIconButton.types";

/** iOS uses native bar button styling (glass on supported OS versions). */
export function HeaderIconButton(props: HeaderIconButtonProps) {
  return <HeaderButton {...props} />;
}
