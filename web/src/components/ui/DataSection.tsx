"use client";
import type { ReactNode } from "react";
import Paper from "@mui/material/Paper";
import CardHeader from "@mui/material/CardHeader";
import Box from "@mui/material/Box";
export function DataSection({
  title,
  action,
  children,
}: {
  title: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Paper
      component="section"
      variant="outlined"
      sx={{ overflow: "hidden", bgcolor: "transparent" }}
    >
      <CardHeader
        slotProps={{ title: { component: "h2", variant: "h6" } }}
        title={title}
        action={action}
      />
      <Box sx={{ p: 2 }}>{children}</Box>
    </Paper>
  );
}
