"use client";
import Link from "next/link";
import { useRef } from "react";
import { useProjectEditor } from "./useProjectEditor";
import { createPortal } from "react-dom";
import { Markdown } from "@/components/Markdown";
import {
  CopyIcon,
  SaveIcon,
  SidebarIcon,
} from "@/components/icons/NavigationIcons";
import { ProjectCover } from "./ProjectCover";
import { ProjectFiles } from "./ProjectFiles";
import { ProjectExport } from "./ProjectExport";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Card from "@mui/material/Card";
import CardHeader from "@mui/material/CardHeader";
import CardContent from "@mui/material/CardContent";
import CardActions from "@mui/material/CardActions";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import InputBase from "@mui/material/InputBase";
import Paper from "@mui/material/Paper";
import Alert from "@mui/material/Alert";
import Breadcrumbs from "@mui/material/Breadcrumbs";
import MenuItem from "@mui/material/MenuItem";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import Divider from "@mui/material/Divider";
import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import {
  HeaderActions,
  CompactActionButton,
} from "@/components/ui/HeaderControls";
import { ActionMenu } from "@/components/ui/ActionMenu";
import { useShell } from "@/components/shell/AppShell";

export function ProjectEditor({
  projectId,
  initialView = "overview",
  initialTextId,
}: {
  projectId: string;
  initialView?: "overview" | "text" | "new" | "book";
  initialTextId?: number;
}) {
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
    readBook,
    copyBook,
    updateCover,
    save,
    copy,
    textAction,
    projectAction,
    saveProperties,
    move,
    beginDrag,
    dragOver,
    finishDrag,
    keyboardOrder,
    restoreProject,
    updateEpub,
  } = useProjectEditor({ projectId, initialView, initialTextId });
  const {
    rightOpen: previewOpen,
    setRightOpen: setPreviewOpen,
    rightHost: previewHost,
  } = useShell();
  const textarea = useRef<HTMLTextAreaElement>(null);
  const canPreview = Boolean(data) && view === "text";
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
  const primary = data.texts.filter((text) => text.parent === null);

  const collection = collections.find((item) => item.id === project.collection);

  return (
    <Stack spacing={2}>
      <Box sx={{ display: "flex", alignItems: "center", minWidth: 0, gap: 1 }}>
        <Breadcrumbs
          aria-label="Caminho"
          sx={{ flex: 1, overflowWrap: "anywhere" }}
        >
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
        </Breadcrumbs>
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
            <MenuItem
              sx={{ color: "error.main" }}
              disabled={pending}
              onClick={() => projectAction("delete")}
            >
              Excluir {project.is_principal ? "projeto" : "versão"}
            </MenuItem>
          </ActionMenu>
        )}
      </Box>
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
      {view === "overview" && (
        <Stack component="section" spacing={2}>
          <Card>
            <CardHeader
              title={project.is_inbox ? "Textos soltos" : project.title}
              slotProps={{ title: { component: "h1", variant: "h6" } }}
              action={
                <HeaderActions>
                  <Button onClick={readBook} disabled={!primary.length}>
                    Ler livro
                  </Button>
                  <CompactActionButton label="Copiar livro" onClick={copyBook}>
                    <CopyIcon />
                  </CompactActionButton>
                  <Button variant="text" onClick={() => setProperties(true)}>
                    Editar informações
                  </Button>
                </HeaderActions>
              }
            />
            <CardContent>
              <Stack
                direction="row"
                spacing={2}
                sx={{ alignItems: "flex-start" }}
              >
                {!project.is_inbox && (
                  <ProjectCover project={project} onChange={updateCover} />
                )}
                <Stack spacing={1}>
                  {project.subtitle && (
                    <Typography>{project.subtitle}</Typography>
                  )}
                  {project.author && (
                    <Typography color="text.secondary">
                      {project.author}
                    </Typography>
                  )}
                  <Typography color="text.secondary">
                    {primary.length} {primary.length === 1 ? "texto" : "textos"}
                  </Typography>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
          {!project.is_inbox && (
            <ProjectExport
              projectId={project.id}
              artifact={data.epub ?? null}
              hasContent={primary.some((text) => text.markdown.trim())}
              onChange={updateEpub}
            />
          )}
          <Card component="section">
            <CardHeader
              slotProps={{ title: { component: "h2", variant: "h6" } }}
              title="Sumário"
              action={
                <Button component={Link} href={`/projects/${project.id}/new`}>
                  + Adicionar texto
                </Button>
              }
            />
            <CardContent>
              {primary.length === 0 && (
                <Typography color="text.secondary">
                  Adicione seu primeiro texto para começar.
                </Typography>
              )}
              {primary.map((text, index) => (
                <Box
                  data-text-id={text.id}
                  key={text.id}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    py: 0.5,
                    borderBottom: 1,
                    borderColor: "divider",
                  }}
                >
                  <IconButton
                    aria-label={`Reordenar ${text.title || `texto ${index + 1}`}`}
                    title="Arraste para reordenar; use as setas do teclado quando focado"
                    sx={{ touchAction: "none", cursor: "grab" }}
                    onPointerDown={(event) => beginDrag(event, text.id)}
                    onPointerMove={dragOver}
                    onPointerUp={finishDrag}
                    onPointerCancel={finishDrag}
                    onKeyDown={(event) => {
                      if (["ArrowUp", "ArrowDown"].includes(event.key)) {
                        event.preventDefault();
                        void keyboardOrder(
                          text.id,
                          event.key === "ArrowUp" ? -1 : 1,
                        );
                      }
                    }}
                  >
                    ⠿
                  </IconButton>
                  <Typography variant="caption" color="text.secondary">
                    {String(index + 1).padStart(2, "0")}
                  </Typography>
                  <Box
                    component={Link}
                    href={`/texts/${text.id}`}
                    sx={{ flex: 1, minWidth: 0, overflowWrap: "anywhere" }}
                  >
                    {text.title || "Sem título"}
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {text.markdown.trim()
                      ? text.markdown.trim().split(/\s+/).length
                      : 0}{" "}
                    palavras
                  </Typography>
                </Box>
              ))}
            </CardContent>
          </Card>
          <ProjectFiles
            project={project}
            assets={data.assets ?? []}
            onChange={updateCover}
          />
          {data.versions.length > 1 && (
            <Accordion>
              <AccordionSummary>Versões do projeto</AccordionSummary>
              <AccordionDetails>
                <Stack spacing={1}>
                  {data.versions.map((version) => (
                    <Box
                      component={Link}
                      key={version.id}
                      href={`/projects/${version.id}`}
                    >
                      {version.is_principal ? "● " : "○ "}
                      {version.title}
                      <Typography variant="caption" sx={{ ml: 1 }}>
                        {version.is_principal
                          ? "Principal"
                          : `${version.text_count} textos`}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              </AccordionDetails>
            </Accordion>
          )}
          {notice && <Typography role="status">{notice}</Typography>}
        </Stack>
      )}
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
        <Paper
          component="section"
          variant="outlined"
          sx={(theme) => ({
            bgcolor: theme.app.surfaces.reading,
            overflow: "hidden",
          })}
        >
          <CardHeader
            slotProps={{ title: { component: "h2", variant: "h6" } }}
            title={
              <InputBase
                inputProps={{ "aria-label": "Título do texto" }}
                fullWidth
                placeholder="Título do texto"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                disabled={pending}
                sx={{ fontSize: 18, fontWeight: 500 }}
              />
            }
            action={
              <HeaderActions>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  role="status"
                >
                  {pending
                    ? "Salvando…"
                    : dirty
                      ? "Alterações não salvas"
                      : notice}
                </Typography>
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
          <Box
            sx={{
              p: { xs: 2, md: 3 },
              maxWidth: 880,
              mx: "auto",
              minHeight: "55dvh",
            }}
          >
            {selected?.parent && (
              <Typography variant="caption" color="text.secondary">
                Variação
              </Typography>
            )}
            <InputBase
              multiline
              fullWidth
              inputRef={textarea}
              inputProps={{ "aria-label": "Conteúdo Markdown" }}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder="Escreva ou cole seu Markdown aqui…"
              disabled={pending}
              minRows={16}
              sx={{ fontSize: 16, lineHeight: 1.75, alignItems: "flex-start" }}
              onKeyDown={(event) => {
                if ((event.metaKey || event.ctrlKey) && event.key === "s") {
                  event.preventDefault();
                  void save();
                }
              }}
            />
          </Box>
          <CardActions>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ mr: "auto" }}
            >
              {body.trim() ? body.trim().split(/\s+/).length : 0} palavras
            </Typography>
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
                <MenuItem
                  sx={{ color: "error.main" }}
                  disabled={pending}
                  onClick={() => textAction("delete")}
                >
                  Excluir texto
                </MenuItem>
              </ActionMenu>
            )}
          </CardActions>
        </Paper>
      )}
      {canPreview &&
        previewOpen &&
        previewHost &&
        createPortal(
          <>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block", mb: 2 }}
            >
              Preview ao vivo
            </Typography>
            <Markdown content={body || "*Seu texto aparecerá aqui.*"} />
          </>,
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
    </Stack>
  );
}
