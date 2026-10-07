import Link from "next/link";
import { ChevronIcon, PlusIcon } from "@/components/icons/NavigationIcons";

export function SidebarSection({ title, open, controls, onToggle, createHref, createLabel }: {
  title: string; open?: boolean; controls?: string; onToggle?: () => void;
  createHref?: string; createLabel?: string;
}) {
  return <div className="sidebar-heading">
    {onToggle ? <button className="sidebar-section-toggle" aria-expanded={open} aria-controls={controls} onClick={onToggle}>{title}<ChevronIcon collapsed={!open} /></button> : <span>{title}</span>}
    {createHref && <Link className="sidebar-icon-action section-create" aria-label={createLabel} title={createLabel} href={createHref}><PlusIcon /></Link>}
  </div>;
}
