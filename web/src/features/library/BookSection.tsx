"use client";
import { useId, type ReactNode } from "react";
import CardHeader from "@mui/material/CardHeader";
import CardContent from "@mui/material/CardContent";
import Collapse from "@mui/material/Collapse";
import Typography from "@mui/material/Typography";
import { ChevronIcon } from "@/components/icons/NavigationIcons";
import { HeaderTitleControls } from "@/components/ui/HeaderControls";
import { BookSectionRoot, BookSectionToggle } from "@/theme/project";

export type BookSectionProps = { expanded?: boolean; onToggle?: () => void };
export function BookSection({ title, expanded = true, onToggle, actions, titleControls, children }: BookSectionProps & {
  title: string; actions?: ReactNode; titleControls?: ReactNode; children: ReactNode;
}) {
  const id = useId();
  return <BookSectionRoot component="section" aria-label={title}>
    <CardHeader disableTypography title={
      <HeaderTitleControls><BookSectionToggle id={`${id}-heading`} aria-expanded={expanded} aria-controls={`${id}-body`} onClick={onToggle}>
        <ChevronIcon collapsed={!expanded}/><Typography component="h2" variant="h6">{title}</Typography>
      </BookSectionToggle>{titleControls}</HeaderTitleControls>
    } action={actions}/>
    <Collapse in={expanded}>
      <CardContent id={`${id}-body`} aria-labelledby={`${id}-heading`} inert={!expanded}>
        {children}
      </CardContent>
    </Collapse>
  </BookSectionRoot>;
}
