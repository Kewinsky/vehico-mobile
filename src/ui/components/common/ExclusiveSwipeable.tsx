import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useRef,
  type ComponentProps,
  type ReactNode,
  type RefObject,
} from "react";
import Swipeable from "react-native-gesture-handler/Swipeable";

type ExclusiveSwipeContextValue = {
  onWillOpen: (ref: RefObject<Swipeable | null>) => void;
  onDidClose: (ref: RefObject<Swipeable | null>) => void;
};

const ExclusiveSwipeContext = createContext<ExclusiveSwipeContextValue | null>(
  null,
);

export function ExclusiveSwipeProvider({ children }: { children: ReactNode }) {
  const openRef = useRef<RefObject<Swipeable | null> | null>(null);

  const onWillOpen = useCallback((ref: RefObject<Swipeable | null>) => {
    const previous = openRef.current;
    if (previous && previous !== ref && previous.current) {
      previous.current.close();
    }
    openRef.current = ref;
  }, []);

  const onDidClose = useCallback((ref: RefObject<Swipeable | null>) => {
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
  Swipeable,
  ComponentProps<typeof Swipeable>
>(function ExclusiveSwipeable(
  { onSwipeableWillOpen, onSwipeableClose, ...props },
  forwardedRef,
) {
  const localRef = useRef<Swipeable | null>(null);
  const { onWillOpen, onDidClose } = useExclusiveSwipeContext();

  const setRef = useCallback(
    (instance: Swipeable | null) => {
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
      onSwipeableClose={(direction, swipeable) => {
        onDidClose(localRef);
        onSwipeableClose?.(direction, swipeable);
      }}
    />
  );
});
