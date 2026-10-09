"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { libraryRequest } from "./api";
import type { SourceFile } from "./source-types";
export function useSourceFolder(projectId: number, kind: "markdown" | "epub", onBusy: (busy: boolean) => void, groupId?: number) {
    const [files, setFiles] = useState<SourceFile[]>([]);
    const [loading, setLoading] = useState(true);
    const [pending, setPending] = useState("");
    const [error, setError] = useState<unknown>(null);
    const [notice, setNotice] = useState("");
    const mounted = useRef(false);
    const running = useRef(false);
    const revision = useRef(0);
    const endpoint = `projects/${projectId}/${kind === "markdown" ? "markdown-files" : "local-epubs"}${groupId ? `?group=${groupId}` : ""}`;
    const refresh = useCallback(async () => {
        const requestId = ++revision.current;
        const result = await libraryRequest<SourceFile[]>(endpoint);
        if (mounted.current && requestId === revision.current)
            setFiles(result);
    }, [endpoint]);
    useEffect(() => {
        mounted.current = true;
        let current = true;
        const requestId = ++revision.current;
        libraryRequest<SourceFile[]>(endpoint).then((result) => {
            if (current && requestId === revision.current)
                setFiles(result);
        }).catch((reason) => { if (current && requestId === revision.current)
            setError(reason); })
            .finally(() => { if (current)
            setLoading(false); });
        return () => { current = false; mounted.current = false; };
    }, [endpoint]);
    useEffect(() => {
        onBusy(Boolean(pending));
        return () => onBusy(false);
    }, [pending, onBusy]);
    async function run(label: string, action: () => Promise<void>) {
        if (running.current)
            return;
        running.current = true;
        setPending(label);
        setError(null);
        setNotice("");
        try {
            await action();
        }
        catch (reason) {
            if (mounted.current)
                setError(reason);
        }
        finally {
            running.current = false;
            if (mounted.current)
                setPending("");
        }
    }
    function notify(message: string) { if (mounted.current)
        setNotice(message); }
    return { files, loading, pending, error, setError, notice, notify, mounted, refresh, run };
}
