import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
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
export function ImportWarnings({ warnings }: { warnings: ImportWarning[] }) {
  if (!warnings.length) return null;
  return <Accordion disableGutters>
    <AccordionSummary>{warnings.length} {warnings.length === 1 ? "aviso" : "avisos"} sobre o conteúdo</AccordionSummary>
    <AccordionDetails><Stack spacing={1}>
      {warnings.map((warning, index) => <Stack key={index}>
        <Typography variant="body2">{labels[warning.code] ?? warning.code}</Typography>
        {warning.href && <Typography variant="caption" color="text.secondary">{warning.href}</Typography>}
      </Stack>)}
    </Stack></AccordionDetails>
  </Accordion>;
}
