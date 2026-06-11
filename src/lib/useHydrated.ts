"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * Zwraca false podczas SSR i pierwszego renderu po stronie klienta, a po
 * hydracji true. Zastępuje wzorzec `useState(false)` + `useEffect(() =>
 * setMounted(true))` bez wywoływania setState w efekcie
 * (react-hooks/set-state-in-effect). Snapshot serwera = false (spójny z SSR),
 * snapshot klienta = true.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );
}
