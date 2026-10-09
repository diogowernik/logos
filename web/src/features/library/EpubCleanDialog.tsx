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

const kinds: Record<string, string> = { navigation: "Navegação", cover: "Capa", empty: "Vazio", front: "Preliminar", back: "Final", possible_navigation: "Possível navegação" };
export function EpubCleanDialog({ job, open, selected, onSelection, onClose, onClean, pending, error }: {
  job: EpubImportJob; open: boolean; selected: string[]; onSelection: (sections: string[]) => void;
  onClose: () => void; onClean: () => void; pending: string; error: unknown;
}) {
  return <Dialog open={open} onClose={pending ? undefined : onClose} fullWidth maxWidth="sm" aria-labelledby="clean-epub-title">
    <DialogTitle id="clean-epub-title">Preparar cópia limpa</DialogTitle>
    <DialogContent><Stack spacing={2}>
      <Typography variant="body2">{job.original_name}</Typography>
      <Typography variant="body2" color="text.secondary">Revise as seções que serão mantidas. O original não será alterado.</Typography>
      <ImportFeedback error={error} />
      <ImportWarnings warnings={job.inspection.warnings} />
      <Typography variant="body2">{selected.length} seções selecionadas</Typography>
      <ImportSectionList>
        {job.inspection.sections.map((section) => <ImportSectionRow key={section.href}>
          <Checkbox checked={selected.includes(section.href)} disabled={Boolean(pending)}
            slotProps={{ input: { "aria-label": `Manter ${section.title}` } }}
            onChange={(_, checked) => onSelection(checked ? [...selected, section.href] : selected.filter((href) => href !== section.href))} />
          <ImportSectionInfo>
            <Typography>{section.title}</Typography>
            <Typography variant="caption" color="text.secondary">{kinds[section.kind] ?? "Texto"} · {section.characters.toLocaleString("pt-BR")} caracteres</Typography>
            <Typography variant="body2" color="text.secondary">{section.preview}</Typography>
          </ImportSectionInfo>
        </ImportSectionRow>)}
      </ImportSectionList>
    </Stack></DialogContent>
    <DialogActions>
      <Button disabled={Boolean(pending)} onClick={onClose}>Cancelar</Button>
      <Button variant="contained" disabled={Boolean(pending) || !selected.length} onClick={onClean}>{pending || "Gerar cópia limpa"}</Button>
    </DialogActions>
  </Dialog>;
}
