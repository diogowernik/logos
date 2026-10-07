"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { WtreeIcon } from "./icons/WtreeIcon";
import { LogoutButton } from "./LogoutButton";
import { SidebarIcon } from "./icons/NavigationIcons";

export function AppHeader({ sidebarCollapsed, onToggleSidebar, previewOpen, onTogglePreview }: {
  sidebarCollapsed?: boolean; onToggleSidebar?: () => void; previewOpen?: boolean; onTogglePreview?: () => void;
}) {
  const pathname = usePathname();
  const inLibrary = pathname === "/" || pathname.startsWith("/projects/");

  return <header className="app-header">
    <div className="app-toolbar">
      {onToggleSidebar && <button className="header-sidebar-toggle" aria-label={sidebarCollapsed ? "Mostrar navegação" : "Recolher navegação"} title={sidebarCollapsed ? "Mostrar navegação" : "Recolher navegação"} aria-expanded={!sidebarCollapsed} aria-controls="library-sidebar" onClick={onToggleSidebar}><SidebarIcon /></button>}
      <Link href="/" className="app-brand" aria-label="Logos — início">
        <WtreeIcon width={78} />
      </Link>
      <nav className="app-navigation" aria-label="Navegação principal">
        <Link href="/" className={inLibrary ? "active" : undefined}
          aria-current={inLibrary ? "true" : undefined}>Biblioteca</Link>
      </nav>
      <LogoutButton />
      {onTogglePreview && <button className="header-sidebar-toggle" aria-label={previewOpen ? "Ocultar preview" : "Mostrar preview"} title={previewOpen ? "Ocultar preview" : "Mostrar preview"} aria-expanded={previewOpen} aria-controls="text-preview" onClick={onTogglePreview}><SidebarIcon side="right" /></button>}
    </div>
  </header>;
}
