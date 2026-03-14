import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect, useRef } from "react";

import { getAndClearPendingModalResult } from "./pendingModalResult";

type MaybePromise = void | Promise<void>;

type UseScreenFocusReloadOptions<TPending> = {
  initialLoad: () => MaybePromise;
  onFocusReload?: () => MaybePromise;
  beforeFocusReload?: () => MaybePromise;
  pendingModalKey?: string;
  applyPendingModalResult?: (pending: TPending) => void;
  skipInitialFocusReload?: boolean;
  deferFocusReload?: boolean;
};

export function useScreenFocusReload<TPending = never>({
  initialLoad,
  onFocusReload,
  beforeFocusReload,
  pendingModalKey,
  applyPendingModalResult,
  skipInitialFocusReload = true,
  deferFocusReload = false,
}: UseScreenFocusReloadOptions<TPending>) {
  const initialLoadRef = useRef(initialLoad);
  initialLoadRef.current = initialLoad;

  const onFocusReloadRef = useRef(onFocusReload);
  onFocusReloadRef.current = onFocusReload;

  const beforeFocusReloadRef = useRef(beforeFocusReload);
  beforeFocusReloadRef.current = beforeFocusReload;

  const pendingModalKeyRef = useRef(pendingModalKey);
  pendingModalKeyRef.current = pendingModalKey;

  const applyPendingModalResultRef = useRef(applyPendingModalResult);
  applyPendingModalResultRef.current = applyPendingModalResult;

  const deferFocusReloadRef = useRef(deferFocusReload);
  deferFocusReloadRef.current = deferFocusReload;

  const shouldSkipInitialFocusRef = useRef(skipInitialFocusReload);

  useEffect(() => {
    void initialLoadRef.current();
  }, []);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      let deferredReloadTimer: ReturnType<typeof setTimeout> | null = null;

      async function handleFocus() {
        if (shouldSkipInitialFocusRef.current) {
          shouldSkipInitialFocusRef.current = false;
          return;
        }

        const pendingKey = pendingModalKeyRef.current;
        if (pendingKey) {
          const pending = getAndClearPendingModalResult<TPending>(pendingKey);
          if (pending != null) {
            applyPendingModalResultRef.current?.(pending);
          }
        }

        await beforeFocusReloadRef.current?.();
        if (cancelled || !onFocusReloadRef.current) return;

        if (deferFocusReloadRef.current) {
          deferredReloadTimer = setTimeout(() => {
            if (!cancelled) {
              void onFocusReloadRef.current?.();
            }
          }, 0);
          return;
        }

        await onFocusReloadRef.current();
      }

      void handleFocus();

      return () => {
        cancelled = true;
        if (deferredReloadTimer != null) clearTimeout(deferredReloadTimer);
      };
    }, []),
  );
}
