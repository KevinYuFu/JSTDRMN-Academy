import type { ReactNode } from "react";

type IconName =
  | "play"
  | "pause"
  | "check"
  | "lock"
  | "download"
  | "eye"
  | "slides"
  | "bell"
  | "volume"
  | "fullscreen"
  | "menu"
  | "close"
  | "cloud"
  | "heart"
  | "spark"
  | "school"
  | "disc"
  | "trophy";

const paths: Record<IconName, ReactNode> = {
  play: <path d="M8 5v14l11-7z" fill="currentColor" />,
  pause: <path d="M6 5h4v14H6zm8 0h4v14h-4z" fill="currentColor" />,
  check: <path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z" fill="currentColor" />,
  lock: (
    <path
      d="M12 17a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm6-7h-1V8a5 5 0 0 0-10 0v2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2zM9 8a3 3 0 0 1 6 0v2H9V8z"
      fill="currentColor"
    />
  ),
  download: <path d="M5 20h14v-2H5v2zM11 4h2v8h3l-4 4-4-4h3V4z" fill="currentColor" />,
  eye: (
    <path
      d="M12 6C7 6 2.7 9.1 1 12c1.7 2.9 6 6 11 6s9.3-3.1 11-6c-1.7-2.9-6-6-11-6zm0 10a4 4 0 1 1 0-8 4 4 0 0 1 0 8z"
      fill="currentColor"
    />
  ),
  slides: <path d="M4 6h16v10H4V6zm2 12h12v2H6v-2zm4-8 5 3-5 3V10z" fill="currentColor" />,
  bell: (
    <path
      d="M12 22a2.5 2.5 0 0 0 2.4-2h-4.8A2.5 2.5 0 0 0 12 22zm7-6V11a7 7 0 0 0-5-6.7V3a2 2 0 1 0-4 0v1.3A7 7 0 0 0 5 11v5l-2 2v1h18v-1l-2-2z"
      fill="currentColor"
    />
  ),
  volume: <path d="M4 9v6h4l5 4V5L8 9H4zm11.5 3a4.5 4.5 0 0 0-2.5-4.03v8.05A4.5 4.5 0 0 0 15.5 12z" fill="currentColor" />,
  fullscreen: <path d="M7 14H5v5h5v-2H7v-3zm0-4h3V7h5V5H5v5zm10 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" fill="currentColor" />,
  menu: <path d="M3 6h18v2H3V6zm0 5h18v2H3v-2zm0 5h18v2H3v-2z" fill="currentColor" />,
  close: <path d="M18.3 5.7 12 12l6.3 6.3-1.4 1.4L10.6 13.4 4.3 19.7 2.9 18.3 9.2 12 2.9 5.7 4.3 4.3l6.3 6.3 6.3-6.3z" fill="currentColor" />,
  cloud: <path d="M19 18H6a4 4 0 0 1-.4-8 6 6 0 0 1 11.5-1.6A4.5 4.5 0 0 1 19 18z" fill="currentColor" />,
  heart: <path d="M12 21s-7-4.4-7-10a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 5.6-7 10-7 10z" fill="currentColor" />,
  spark: <path d="m12 2 1.6 5.2L19 9l-5.4 1.8L12 16l-1.6-5.2L5 9l5.4-1.8L12 2z" fill="currentColor" />,
  school: <path d="M12 3 1 9l11 6 9-4.9V17h2V9L12 3zM5 13.2V17c2.2 1.8 4.8 2.5 7 2.5s4.8-.7 7-2.5v-3.8l-7 3.8-7-3.8z" fill="currentColor" />,
  disc: <path d="M12 2a10 10 0 1 0 .01 20.01A10 10 0 0 0 12 2zm0 12a2 2 0 1 1 0-4 2 2 0 0 1 0 4z" fill="currentColor" />,
  trophy: <path d="M7 4h10v2a5 5 0 0 1-4 4.9V14h3v2H8v-2h3v-3.1A5 5 0 0 1 7 6V4zM5 4H2v2a4 4 0 0 0 4 4h.2A6.9 6.9 0 0 1 5 6V4zm14 0v2a6.9 6.9 0 0 1-1.2 4H18a4 4 0 0 0 4-4V4h-3zM8 18h8v2H8z" fill="currentColor" />,
};

export function Icon({ name, className }: { name: IconName; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className ? `icon ${className}` : "icon"} aria-hidden>
      {paths[name]}
    </svg>
  );
}
