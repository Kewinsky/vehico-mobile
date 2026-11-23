import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useRef,
  type ReactNode,
  type RefObject,
} from "react";
import Swipeable, {
  type SwipeableMethods,
  type SwipeableProps,
} from "react-native-gesture-handler/ReanimatedSwipeable";

type ExclusiveSwipeContextValue = {
  onWillOpen: (ref: RefObject<SwipeableMethods | null>) => void;
  onDidClose: (ref: RefObject<SwipeableMethods | null>) => void;
};

const ExclusiveSwipeContext = createContext<ExclusiveSwipeContextValue | null>(
  null,
);

export function ExclusiveSwipeProvider({ children }: { children: ReactNode }) {
  const openRef = useRef<RefObject<SwipeableMethods | null> | null>(null);

  const onWillOpen = useCallback((ref: RefObject<SwipeableMethods | null>) => {
    const previous = openRef.current;
    if (previous && previous !== ref && previous.current) {
      previous.current.close();
    }
    openRef.current = ref;
  }, []);

  const onDidClose = useCallback((ref: RefObject<SwipeableMethods | null>) => {
    if (openRef.current === ref) {
      openRef.current = null;
    }
  }, []);

  return (
    <ExclusiveSwipeContext.Provider value={{ onWillOpen, onDidClose }}>
      {children}
    </ExclusiveSwipeContext.Provider>
  );
}

function useExclusiveSwipeContext(): ExclusiveSwipeContextValue {
  const ctx = useContext(ExclusiveSwipeContext);
  if (!ctx) {
    return {
      onWillOpen: () => {},
      onDidClose: () => {},
    };
  }
  return ctx;
}

export const ExclusiveSwipeable = forwardRef<
  SwipeableMethods,
  SwipeableProps
>(function ExclusiveSwipeable(
  { onSwipeableWillOpen, onSwipeableClose, ...props },
  forwardedRef,
) {
  const localRef = useRef<SwipeableMethods | null>(null);
  const { onWillOpen, onDidClose } = useExclusiveSwipeContext();

  const setRef = useCallback(
    (instance: SwipeableMethods | null) => {
      localRef.current = instance;
      if (typeof forwardedRef === "function") {
        forwardedRef(instance);
      } else if (forwardedRef) {
        forwardedRef.current = instance;
      }
    },
    [forwardedRef],
  );

  return (
    <Swipeable
      ref={setRef}
      {...props}
      onSwipeableWillOpen={(direction) => {
        onWillOpen(localRef);
        onSwipeableWillOpen?.(direction);
      }}
      onSwipeableClose={(direction) => {
        onDidClose(localRef);
        onSwipeableClose?.(direction);
      }}
    />
  );
});
