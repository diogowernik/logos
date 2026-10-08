import type { SVGProps } from "react";

function Icon({ children, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export function SidebarIcon({ side = "left" }: { side?: "left" | "right" }) {
  return (
    <Icon>
      <rect x="3" y="4" width="18" height="16" rx="3" />
      <path d={side === "right" ? "M15 4v16" : "M9 4v16"} />
    </Icon>
  );
}

export function ComposeIcon() {
  return (
    <Icon>
      <path d="M12 4H7a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-5" />
      <path d="m14.5 4.5 3 3M10 12l-1 4 4-1 8-8a2.12 2.12 0 0 0-3-3l-8 8Z" />
    </Icon>
  );
}

export function ChevronIcon({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <Icon className={`navigation-chevron ${collapsed ? "collapsed" : ""}`}>
      <path d="m6 9 6 6 6-6" />
    </Icon>
  );
}

export function FolderIcon() {
  return (
    <Icon className="folder-icon">
      <path d="M3 8V6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8Z" />
      <path d="M3 9h18" />
    </Icon>
  );
}

export function LibraryIcon() {
  return (
    <Icon>
      <rect x="3" y="4" width="4" height="16" rx="1" />
      <rect x="7" y="4" width="4" height="16" rx="1" />
      <path d="m13 5 4-1 4 15-4 1-4-15Z" />
    </Icon>
  );
}

export function PlusIcon() {
  return (
    <Icon>
      <path d="M12 5v14M5 12h14" />
    </Icon>
  );
}

export function MoreIcon() {
  return (
    <Icon strokeWidth="2.5">
      <path d="M5 12h.01M12 12h.01M19 12h.01" />
    </Icon>
  );
}

export function CopyIcon() {
  return (
    <Icon>
      <rect x="8" y="8" width="12" height="12" rx="2" />
      <path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" />
    </Icon>
  );
}

export function SaveIcon() {
  return (
    <Icon>
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h12l4 4v12a2 2 0 0 1-2 2Z" />
      <path d="M7 3v6h9V3M7 21v-7h10v7" />
    </Icon>
  );
}

export function ImageIcon() {
  return (
    <Icon>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="m21 15-5-5-7 8M3 16l4-4 4 4" />
    </Icon>
  );
}

export function DownloadIcon() {
  return (
    <Icon>
      <path d="M12 3v12m-5-5 5 5 5-5M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
    </Icon>
  );
}
