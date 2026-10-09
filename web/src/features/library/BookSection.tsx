"use client";
import { useId, type ReactNode } from "react";
import Collapse from "@mui/material/Collapse";
import Typography from "@mui/material/Typography";
import { ChevronIcon } from "@/components/icons/NavigationIcons";
import { BookSectionRoot, BookSectionHeader, BookSectionToggle, BookSectionBody } from "@/theme/project";

export type BookSectionProps = { expanded?: boolean; onToggle?: () => void };
export function BookSection({ title, expanded = true, onToggle, actions, children }: BookSectionProps & {
  title: string; actions?: ReactNode; children: ReactNode;
}) {
  const id = useId();
  return <BookSectionRoot component="section" aria-label={title}>
    <BookSectionHeader>
      <BookSectionToggle id={`${id}-heading`} aria-expanded={expanded} aria-controls={`${id}-body`} onClick={onToggle}>
        <ChevronIcon collapsed={!expanded}/><Typography component="h2">{title}</Typography>
      </BookSectionToggle>
      {actions}
    </BookSectionHeader>
    <Collapse in={expanded}>
      <BookSectionBody id={`${id}-body`} aria-labelledby={`${id}-heading`} inert={!expanded}>
        {children}
      </BookSectionBody>
    </Collapse>
  </BookSectionRoot>;
}
