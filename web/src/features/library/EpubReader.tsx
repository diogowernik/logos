"use client";
import { useEffect, useRef, useState } from "react";
import type { Book, Rendition, NavItem, Location } from "epubjs";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import { downloadRequest } from "@/api/client";
import { CloseIcon, ReadIcon, SidebarIcon } from "@/components/icons/NavigationIcons";
import { CompactActionButton } from "@/components/ui/HeaderControls";
import { EpubReaderHeading, EpubReaderLayout, EpubReaderViewport } from "@/theme/epub-reader";
import { errorMessage } from "./api";

function Toc({ items, onSelect }: { items: NavItem[]; onSelect: (href: string) => void }) {
  return <List disablePadding>{items.map((item) => <li key={item.id || item.href}>
    <ListItemButton onClick={() => onSelect(item.href)}><ListItemText primary={item.label.trim()}/></ListItemButton>
    {Boolean(item.subitems?.length) && <Toc items={item.subitems!} onSelect={onSelect}/>}
  </li>)}</List>;
}

function EpubReaderDialog({ url, filename, onClose }: { url: string; filename: string; onClose: () => void }) {
  const [host, setHost] = useState<HTMLDivElement | null>(null);
  const rendition = useRef<Rendition | null>(null);
  const [toc, setToc] = useState<NavItem[]>([]);
  const [tocOpen, setTocOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [navigating, setNavigating] = useState(false);
  const [error, setError] = useState("");
  const [bounds, setBounds] = useState({ atStart: true, atEnd: false });
  useEffect(() => {
    if (!host) return;
    let active = true;
    let book: Book | undefined;
    let reader: Rendition | undefined;
    const controller = new AbortController();
    const observer = new ResizeObserver(() => {
      if (active && reader && host.clientWidth && host.clientHeight) reader.resize(host.clientWidth, host.clientHeight);
    });
    async function load() {
      try {
        const [{ default: ePub }, blob] = await Promise.all([
          import("epubjs"), downloadRequest(url, { signal: controller.signal }),
        ]);
        const content = await blob.arrayBuffer();
        if (!active) return;
        book = ePub(content);
        await book.opened;
        if (!active) return;
        const navigation = await book.loaded.navigation;
        if (!active) return;
        setToc(navigation.toc);
        reader = book.renderTo(host!, {
          width: "100%", height: "100%", spread: "none", flow: "paginated", allowScriptedContent: false,
        });
        rendition.current = reader;
        reader.on("relocated", (location: Location) => { if (active) setBounds({ atStart: location.atStart, atEnd: location.atEnd }); });
        reader.on("displayError", (reason: unknown) => { if (active) setError(errorMessage(reason)); });
        await reader.display();
        if (active) observer.observe(host!);
      } catch (reason) {
        if (active) setError(errorMessage(reason));
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
      controller.abort();
      observer.disconnect();
      rendition.current = null;
      book?.destroy();
    };
  }, [url, host]);
  async function navigate(target: "previous" | "next" | { href: string }) {
    const reader = rendition.current;
    if (!reader || navigating) return;
    setNavigating(true);
    setError("");
    try {
      if (typeof target === "object") { setTocOpen(false); await reader.display(target.href); }
      else if (target === "previous") await reader.prev();
      else await reader.next();
    } catch (reason) { if (rendition.current === reader) setError(errorMessage(reason)); }
    finally { if (rendition.current === reader) setNavigating(false); }
  }
  return <Dialog open onClose={onClose} fullWidth maxWidth="lg" aria-labelledby="epub-reader-title">
    <DialogTitle component="div"><EpubReaderHeading>
      <Typography id="epub-reader-title" component="h2" variant="h6">{filename}</Typography>
      <CompactActionButton label="Fechar leitura" onClick={onClose}><CloseIcon /></CompactActionButton>
    </EpubReaderHeading></DialogTitle>
    <DialogContent>
      {loading && <Typography role="status">Abrindo EPUB…</Typography>}
      {error && <Alert severity="error">{error}</Alert>}
      <EpubReaderLayout tocOpen={tocOpen}>
        {tocOpen && <nav aria-label="Sumário do EPUB"><Toc items={toc} onSelect={(href) => void navigate({ href })}/></nav>}
        <EpubReaderViewport ref={setHost} data-epub-viewport aria-label="Páginas do EPUB"/>
      </EpubReaderLayout>
    </DialogContent>
    <DialogActions>
      <Button startIcon={<SidebarIcon/>} disabled={loading || !toc.length || navigating} aria-expanded={tocOpen} onClick={() => setTocOpen(!tocOpen)}>Sumário</Button>
      <Button disabled={loading || navigating || bounds.atStart} onClick={() => void navigate("previous")}>Anterior</Button>
      <Button disabled={loading || navigating || bounds.atEnd} onClick={() => void navigate("next")}>Próxima</Button>
    </DialogActions>
  </Dialog>;
}

export function EpubReadButton({ url, filename, disabled = false }: { url: string; filename: string; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  return <>
    <CompactActionButton label={`Ler ${filename}`} disabled={disabled} onClick={() => setOpen(true)}><ReadIcon /></CompactActionButton>
    {open && <EpubReaderDialog key={url} url={url} filename={filename} onClose={() => setOpen(false)}/>}
  </>;
}
