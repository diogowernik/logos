"use client";
import { useState, type FormEvent } from "react";
import Stack from "@mui/material/Stack";
import Alert from "@mui/material/Alert";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import { ProjectPanelToolbar } from "@/theme/project";
import { ActionMenu, DestructiveMenuItem } from "@/components/ui/ActionMenu";
import type { useProjectEditor } from "./useProjectEditor";

export function ProjectGroups({editor}: {editor: ReturnType<typeof useProjectEditor>}) {
  const [action, setAction] = useState<"create" | "duplicate" | "rename" | "settings" | null>(null);
  const [output, setOutput] = useState({export_title: "", export_subtitle: "", export_author: "", cover: ""});
  const [name, setName] = useState("");
  const {data, pending, selectGroup, groupAction} = editor;
  if (!data) return null;
  function open(next: "create" | "duplicate" | "rename" | "settings") {
    setName(next === "rename" ? data!.group.name : next === "duplicate" ? `${data!.group.name} — cópia` : "");
    setOutput({export_title: data!.group.export_title, export_subtitle: data!.group.export_subtitle, export_author: data!.group.export_author, cover: data!.group.cover ?? ""});
    setAction(next);
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!action) return;
    try { await groupAction(action, name, {...output, cover: output.cover || null}); setAction(null); } catch { /* controller presents error */ }
  }
  return <>
    <ProjectPanelToolbar>
      <TextField select label="Grupo de textos" value={data.group.id} disabled={pending} onChange={(event) => void selectGroup(Number(event.target.value))}>
        {data.groups.map((group) => <MenuItem key={group.id} value={group.id}>{group.name}{group.is_default ? " · padrão" : ""}</MenuItem>)}
      </TextField>
      <ActionMenu label="Opções do grupo">
        <MenuItem disabled={pending} onClick={() => open("create")}>Novo grupo vazio</MenuItem>
        <MenuItem disabled={pending} onClick={() => open("duplicate")}>Duplicar grupo</MenuItem>
        <MenuItem disabled={pending} onClick={() => open("rename")}>Renomear grupo</MenuItem>
        <MenuItem disabled={pending} onClick={() => open("settings")}>Configurar saída</MenuItem>
        <MenuItem disabled={pending || data.group.is_default} onClick={() => { void groupAction("default").catch(() => {}); }}>Usar como padrão</MenuItem>
        <DestructiveMenuItem disabled={pending || data.group.is_default || data.groups.length < 2} onClick={() => { void groupAction("delete").catch(() => {}); }}>Excluir grupo</DestructiveMenuItem>
      </ActionMenu>
    </ProjectPanelToolbar>
    <Dialog open={Boolean(action)} onClose={pending ? undefined : () => setAction(null)} fullWidth maxWidth="xs">
      <form onSubmit={submit}>
        <DialogTitle>{action === "create" ? "Novo grupo" : action === "duplicate" ? "Duplicar grupo" : action === "settings" ? "Saída do grupo" : "Renomear grupo"}</DialogTitle>
        <DialogContent>
          {editor.error && <Alert severity="error">{editor.error}</Alert>}
          {action === "settings" ? <Stack spacing={2}>
            <TextField label="Título" value={output.export_title} placeholder={data.project.title} disabled={pending} onChange={(event) => setOutput({...output, export_title: event.target.value})}/>
            <TextField label="Subtítulo" value={output.export_subtitle} placeholder={data.project.subtitle} disabled={pending} onChange={(event) => setOutput({...output, export_subtitle: event.target.value})}/>
            <TextField label="Autor" value={output.export_author} placeholder={data.project.author} disabled={pending} onChange={(event) => setOutput({...output, export_author: event.target.value})}/>
            <TextField select label="Capa" value={output.cover} disabled={pending} onChange={(event) => setOutput({...output, cover: event.target.value})}>
              <MenuItem value="">Usar capa do livro</MenuItem>
              {(data.assets ?? []).map((asset) => <MenuItem key={asset.id} value={asset.id}>{asset.original_name}</MenuItem>)}
            </TextField>
          </Stack> : <TextField autoFocus fullWidth required label="Nome" value={name} slotProps={{htmlInput: {maxLength: 250}}} onChange={(event) => setName(event.target.value)} disabled={pending}/>}
        </DialogContent>
        <DialogActions><Button disabled={pending} onClick={() => setAction(null)}>Cancelar</Button><Button variant="contained" type="submit" disabled={pending || (action !== "settings" && !name.trim())}>Salvar</Button></DialogActions>
      </form>
    </Dialog>
  </>;
}
