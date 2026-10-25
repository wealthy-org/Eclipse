"use client";

import { useEffect } from "react";
import { IcClose } from "./icons";

export default function AppDrawer({
  open,
  onClose,
  eyebrow,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  eyebrow?: string;
  title: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <>
      <div className={`app-scrim${open ? " open" : ""}`} onClick={onClose} aria-hidden="true" />
      <aside className={`app-drawer${open ? " open" : ""}`} role="dialog" aria-modal="true" aria-hidden={!open}>
        <div className="app-drawer-head">
          <div>
            {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
            <h2>{title}</h2>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            <IcClose className="ic" />
          </button>
        </div>
        <div className="app-drawer-body">{children}</div>
      </aside>
    </>
  );
}
