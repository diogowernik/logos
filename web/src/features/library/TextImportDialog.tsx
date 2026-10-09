import { useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Stack from "@mui/material/Stack";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import RadioGroup from "@mui/material/RadioGroup";
import Radio from "@mui/material/Radio";
import FormControlLabel from "@mui/material/FormControlLabel";
import { Markdown } from "@/components/Markdown";
import { ImportPreviewDocument, ImportPreviewList, ImportReviewLayout } from "@/theme/epub-import";
import { ImportFeedback } from "./ImportFeedback";
import { ImportWarnings } from "./ImportWarnings";
import type { EpubSource, ExtractionPreview } from "./import-types";

type DialogProps = {
    open: boolean;
    preview: ExtractionPreview | null;
    source: EpubSource | "markdown";
    pending: string;
    stale: boolean;
    error: unknown;
    onClose: () => void;
    onReload: () => void;
    onExtract: (mode: "append" | "replace", confirm: boolean) => void;
};

function Review({ preview, source, pending, stale, error, onClose, onReload, onExtract }: Omit<DialogProps, "open">) {
    const [section, setSection] = useState(0);
    const [mode, setMode] = useState<"" | "append" | "replace">("");
    const current = preview?.sections[section];
    const variations = preview ? preview.existing_text_count - preview.existing_primary_count : 0;
    const canGenerate = Boolean(preview?.sections.length) && !pending && !stale && (!preview?.requires_confirmation || Boolean(mode));
    return <>
      <DialogContent><Stack spacing={2}>
        <ImportFeedback error={error}/>
        {pending && !preview && <Typography role="status">{pending}</Typography>}
        {stale && <Alert severity="warning">O conteúdo mudou. Atualize a prévia e escolha novamente antes de continuar.</Alert>}
        {preview && <>
          <Typography variant="body2">{preview.sections.length} textos · {source === "markdown" ? "Markdown" : source === "original" ? "EPUB original" : "Cópia limpa"}</Typography>
          <ImportWarnings warnings={preview.warnings}/>
          {preview.requires_confirmation && <>
            <Alert severity="warning">Este projeto já tem {preview.existing_text_count} {preview.existing_text_count === 1 ? "texto" : "textos"}{variations > 0 ? `, incluindo ${variations} ${variations === 1 ? "variação" : "variações"}` : ""}. Escolha como continuar.</Alert>
            <RadioGroup value={mode} aria-label="Como incluir os textos" onChange={(_, value) => setMode(value as "append" | "replace")}>
              <FormControlLabel value="append" control={<Radio disabled={Boolean(pending) || stale}/>} label="Acrescentar ao final, mantendo os textos existentes"/>
              <FormControlLabel value="replace" control={<Radio disabled={Boolean(pending) || stale}/>} label="Substituir todos os textos e suas variações"/>
            </RadioGroup>
          </>}
          <ImportReviewLayout>
            <ImportPreviewList><List dense aria-label="Textos da extração">
              {preview.sections.map((item, index) => <ListItemButton key={item.href} selected={section === index} onClick={() => setSection(index)}>
                <ListItemText primary={item.title}/>
              </ListItemButton>)}
            </List></ImportPreviewList>
            <ImportPreviewDocument component="article" aria-label="Prévia do texto selecionado">
              {current && <Markdown content={current.markdown}/>}
            </ImportPreviewDocument>
          </ImportReviewLayout>
        </>}
      </Stack></DialogContent>
      <DialogActions>
        <Button disabled={Boolean(pending)} onClick={onClose}>Fechar</Button>
        {(stale || (!preview && Boolean(error))) && <Button disabled={Boolean(pending)} onClick={onReload}>Atualizar prévia</Button>}
        <Button variant="contained" disabled={!canGenerate} onClick={() => onExtract(mode || "append", Boolean(mode))}>
          {pending || (source === "markdown" ? "Gerar textos" : mode === "replace" ? "Substituir e extrair textos" : "Extrair textos para este projeto")}
        </Button>
      </DialogActions>
    </>;
}

export function TextImportDialog(props: DialogProps) {
    const { open, source, preview, pending, onClose } = props;
    return <Dialog open={open} onClose={pending ? undefined : onClose} fullWidth maxWidth="md" aria-labelledby="text-import-title">
      <DialogTitle id="text-import-title">{source === "markdown" ? "Gerar textos dos Markdown" : `Extrair textos do ${source === "original" ? "original" : "EPUB limpo"}`}</DialogTitle>
      <Review key={JSON.stringify([open, source, preview?.source_sha256, preview?.project_state])} {...props}/>
    </Dialog>;
}
