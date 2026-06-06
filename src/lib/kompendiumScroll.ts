export const KOMPENDIUM_HOME_SCROLL_KEY = "kompendium-home-scroll";
export const KOMPENDIUM_PENDING_CARD_KEY = "kompendium-pending-card";

export function readHomeScrollPosition(): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(KOMPENDIUM_HOME_SCROLL_KEY);
    if (raw === null) return null;
    const y = parseInt(raw, 10);
    return Number.isFinite(y) && y >= 0 ? y : null;
  } catch {
    return null;
  }
}

export function clearHomeScrollPosition() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(KOMPENDIUM_HOME_SCROLL_KEY);
  } catch {
    // ignore
  }
}

export function restoreHomeScroll(win: Window, targetY: number) {
  const apply = () => win.scrollTo({ top: targetY, behavior: "auto" });
  apply();
  requestAnimationFrame(() => {
    apply();
    requestAnimationFrame(apply);
  });
  window.setTimeout(apply, 100);
}
