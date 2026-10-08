"use client";
import Link from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import { ChevronIcon, PlusIcon } from "@/components/icons/NavigationIcons";
export function SidebarSection({
  title,
  open,
  controls,
  onToggle,
  createHref,
  createLabel,
}: {
  title: string;
  open?: boolean;
  controls?: string;
  onToggle?: () => void;
  createHref?: string;
  createLabel?: string;
}) {
  return (
    <Box
      sx={{
        mt: 2,
        mb: 0.5,
        px: 1,
        display: "flex",
        alignItems: "center",
        color: "text.secondary",
      }}
    >
      {onToggle ? (
        <Button
          variant="text"
          color="inherit"
          sx={{ fontSize: 16, fontWeight: 400, px: 0, gap: 0.5 }}
          aria-expanded={open}
          aria-controls={controls}
          onClick={onToggle}
        >
          {title}
          <ChevronIcon collapsed={!open} />
        </Button>
      ) : (
        <Typography sx={{ fontSize: 16 }}>{title}</Typography>
      )}
      {createHref && (
        <IconButton
          sx={{ ml: "auto" }}
          component={Link}
          href={createHref}
          aria-label={createLabel}
        >
          <PlusIcon />
        </IconButton>
      )}
    </Box>
  );
}
