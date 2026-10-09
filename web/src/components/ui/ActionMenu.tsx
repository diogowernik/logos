"use client";
import { useId, useState, type ReactNode } from "react";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import { styled } from "@mui/material/styles";
import { MoreIcon, MoreVerticalIcon } from "@/components/icons/NavigationIcons";
export const DestructiveMenuItem = styled(MenuItem)(({ theme }) => ({
  color: theme.palette.error.main,
}));
export function ActionMenu({
  label,
  children,
  vertical = false,
}: {
  label: string;
  children: ReactNode;
  vertical?: boolean;
}) {
  const id = useId();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  return (
    <>
      <IconButton
        title={label}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={Boolean(anchor)}
        aria-controls={anchor ? id : undefined}
        onClick={(e) => setAnchor(e.currentTarget)}
      >
        {vertical ? <MoreVerticalIcon /> : <MoreIcon />}
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
