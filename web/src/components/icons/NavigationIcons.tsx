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

export function ReadIcon() {
  return <Icon><path d="M12 6c-3-2-6-2-9-1v14c3-1 6-1 9 1 3-2 6-2 9-1V5c-3-1-6-1-9 1Z"/><path d="M12 6v14"/></Icon>;
}

export function PlusIcon() {
  return (
    <Icon>
      <path d="M12 5v14M5 12h14" />
    </Icon>
  );
}

export function SettingsIcon() {
  return <Icon><path d="m9 3-.5 3-2 1.2L3.8 6l-2 3.5L4 11v2l-2.2 1.5 2 3.5 2.7-1.2 2 1.2.5 3h6l.5-3 2-1.2 2.7 1.2 2-3.5L20 13v-2l2.2-1.5-2-3.5-2.7 1.2-2-1.2L15 3Z"/><circle cx="12" cy="12" r="3"/></Icon>;
}

export function CheckCircleIcon() {
  return <Icon><circle cx="12" cy="12" r="10" fill="currentColor" stroke="none"/><path d="m7 12 3 3 7-7" stroke="white"/></Icon>;
}

export function SearchIcon() {
  return (
    <Icon>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m16 16 5 5" />
    </Icon>
  );
}

export function FilterIcon() {
  return (
    <Icon>
      <path d="M4 4h16l-6 7v7l-4 2V11L4 4Z" />
    </Icon>
  );
}

export function CloseIcon() {
  return (
    <Icon>
      <path d="m6 6 12 12M18 6 6 18" />
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

export function DuplicateIcon() {
  return <Icon><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3M14 11v6M11 14h6"/></Icon>;
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

export function UploadIcon() {
  return (
    <Icon>
      <path d="M12 16V3m-5 5 5-5 5 5M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
    </Icon>
  );
}

export function DeleteIcon() {
  return (
    <Icon>
      <path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7" />
    </Icon>
  );
}

export function MoreVerticalIcon() {
  return <Icon strokeWidth="2.5"><path d="M12 5v.01M12 12v.01M12 19v.01" /></Icon>;
}
export function ExtractIcon() {
  return <Icon><path d="M3 3h12v18H3zM7 7h4M7 11h3M13 12h9m-4-4 4 4-4 4" /></Icon>;
}
export function CleanIcon() {
  return <Icon><path d="M13 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6M7 12h5M7 16h8M18 2l1.2 3.8L23 7l-3.8 1.2L18 12l-1.2-3.8L13 7l3.8-1.2Z" /></Icon>;
}
export function RefreshIcon() {
  return <Icon><path d="M20 7a8 8 0 1 0 1 8M20 3v5h-5" /></Icon>;
}

export function LockIcon() {
  return <Icon><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V6a4 4 0 0 1 8 0v4M12 14v3" /></Icon>;
}
