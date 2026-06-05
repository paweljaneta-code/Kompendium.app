"use client";

import { useRouter } from "next/navigation";

type BackButtonProps = {
  label?: string;
  className?: string;
  fallbackHref?: string;
  onBeforeBack?: () => boolean | void;
};

export function goBackOrHome(
  router: ReturnType<typeof useRouter>,
  fallbackHref = "/"
) {
  if (typeof window !== "undefined" && window.location.pathname.startsWith("/modules/")) {
    router.push(fallbackHref);
    return;
  }

  if (typeof window !== "undefined" && window.history.length > 1) {
    router.back();
    return;
  }

  router.push(fallbackHref);
}

export function BackButton({
  label = "← Wstecz",
  className = "text-sm font-medium text-[var(--primary)] hover:underline",
  fallbackHref = "/",
  onBeforeBack
}: BackButtonProps) {
  const router = useRouter();

  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        if (onBeforeBack?.() === true) return;
        goBackOrHome(router, fallbackHref);
      }}
    >
      {label}
    </button>
  );
}
