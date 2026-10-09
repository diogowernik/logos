"use client";
import { useState, type FormEvent, type ReactNode } from "react";
import Stack from "@mui/material/Stack";
import Alert from "@mui/material/Alert";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import { BookGroupSelect, GroupPrincipalMark, TextsWithSettings, GroupSettingsPanel, GroupCreateRow } from "@/theme/project";
import { SettingsIcon, CheckCircleIcon, PlusIcon, ComposeIcon, DuplicateIcon, DeleteIcon } from "@/components/icons/NavigationIcons";
import { CompactActionButton, HeaderActions } from "@/components/ui/HeaderControls";
import Typography from "@mui/material/Typography";
import Tooltip from "@mui/material/Tooltip";
import Switch from "@mui/material/Switch";
import ListItem from "@mui/material/ListItem";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import { BookSection, type BookSectionProps } from "./BookSection";
import type { useProjectEditor } from "./useProjectEditor";

export function ProjectGroups({editor, blocked = false, actions, children, expanded, onToggle}: BookSectionProps & {
  editor: ReturnType<typeof useProjectEditor>; blocked?: boolean; actions: ReactNode; children: ReactNode;
}) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [action, setAction] = useState<"create" | "duplicate" | "rename" | null>(null);
  const [targetId, setTargetId] = useState<number | undefined>(undefined);
  const [name, setName] = useState("");
  const {data, selectGroup, groupAction} = editor;
  const pending = editor.pending || blocked;
  if (!data) return null;
  function open(next: "create" | "duplicate" | "rename", group = data!.group) {
    setName(next === "rename" ? group.name : next === "duplicate" ? `${group.name} — cópia` : "");
    setTargetId(next === "create" ? undefined : group.id);
    setAction(next);
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!action) return;
    try { await groupAction(action, name, targetId); setAction(null); } catch { /* controller presents error */ }
  }
  return <>
    <BookSection title="Textos" expanded={expanded} onToggle={onToggle} titleControls={!data.project.is_inbox &&
      <HeaderActions>
        <BookGroupSelect>
          <TextField fullWidth select aria-label="Grupo de textos" slotProps={{select: {inputProps: {"aria-label": "Grupo de textos"}}}} value={data.group.id} disabled={pending} onChange={(event) => void selectGroup(Number(event.target.value))}>
            {data.groups.map((group) => <MenuItem key={group.id} value={group.id}>{group.name}</MenuItem>)}
          </TextField>
        </BookGroupSelect>
        {data.group.is_default && <Tooltip title="Grupo principal"><GroupPrincipalMark role="img" aria-label="Grupo principal"><CheckCircleIcon /></GroupPrincipalMark></Tooltip>}
      </HeaderActions>
    } actions={<HeaderActions>
      {actions}
      {!data.project.is_inbox && <CompactActionButton label="Configurar grupos" onClick={() => { setSettingsOpen((value) => !value); if (!expanded) onToggle?.(); }}><SettingsIcon /></CompactActionButton>}
    </HeaderActions>}>
      <TextsWithSettings settingsOpen={settingsOpen}>
        <div>{children}</div>
        {settingsOpen && <GroupSettingsPanel component="aside" variant="outlined" aria-label="Configuração dos grupos">
          <Stack spacing={1}>
            {editor.error && <Alert severity="error">{editor.error}</Alert>}
            <GroupCreateRow><Typography>Novo grupo de textos</Typography><CompactActionButton label="Novo grupo de textos" disabled={pending} onClick={() => open("create")}><PlusIcon /></CompactActionButton></GroupCreateRow>
            <List aria-label="Grupos deste projeto" disablePadding>
              {data.groups.map((group) => <ListItem key={group.id} disablePadding>
                <ListItemButton selected={group.id === data.group.id} disabled={pending} onClick={() => void selectGroup(group.id)}>
                  <ListItemText primary={group.name}/>
                </ListItemButton>
                <HeaderActions>
                  <CompactActionButton label={`Renomear ${group.name}`} disabled={pending} onClick={() => open("rename", group)}><ComposeIcon /></CompactActionButton>
                  <CompactActionButton label={`Duplicar ${group.name}`} disabled={pending} onClick={() => open("duplicate", group)}><DuplicateIcon /></CompactActionButton>
                  {!group.is_default && <CompactActionButton label={`Excluir ${group.name}`} disabled={pending || data.groups.length < 2} onClick={() => { void groupAction("delete", undefined, group.id).catch(() => {}); }}><DeleteIcon /></CompactActionButton>}
                  {group.is_default
                    ? <Tooltip title="Grupo principal"><GroupPrincipalMark role="img" aria-label="Grupo principal"><CheckCircleIcon /></GroupPrincipalMark></Tooltip>
                    : <Tooltip title="Definir como principal"><Switch size="small" checked={false} disabled={pending} slotProps={{input: {"aria-label": `Definir ${group.name} como principal`}}} onChange={() => { void groupAction("default", undefined, group.id).catch(() => {}); }}/></Tooltip>}
                </HeaderActions>
              </ListItem>)}
            </List>
          </Stack>
        </GroupSettingsPanel>}
      </TextsWithSettings>
    </BookSection>
    <Dialog open={Boolean(action)} onClose={pending ? undefined : () => setAction(null)} fullWidth maxWidth="xs">
      <form onSubmit={submit}>
        <DialogTitle>{action === "create" ? "Novo grupo" : action === "duplicate" ? "Duplicar grupo" : "Renomear grupo"}</DialogTitle>
        <DialogContent>
          {editor.error && <Alert severity="error">{editor.error}</Alert>}
          <TextField autoFocus fullWidth required label="Nome" value={name} slotProps={{htmlInput: {maxLength: 250}}} onChange={(event) => setName(event.target.value)} disabled={pending}/>
        </DialogContent>
        <DialogActions><Button disabled={pending} onClick={() => setAction(null)}>Cancelar</Button><Button variant="contained" type="submit" disabled={pending || !name.trim()}>Salvar</Button></DialogActions>
      </form>
    </Dialog>
  </>;
}
