"use client";

import { useCallback, useRef } from "react";
import {
  clearHomeScrollPosition,
  readHomeScrollPosition,
  restoreHomeScroll
} from "@/lib/kompendiumScroll";

type HomeViewerProps = {
  document: string;
};

export function HomeViewer({ document }: HomeViewerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const handleLoad = useCallback(() => {
    const iframe = iframeRef.current;
    const win = iframe?.contentWindow;
    if (!win) return;

    const targetY = readHomeScrollPosition();
    if (targetY === null) return;

    clearHomeScrollPosition();
    restoreHomeScroll(win, targetY);
  }, []);

  return (
    <iframe
      ref={iframeRef}
      title="Zorza — strona główna"
      srcDoc={document}
      className="block h-[100dvh] w-full border-0"
      onLoad={handleLoad}
    />
  );
}
