"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    __eclipseBooted?: boolean;
  }
}

export default function EclipseLanding({
  bodyHtml,
  scriptJs,
}: {
  bodyHtml: string;
  scriptJs: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.__eclipseBooted) return;
    window.__eclipseBooted = true;
    const script = document.createElement("script");
    script.text = scriptJs;
    document.body.appendChild(script);
  }, [scriptJs]);

  return (
    <div
      ref={containerRef}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: bodyHtml }}
    />
  );
}
