"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Icon } from "./icons";

const MenuContext = createContext<{ open: boolean; toggle: () => void } | null>(null);

export function HeaderFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <MenuContext.Provider value={{ open, toggle: () => setOpen((value) => !value) }}>
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
