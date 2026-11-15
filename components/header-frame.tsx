"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { usePathname } from "next/navigation";
import { Icon } from "./icons";

const MenuContext = createContext<{
  menuOpen: boolean;
  accountOpen: boolean;
  toggleMenu: () => void;
  toggleAccount: () => void;
  closeAfterNavigation: () => void;
  buttonRef: RefObject<HTMLButtonElement | null>;
} | null>(null);

export function HeaderFrame({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const closeAfterNavigation = useCallback(() => {
    setMenuOpen((open) => (open ? false : open));
    setAccountOpen((open) => (open ? false : open));
  }, []);

  const toggleMenu = useCallback(() => {
    setMenuOpen((open) => !open);
    setAccountOpen(false);
  }, []);

  const toggleAccount = useCallback(() => {
    setAccountOpen((open) => !open);
    setMenuOpen(false);
  }, []);

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

  const menu = useMemo(
    () => ({ menuOpen, accountOpen, toggleMenu, toggleAccount, closeAfterNavigation, buttonRef }),
    [menuOpen, accountOpen, toggleMenu, toggleAccount, closeAfterNavigation],
  );

  return (
    <MenuContext.Provider value={menu}>
      <CloseMenuOnNavigate />
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

/** Closes open menus when the URL changes, without subscribing the header shell to the path. */
function CloseMenuOnNavigate() {
  const pathname = usePathname();
  const menu = useContext(MenuContext);
  const closeRef = useRef(menu?.closeAfterNavigation);
  closeRef.current = menu?.closeAfterNavigation;

  useLayoutEffect(() => {
    closeRef.current?.();
  }, [pathname]);

  return null;
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
