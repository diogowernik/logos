"use client";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { useProjectEditor } from "./useProjectEditor";
import { createPortal } from "react-dom";
import { Markdown } from "@/components/Markdown";
import {
  CopyIcon,
  SaveIcon,
  SidebarIcon,
} from "@/components/icons/NavigationIcons";
import { ProjectOverview } from "./ProjectOverview";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Card from "@mui/material/Card";
import CardHeader from "@mui/material/CardHeader";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Alert from "@mui/material/Alert";
import MenuItem from "@mui/material/MenuItem";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import Divider from "@mui/material/Divider";
import {
  HeaderActions,
  CompactActionButton,
} from "@/components/ui/HeaderControls";
import { ActionMenu, DestructiveMenuItem } from "@/components/ui/ActionMenu";
import { useShell } from "@/components/shell/AppShell";
import {
  WorkspacePath,
  WorkspaceBreadcrumbs,
  EditorPaper,
  EditorHeader,
  EditorTitle,
  EditorBody,
  MarkdownInput,
  EditorFooter,
  EditorWordCount,
  EditorStatus,
  EditorWorkspace,
  PreviewDocument,
} from "@/theme/workspace";

export function ProjectEditor({
  projectId,
  initialView = "overview",
  initialTextId,
}: {
  projectId: string;
  initialView?: "overview" | "text" | "new" | "book";
  initialTextId?: number;
}) {
  const editor = useProjectEditor({ projectId, initialView, initialTextId });
  const {
    data,
    selected,
    title,
    setTitle,
    body,
    setBody,
    view,
    book,
    error,
    notice,
    pending,
    properties,
    setProperties,
    moving,
    setMoving,
    dirty,
    projects,
    collections,
    save,
    copy,
    textAction,
    projectAction,
    saveProperties,
    move,
    restoreProject,
  } = editor;
  const {
    rightOpen: previewOpen,
    setRightOpen: setPreviewOpen,
    rightHost: previewHost,
    setRightContext,
  } = useShell();
  const textarea = useRef<HTMLTextAreaElement>(null);
  const canPreview = Boolean(data) && view === "text";
  useEffect(() => {
    if (view !== "overview") return;
    setRightContext({ key: `book-${projectId}`, defaultOpen: false });
    return () => setRightContext(null);
  }, [view, projectId, setRightContext]);
  if (!data)
    return (
      <Stack spacing={2}>
        {error ? (
          <Alert severity="error">{error}</Alert>
        ) : (
          <Typography>Carregando projeto…</Typography>
        )}
        <Button component={Link} href="/">
          Voltar à biblioteca
        </Button>
      </Stack>
    );
  const project = data.project;

  const collection = collections.find((item) => item.id === project.collection);

  return (
    <EditorWorkspace bookWorkspace={view === "overview"} editing={view === "text"} spacing={2}>
      <WorkspacePath>
        <WorkspaceBreadcrumbs aria-label="Caminho">
          <Link href="/">Biblioteca</Link>
          {collection && (
            <Link href={`/?collection=${collection.id}`}>
              {collection.title}
            </Link>
          )}
          {!project.is_inbox && (
            <Link href={`/projects/${project.id}`}>{project.title}</Link>
          )}
          {view === "text" && (
            <Typography aria-current="page">{title || "Novo texto"}</Typography>
          )}
          {view === "book" && (
            <Typography aria-current="page">Leitura</Typography>
          )}
        </WorkspaceBreadcrumbs>
        {!project.is_inbox && (
          <ActionMenu label="Opções do projeto">
            <MenuItem onClick={() => setProperties(true)}>
              Editar projeto
            </MenuItem>
            <MenuItem
              disabled={pending}
              onClick={() => projectAction("duplicate")}
            >
              Duplicar projeto
            </MenuItem>
            <MenuItem
              disabled={pending}
              onClick={() => projectAction("new-version")}
            >
              Nova versão principal
            </MenuItem>
            <DestructiveMenuItem
              disabled={pending}
              onClick={() => projectAction("delete")}
            >
              Excluir {project.is_principal ? "projeto" : "versão"}
            </DestructiveMenuItem>
          </ActionMenu>
        )}
      </WorkspacePath>
      {!project.is_principal && (
        <Alert
          severity="info"
          action={
            <Button disabled={pending} onClick={restoreProject}>
              Restaurar como principal
            </Button>
          }
        >
          Versão secundária
        </Alert>
      )}
      {error && !properties && !moving && (
        <Alert severity="error">{error}</Alert>
      )}
      {view === "overview" && <ProjectOverview editor={editor} />}
      {view === "book" && (
        <Card component="section">
          <CardHeader
            slotProps={{ title: { component: "h2", variant: "h6" } }}
            title="Leitura do livro"
            action={
              <CompactActionButton
                label="Copiar livro"
                disabled={!book}
                onClick={() => copy(book)}
              >
                <CopyIcon />
              </CompactActionButton>
            }
          />
          <CardContent
            sx={(theme) => ({ bgcolor: theme.app.surfaces.reading })}
          >
            <Box component="article" sx={{ maxWidth: 800, mx: "auto", py: 2 }}>
              {book ? (
                <Markdown content={book} />
              ) : (
                !error && <Typography>Carregando leitura…</Typography>
              )}
            </Box>
          </CardContent>
        </Card>
      )}
      {view === "text" && (
        <EditorPaper
          component="section"
          variant="outlined"
          className="text-editor-paper"
        >
          <EditorHeader
            slotProps={{ title: { component: "h2", variant: "h6" } }}
            title={
              <EditorTitle
                inputProps={{ "aria-label": "Título do texto" }}
                placeholder="Título do texto"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                disabled={pending}
              />
            }
            action={
              <HeaderActions>
                <EditorStatus
                  variant="caption"
                  color="text.secondary"
                  role="status"
                >
                  {pending
                    ? "Salvando…"
                    : dirty
                      ? "Alterações não salvas"
                      : notice}
                </EditorStatus>
                <CompactActionButton
                  label="Copiar Markdown"
                  onClick={() => copy(body)}
                >
                  <CopyIcon />
                </CompactActionButton>
                <IconButton
                  aria-label={
                    previewOpen ? "Ocultar preview" : "Mostrar preview"
                  }
                  title={previewOpen ? "Ocultar preview" : "Mostrar preview"}
                  aria-expanded={previewOpen}
                  aria-controls="app-right-panel"
                  onClick={() => setPreviewOpen(!previewOpen)}
                >
                  <SidebarIcon side="right" />
                </IconButton>
                <Divider orientation="vertical" flexItem />
                <CompactActionButton
                  label="Salvar"
                  onClick={save}
                  disabled={pending}
                >
                  <SaveIcon />
                </CompactActionButton>
              </HeaderActions>
            }
          />
          <EditorBody>
            {selected?.parent && (
              <Typography variant="caption" color="text.secondary">
                Variação
              </Typography>
            )}
            <MarkdownInput
              multiline
              inputComponent="textarea"
              fullWidth
              inputRef={textarea}
              inputProps={{ "aria-label": "Conteúdo Markdown" }}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder="Escreva ou cole seu Markdown aqui…"
              disabled={pending}
              onKeyDown={(event) => {
                if ((event.metaKey || event.ctrlKey) && event.key === "s") {
                  event.preventDefault();
                  void save();
                }
              }}
            />
          </EditorBody>
          <EditorFooter>
            <EditorWordCount variant="caption" color="text.secondary">
              {body.trim() ? body.trim().split(/\s+/).length : 0} palavras
            </EditorWordCount>
            {selected && (
              <ActionMenu label="Opções do texto">
                <MenuItem
                  disabled={pending}
                  onClick={() => textAction("duplicate")}
                >
                  Duplicar como variação
                </MenuItem>
                {selected.parent && (
                  <MenuItem
                    disabled={pending}
                    onClick={() => textAction("promote")}
                  >
                    Mover para lista principal
                  </MenuItem>
                )}
                <MenuItem disabled={pending} onClick={() => setMoving(true)}>
                  {project.is_inbox ? "Adicionar ao projeto…" : "Mover para…"}
                </MenuItem>
                <DestructiveMenuItem
                  disabled={pending}
                  onClick={() => textAction("delete")}
                >
                  Excluir texto
                </DestructiveMenuItem>
              </ActionMenu>
            )}
          </EditorFooter>
        </EditorPaper>
      )}
      {canPreview &&
        previewOpen &&
        previewHost &&
        createPortal(
          <PreviewDocument component="article" aria-label="Texto renderizado">
            <Markdown content={body} />
          </PreviewDocument>,
          previewHost,
        )}
      <Dialog
        open={properties}
        onClose={() => {
          if (!pending) setProperties(false);
        }}
        aria-labelledby="properties-heading"
      >
        <DialogTitle id="properties-heading">Editar projeto</DialogTitle>
        <Box component="form" onSubmit={saveProperties}>
          <DialogContent>
            <Stack spacing={2}>
              {error && <Alert severity="error">{error}</Alert>}
              <TextField
                id="project-title"
                name="title"
                label="Título"
                defaultValue={project.title}
                autoFocus
              />
              <TextField
                id="project-subtitle"
                name="subtitle"
                label="Subtítulo"
                defaultValue={project.subtitle}
              />
              {!project.is_inbox && (
                <TextField
                  select
                  id="collection"
                  name="collection"
                  label="Coleção"
                  defaultValue={project.collection ?? ""}
                  slotProps={{ select: { native: true } }}
                >
                  <option value="">Sem coleção</option>
                  {collections.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </TextField>
              )}
              <TextField
                id="project-author"
                name="author"
                label="Autor (opcional)"
                defaultValue={project.author}
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button
              type="button"
              disabled={pending}
              onClick={() => setProperties(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="contained" disabled={pending}>
              Salvar
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
      <Dialog
        open={moving}
        onClose={() => {
          if (!pending) setMoving(false);
        }}
        aria-labelledby="move-heading"
      >
        <DialogTitle id="move-heading">
          {project.is_inbox ? "Adicionar ao projeto" : "Mover texto"}
        </DialogTitle>
        <Box component="form" onSubmit={move}>
          <DialogContent>
            <Stack spacing={2}>
              {error && <Alert severity="error">{error}</Alert>}
              <TextField
                select
                id="move-project"
                name="project"
                label="Projeto de destino"
                required
                defaultValue=""
                slotProps={{ select: { native: true } }}
              >
                <option value="">Escolha um projeto</option>
                {!project.is_inbox && (
                  <option value="loose">Deixar como texto solto</option>
                )}
                {projects
                  .filter((p) => p.id !== project.id)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
              </TextField>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button
              type="button"
              disabled={pending}
              onClick={() => setMoving(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="contained" disabled={pending}>
              Mover
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </EditorWorkspace>
  );
}
