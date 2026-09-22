import type { ReactNode } from "react";

const PATHS: Record<string, ReactNode> = {
  folder: (
    <>
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
    </>
  ),
  folderOpen: (
    <>
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v1H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2H11" />
    </>
  ),
  play: (
    <>
      <path d="M8 5.5v13l11-6.5-11-6.5z" />
    </>
  ),
  scan: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </>
  ),
  trash: (
    <>
      <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-12M10 11v5M14 11v5" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h.01" />
    </>
  ),
  check: (
    <>
      <path d="M5 12.5l5 5L19 7" />
    </>
  ),
  gem: (
    <>
      <path d="M7 3h10l4 6-9 12L3 9l4-6z" />
      <path d="M3 9h18M9 3l3 6 3-6M12 21l-3-12 3-6 3 6-3 12" />
    </>
  ),
  x: (
    <>
      <path d="M6 6l12 12M18 6L6 18" />
    </>
  ),
  minus: (
    <>
      <path d="M6 12h12" />
    </>
  ),
  square: (
    <>
      <rect x="6" y="6" width="12" height="12" rx="1.5" />
    </>
  ),
  restore: (
    <>
      <rect x="7" y="7" width="12" height="12" rx="1.5" />
      <path d="M5 13V5a1 1 0 0 1 1-1h8" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18" />
    </>
  ),
  sparkle: (
    <>
      <path d="M12 3l2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5z" />
      <path d="M19 15l.8 2 .2 1 2 .8-2 .2-.2 1-.8 2-.8-2-.2-1-2-.8 2-.2.2-1 .8-2z" />
    </>
  ),
  chevron: (
    <>
      <path d="M9 6l6 6-6 6" />
    </>
  ),
  chevronDown: (
    <>
      <path d="M6 9l6 6 6-6" />
    </>
  ),
  gear: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9L17 7M7 17l-2.1 2.1" />
    </>
  ),
  key: (
    <>
      <circle cx="8" cy="14" r="4" />
      <path d="M11 11L20 2M16 6l3 3M13 9l2 2" />
    </>
  ),
  palette: (
    <>
      <path d="M12 3a9 9 0 1 0 0 18 2 2 0 0 0 0-4h-2a1 1 0 0 1 0-4h2.5A2.5 2.5 0 0 0 15 10.5 6.5 6.5 0 0 0 12 3z" />
      <circle cx="7.5" cy="10.5" r="1" />
      <circle cx="10" cy="7" r="1" />
    </>
  ),
  puzzle: (
    <>
      <path d="M9 3h6v3h1a2 2 0 0 1 0 4h-1v4h-2v-1a2 2 0 0 0-4 0v1H7V10H5a2 2 0 0 1 0-4h2V3z" />
      <path d="M9 3v3M15 3v3" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 3.5-6 8-6s8 2 8 6" />
    </>
  ),
  code: (
    <>
      <path d="M8 7l-5 5 5 5M16 7l5 5-5 5M14 4l-4 16" />
    </>
  ),
  list: (
    <>
      <path d="M8 6h12M8 12h12M8 18h12" />
      <circle cx="4" cy="6" r="1" />
      <circle cx="4" cy="12" r="1" />
      <circle cx="4" cy="18" r="1" />
    </>
  ),
  help: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9a2.5 2.5 0 0 1 4.5 1.5c0 1.5-2 2-2 3M12 17h.01" />
    </>
  ),
  copy: (
    <>
      <rect x="9" y="9" width="11" height="11" rx="1.5" />
      <path d="M5 15V5a1 1 0 0 1 1-1h10" />
    </>
  ),
  save: (
    <>
      <path d="M12 3v10" />
      <path d="M7 9l5 5 5-5" />
      <path d="M4 17v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
    </>
  ),
  power: (
    <>
      <path d="M12 3v9" />
      <path d="M6 6.5a8 8 0 1 0 12 0" />
    </>
  ),
  doc: (
    <>
      <path d="M7 3h7l4 4v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
      <path d="M14 3v4h4M9 12h6M9 16h6" />
    </>
  ),
  bug: (
    <>
      <circle cx="12" cy="13" r="5" />
      <path d="M12 8V6M12 18v2M8 13H4M20 13h-4M6.5 9.5 3.5 7M17.5 9.5l3-2.5M6.5 16.5 3.5 19M17.5 16.5l3 2.5" />
    </>
  ),
  reset: (
    <>
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
      <path d="M3 3v5h5" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" />
    </>
  ),
  moon: (
    <>
      <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />
    </>
  ),
  monitor: (
    <>
      <rect x="3" y="4" width="18" height="13" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3l8 3v6c0 4.5-3.5 7.5-8 9-4.5-1.5-8-4.5-8-9V6l8-3z" />
      <path d="M9 12l2 2 4-4" />
    </>
  ),
  
};

interface IconProps {
  name: keyof typeof PATHS & string;
  size?: number;
  color?: string;
  className?: string;
}

export type IconName = keyof typeof PATHS & string;

export function Icon({ name, size = 18, color = "currentColor", className }: IconProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  );
}