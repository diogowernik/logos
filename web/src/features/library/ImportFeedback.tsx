"use client";
import { useState } from "react";
import Alert from "@mui/material/Alert";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Collapse from "@mui/material/Collapse";
import { CopyIcon } from "@/components/icons/NavigationIcons";
import { CompactActionButton, HeaderActions } from "@/components/ui/HeaderControls";
import { ImportTechnicalReport } from "@/theme/epub-import";
import { errorMessage } from "./api";
import { diagnosticFromError, type ImportDiagnostic } from "./import-types";

export function ImportFeedback({ error, diagnostic: saved }: { error?: unknown; diagnostic?: ImportDiagnostic | null }) {
  const [expanded, setExpanded] = useState(false);
  const [copyStatus, setCopyStatus] = useState("");
  const diagnostic = diagnosticFromError(error) ?? saved;
  if (!error && !diagnostic) return null;
  async function copy() {
    try {
      await navigator.clipboard.writeText(diagnostic!.copy_text);
      setCopyStatus("Relatório copiado");
    } catch {
      setExpanded(true);
      setCopyStatus("Selecione os detalhes abaixo e copie manualmente.");
    }
  }
  return <Stack spacing={1}>
    <Alert severity="error">{error ? errorMessage(error) : diagnostic?.message}</Alert>
    {diagnostic && <>
      <HeaderActions>
        <Button aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>Detalhes técnicos</Button>
        <CompactActionButton label="Copiar relatório" onClick={copy}><CopyIcon /></CompactActionButton>
        <Typography variant="caption" role="status">{copyStatus}</Typography>
      </HeaderActions>
      <Collapse in={expanded}><ImportTechnicalReport component="pre" tabIndex={0}>{diagnostic.copy_text}</ImportTechnicalReport></Collapse>
    </>}
  </Stack>;
}
