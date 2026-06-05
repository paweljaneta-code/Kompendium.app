"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { goBackOrHome } from "@/components/layout/BackButton";

type ModuleViewerProps = {
  title: string;
  document: string;
  fallbackHref?: string;
};

export function ModuleViewer({
  title,
  document,
  fallbackHref = "/"
}: ModuleViewerProps) {
  const router = useRouter();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.source !== iframeRef.current?.contentWindow) return;
      const data = event.data;
      if (!data || typeof data !== "object") return;

      if (data.type === "kompendium-nav-exhausted") {
        goBackOrHome(router, fallbackHref);
      }
    }

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [fallbackHref, router]);

  return (
    <iframe
      ref={iframeRef}
      title={title}
      srcDoc={document}
      className="block h-[100dvh] w-full border-0"
    />
  );
}
