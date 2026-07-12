import { useCallback, useState } from "react";
import {
  runOnJS,
  useAnimatedReaction,
  type SharedValue,
} from "react-native-reanimated";

import type { ChartPressState } from "victory-native";

type ChartPressStateInit = {
  x: string | number;
  y: Record<string, number>;
};

type YPressState = Record<
  string,
  {
    value: SharedValue<number>;
    position: SharedValue<number>;
  }
>;

type XPressState<T> = {
  value: SharedValue<T>;
  position: SharedValue<number>;
};

export function useChartPressTooltipText<Init extends ChartPressStateInit>({
  state,
  buildText,
}: {
  state: ChartPressState<Init>;
  buildText: (x: Init["x"], y: Record<keyof Init["y"], number>) => string;
}) {
  const [text, setText] = useState<string | null>(null);

  const syncText = useCallback(() => {
    if (!state.isActive.value) {
      setText(null);
      return;
    }

    const xValue = state.x.value.value as Init["x"];
    const yValues = Object.fromEntries(
      Object.entries(state.y).map(([key, entry]) => [
        key,
        (entry as YPressState[string]).value.value,
      ]),
    ) as Record<keyof Init["y"], number>;

    setText(buildText(xValue, yValues));
  }, [buildText, state]);

  const clearText = useCallback(() => {
    setText(null);
  }, []);

  useAnimatedReaction(
    () => ({
      active: state.isActive.value,
      index: state.matchedIndex.value,
    }),
    (current, previous) => {
      if (!current.active) {
        if (previous?.active) {
          runOnJS(clearText)();
        }
        return;
      }

      if (
        !previous?.active ||
        current.index !== previous.index
      ) {
        runOnJS(syncText)();
      }
    },
    [clearText, syncText],
  );

  return text;
}
