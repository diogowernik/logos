import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import { CloseIcon } from "@/components/icons/NavigationIcons";
import { CompactActionButton } from "@/components/ui/HeaderControls";
import { ImportWarningsLayout } from "@/theme/epub-import";
import type { ImportWarning } from "./import-types";

const labels: Record<string, string> = {
  missing_font: "Fonte tipográfica ausente no arquivo original",
  font_obfuscation_removed: "Proteção das fontes tipográficas removida na limpeza",
  active_content_removed: "Scripts ou conteúdo interativo removidos",
  svg_sanitized: "Imagem SVG adaptada para leitura",
  remote_image: "Imagem externa: o arquivo não está incorporado ao EPUB",
  link_target_not_in_clean: "Link aponta para uma seção fora da seleção limpa",
  unresolved_document_link: "Destino de um link não encontrado entre os textos",
  table_spans_flattened: "Tabela com células mescladas foi simplificada",
  unsupported_cover: "Capa não convertida para imagem do projeto",
};
const dismissalEvent = "logos.import-warnings-dismissed";
function subscribe(listener: () => void) {
  window.addEventListener("storage", listener);
  window.addEventListener(dismissalEvent, listener);
  return () => {
    window.removeEventListener("storage", listener);
    window.removeEventListener(dismissalEvent, listener);
  };
}
export function ImportWarnings({ warnings, importId }: { warnings: ImportWarning[]; importId?: string }) {
  const [dismissed, setDismissed] = useState<string | null>(null);
  const signature = JSON.stringify(warnings);
  const storageKey = importId ? `logos.epub.${importId}.dismissed-warnings` : null;
  const savedDismissal = useSyncExternalStore(subscribe, () => {
    try { return storageKey !== null && localStorage.getItem(storageKey) === signature; }
    catch { return false; }
  }, () => false);
  function dismiss() {
    setDismissed(signature);
    if (storageKey) {
      try {
        localStorage.setItem(storageKey, signature);
        window.dispatchEvent(new Event(dismissalEvent));
      } catch { /* Closing still works when browser storage is unavailable. */ }
    }
  }
  if (!warnings.length || dismissed === signature || savedDismissal) return null;
  return <ImportWarningsLayout><Accordion disableGutters>
    <AccordionSummary>{warnings.length} {warnings.length === 1 ? "aviso" : "avisos"} sobre o conteúdo</AccordionSummary>
    <AccordionDetails><Stack spacing={1}>
      {warnings.map((warning, index) => <Stack key={index}>
        <Typography variant="body2">{labels[warning.code] ?? warning.code}</Typography>
        {warning.href && <Typography variant="caption" color="text.secondary">{warning.href}</Typography>}
      </Stack>)}
    </Stack></AccordionDetails>
  </Accordion><CompactActionButton label="Fechar avisos" onClick={dismiss}><CloseIcon /></CompactActionButton></ImportWarningsLayout>;
}
import { useState, useSyncExternalStore } from "react";
