"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { usePathname } from "next/navigation";
import { Icon } from "./icons";

const MenuContext = createContext<{
  open: boolean;
  toggle: () => void;
  buttonRef: RefObject<HTMLButtonElement | null>;
} | null>(null);

export function HeaderFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onAccount = () => setOpen(false);
    window.addEventListener("academy-account-open", onAccount);
    return () => window.removeEventListener("academy-account-open", onAccount);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <MenuContext.Provider
      value={{
        open,
        toggle: () =>
          setOpen((value) => {
            const next = !value;
            if (next) window.dispatchEvent(new Event("academy-nav-open"));
            return next;
          }),
        buttonRef,
      }}
    >
      <header
        className="site-header"
        data-menu={open ? "open" : "closed"}
        onClick={(event) => {
          const target = event.target;
          if (!(target instanceof Element)) return;
          if (target.closest("a")) setOpen(false);
        }}
      >
        {children}
      </header>
    </MenuContext.Provider>
  );
}

export function MenuButton() {
  const menu = useContext(MenuContext);
  const open = menu?.open ?? false;
  return (
    <button
      ref={menu?.buttonRef}
      className="menu-btn"
      type="button"
      aria-label={open ? "Close menu" : "Open menu"}
      aria-expanded={open}
      aria-controls="academy-menu"
      onClick={() => menu?.toggle()}
    >
      <Icon name={open ? "close" : "menu"} />
    </button>
  );
}
