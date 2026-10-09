import { useEffect, useRef, useState } from "react";
import { Markdown } from "@/components/Markdown";
import { ReadingButton } from "@/theme/workspace";
import { ImportPreviewDocument } from "@/theme/epub-import";
import { libraryRequest } from "./api";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Checkbox from "@mui/material/Checkbox";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import { ImportSectionList, ImportSectionRow, ImportSectionInfo } from "@/theme/epub-import";
import { ImportFeedback } from "./ImportFeedback";
import { ImportWarnings } from "./ImportWarnings";
import type { EpubImportJob } from "./import-types";

export function EpubCleanDialog({ job, open, selected, onSelection, onClose, onClean, pending, error }: {
  job: EpubImportJob; open: boolean; selected: string[]; onSelection: (sections: string[]) => void;
  onClose: () => void; onClean: () => void; pending: string; error: unknown;
}) {
  const [reading, setReading] = useState<{title: string; markdown: string} | null>(null);
  const [readingPending, setReadingPending] = useState(false);
  const [readingError, setReadingError] = useState<unknown>(null);
  const sequence = useRef(0);
  useEffect(() => () => { sequence.current++; }, []);
  function close() { sequence.current++; setReading(null); setReadingPending(false); onClose(); }
  async function read(section: EpubImportJob["inspection"]["sections"][number]) {
    const token = ++sequence.current;
    const title = section.title;
    setReading({title, markdown: ""}); setReadingPending(true); setReadingError(null);
    try {
      const result = await libraryRequest<{markdown: string}>(`epub-imports/${job.id}/section?href=${encodeURIComponent(section.href)}`);
      if (sequence.current === token) setReading({title, markdown: result.markdown});
    } catch (reason) { if (sequence.current === token) setReadingError(reason); }
    finally { if (sequence.current === token) setReadingPending(false); }
  }
  return <Dialog open={open} onClose={pending ? undefined : close} fullWidth maxWidth={reading ? "md" : "sm"} aria-labelledby="clean-epub-title">
    <DialogTitle id="clean-epub-title">{reading?.title ?? "Preparar EPUB limpo"}</DialogTitle>
    <DialogContent><Stack spacing={2}>
      <Typography variant="body2">{job.original_name}</Typography>
      <ImportFeedback error={error} />
      <ImportWarnings warnings={job.inspection.warnings} />
      {reading ? <>
        <ImportFeedback error={readingError}/>
        {readingPending ? <Typography role="status">Carregando…</Typography> : <ImportPreviewDocument><Markdown content={reading.markdown}/></ImportPreviewDocument>}
      </> : <ImportSectionList>
        {job.inspection.sections.map((section) => <ImportSectionRow key={section.href}>
          <Checkbox checked={selected.includes(section.href)} disabled={Boolean(pending)}
            slotProps={{ input: { "aria-label": `Manter ${section.title}` } }}
            onChange={(_, checked) => onSelection(checked ? [...selected, section.href] : selected.filter((href) => href !== section.href))} />
          <ImportSectionInfo>
            <ReadingButton onClick={() => void read(section)}>{section.title}</ReadingButton>
            {section.kind === "navigation" && <Typography component="div" variant="caption" color="text.secondary">{selected.includes(section.href) ? "Preservar sumário original." : "Será reconstruído."}</Typography>}
          </ImportSectionInfo>
        </ImportSectionRow>)}
      </ImportSectionList>}
    </Stack></DialogContent>
    <DialogActions>
      {reading ? <Button disabled={Boolean(pending)} onClick={() => { sequence.current++; setReading(null); setReadingPending(false); }}>Voltar</Button> : <Button disabled={Boolean(pending)} onClick={close}>Cancelar</Button>}
      <Button variant="contained" disabled={Boolean(pending) || !selected.length} onClick={onClean}>{pending || "Gerar EPUB limpo"}</Button>
    </DialogActions>
  </Dialog>;
}
