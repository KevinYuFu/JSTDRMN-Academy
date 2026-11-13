"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { usePathname } from "next/navigation";
import { Icon } from "./icons";

const MenuContext = createContext<{
  menuOpen: boolean;
  accountOpen: boolean;
  toggleMenu: () => void;
  toggleAccount: () => void;
  buttonRef: RefObject<HTMLButtonElement | null>;
} | null>(null);

export function HeaderFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setMenuOpen(false);
      buttonRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  function toggleMenu() {
    setMenuOpen((open) => !open);
    setAccountOpen(false);
  }

  function toggleAccount() {
    setAccountOpen((open) => !open);
    setMenuOpen(false);
  }

  return (
    <MenuContext.Provider value={{ menuOpen, accountOpen, toggleMenu, toggleAccount, buttonRef }}>
      <header
        className="site-header"
        data-menu={menuOpen ? "open" : "closed"}
        onClick={(event) => {
          const target = event.target;
          if (!(target instanceof Element)) return;
          if (target.closest("a")) setMenuOpen(false);
        }}
      >
        {children}
      </header>
    </MenuContext.Provider>
  );
}

export function MenuButton() {
  const menu = useContext(MenuContext);
  const open = menu?.menuOpen ?? false;
  return (
    <button
      ref={menu?.buttonRef}
      className="menu-btn"
      type="button"
      aria-label={open ? "Close menu" : "Open menu"}
      aria-expanded={open}
      aria-controls="academy-menu"
      onClick={() => menu?.toggleMenu()}
    >
      <Icon name={open ? "close" : "menu"} />
    </button>
  );
}

export function useHeaderMenu() {
  const menu = useContext(MenuContext);
  if (!menu) throw new Error("Header controls must render inside HeaderFrame.");
  return menu;
}
