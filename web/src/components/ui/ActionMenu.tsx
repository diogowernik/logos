"use client";
import { useId, useState, type ReactNode } from "react";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import { MoreIcon } from "@/components/icons/NavigationIcons";
export function ActionMenu({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  const id = useId();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  return (
    <>
      <IconButton
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={Boolean(anchor)}
        aria-controls={anchor ? id : undefined}
        onClick={(e) => setAnchor(e.currentTarget)}
      >
        <MoreIcon />
      </IconButton>
      <Menu
        id={id}
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        onClick={() => setAnchor(null)}
      >
        {children}
      </Menu>
    </>
  );
}
