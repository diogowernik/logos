"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Markdown } from "@/components/Markdown";
import { useShell } from "@/components/shell/AppShell";
import { PreviewDocument } from "@/theme/workspace";

export type ReadingDocument = { name: string; markdown: string };

export function ProjectReading({ document }: { document: ReadingDocument | null }) {
    const { rightHost, rightOpen, setRightOpen } = useShell();
    const previous = useRef<ReadingDocument | null>(null);
    useEffect(() => {
        if (document || previous.current) setRightOpen(Boolean(document));
        previous.current = document;
    }, [document, setRightOpen]);
    if (!document || !rightOpen || !rightHost) return null;
    return createPortal(
        <PreviewDocument component="article" aria-label={`Leitura de ${document.name}`}>
            <Markdown content={document.markdown}/>
        </PreviewDocument>, rightHost,
    );
}
