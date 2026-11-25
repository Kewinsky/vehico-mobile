import type { ReactNode, Ref } from "react";
import type { SwipeableMethods } from "react-native-gesture-handler/ReanimatedSwipeable";
import type { SFSymbol } from "sf-symbols-typescript";

import type { SwipeActionConfig } from "../common/SwipeActions";

export type ListRowAction = SwipeActionConfig & {
  systemImage: SFSymbol;
  accessibilityLabel: string;
};

export type SwipeableListRowProps = {
  children: ReactNode;
  actions: ListRowAction[];
  swipeableRef?: Ref<SwipeableMethods>;
};
