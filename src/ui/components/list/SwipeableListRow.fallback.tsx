import { ExclusiveSwipeable } from "../common/ExclusiveSwipeable";
import { SwipeActionsRow } from "../common/SwipeActions";
import type { SwipeableListRowProps } from "./SwipeableListRow.types";

export function SwipeableListRow({
  children,
  actions,
  swipeableRef,
}: SwipeableListRowProps) {
  if (actions.length === 0) return <>{children}</>;

  return (
    <ExclusiveSwipeable
      ref={swipeableRef}
      rightThreshold={32}
      renderRightActions={(progress) => (
        <SwipeActionsRow progress={progress} actions={actions} />
      )}
    >
      {children}
    </ExclusiveSwipeable>
  );
}
