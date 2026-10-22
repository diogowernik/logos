"use client";
import { projectLocation, collectionLocation } from "./resource-location";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { textLocation } from "./text-location";
import { libraryRequest, errorMessage } from "./api";
import { useLibrary } from "./LibraryShell";
import type { TextSummary } from "./types";
import {
  ComposeIcon,
  FolderIcon,
  LibraryIcon,
} from "@/components/icons/NavigationIcons";
import { SidebarSection } from "./SidebarSection";
import Box from "@mui/material/Box";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import ListItemIcon from "@mui/material/ListItemIcon";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import Alert from "@mui/material/Alert";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Collapse from "@mui/material/Collapse";
import { ActionMenu } from "@/components/ui/ActionMenu";
import { SidebarRow, SidebarRowActions } from "@/theme/workspace";
import useMediaQuery from "@mui/material/useMediaQuery";
import { InstallAppButton } from "@/components/pwa/InstallAppButton";

const textDragType = "application/x-logos-text";

export function LibrarySidebar() {
  const library = useLibrary();
  const router = useRouter();
  const pathname = usePathname();
  const wide = useMediaQuery("(min-width: 1280px)");
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [projectsOpen, setProjectsOpen] = useState(true);
  const [recentPreference, setRecentPreference] = useState<boolean | null>(null);
  const recentOpen = recentPreference ?? true;
  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => {
      try {
        const saved = localStorage.getItem("logos.sidebar.recents-open");
        if (active && (saved === "true" || saved === "false")) {
          setRecentPreference((current) => current ?? saved === "true");
        }
      } catch { /* Local preferences never block navigation. */ }
    });
    return () => { active = false; };
  }, []);
  function toggleRecents() {
    const next = !recentOpen;
    setRecentPreference(next);
    try { localStorage.setItem("logos.sidebar.recents-open", String(next)); }
    catch { /* The control still works when browser storage is unavailable. */ }
  }
  const [moving, setMoving] = useState<TextSummary | null>(null);
  const [pending, setPending] = useState(false);
  const [dropTarget, setDropTarget] = useState<number | null>(null);
  const [error, setError] = useState("");

  async function moveText(text: TextSummary, project: number) {
    if (text.project === project || pending) return;
    if (
      library.active?.text === text.id &&
      library.guardRef.current &&
      !library.guardRef.current()
    )
      return;
    setPending(true);
    setError("");
    try {
      await libraryRequest(`texts/${text.id}/move`, "POST", { project });
      await library.refresh();
      await library.loadContent(project);
      if (!text.is_loose) await library.loadContent(text.project);
      window.dispatchEvent(new Event("logos:library-change"));
      setMoving(null);
      if (library.active?.text === text.id) router.push(`/texts/${text.id}`);
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setPending(false);
    }
  }

  function submitMove(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (moving)
      void moveText(
        moving,
        Number(new FormData(event.currentTarget).get("project")),
      );
  }

  return (
    <Box
      id="library-sidebar"
      component="nav"
      aria-label="Navegação da biblioteca"
      sx={{ p: 1, overflowY: "auto", height: "100%", color: "text.primary" }}
    >
      <ListItemButton
        component={Link}
        selected={pathname === "/texts/new"}
        href="/texts/new"
        onClick={(event) => {
          if (pathname === "/texts/new") {
            event.preventDefault();
            if (!library.guardRef.current || library.guardRef.current())
              window.dispatchEvent(new Event("logos:new-text"));
          }
        }}
      >
        <ListItemIcon>
          <ComposeIcon />
        </ListItemIcon>
        <ListItemText primary="Novo texto" />
      </ListItemButton>
      <ListItemButton component={Link} selected={pathname === "/"} href="/">
        <ListItemIcon>
          <LibraryIcon />
        </ListItemIcon>
        <ListItemText primary="Biblioteca" />
      </ListItemButton>
      {!wide && <InstallAppButton />}
      <SidebarSection
        title="Projetos"
        open={projectsOpen}
        controls="sidebar-projects"
        onToggle={() => setProjectsOpen(!projectsOpen)}
        createHref="/?create=project"
        createLabel="Criar projeto"
      />
      <Collapse in={projectsOpen}>
        <Box id="sidebar-projects">
          {library.projects.map((project) => {
            const open =
              expanded[project.id] ??
              (library.active?.project === project.id &&
                (library.active.text !== null ||
                  pathname === `${projectLocation(project)}/new`));
            const content = library.contents[project.id];
            return (
              <Box key={project.id}>
                <SidebarRow
                  active={library.active?.project === project.id}
                  dropTarget={dropTarget === project.id}
                  onDragOver={(event) => {
                    if (event.dataTransfer.types.includes(textDragType)) {
                      event.preventDefault();
                      event.dataTransfer.dropEffect = "move";
                      setDropTarget(project.id);
                    }
                  }}
                  onDragLeave={() => setDropTarget(null)}
                  onDrop={(event) => {
                    event.preventDefault();
                    setDropTarget(null);
                    const text = library.recent.find(
                      (item) =>
                        item.id ===
                        Number(event.dataTransfer.getData(textDragType)),
                    );
                    if (text) void moveText(text, project.id);
                  }}
                >
                  <IconButton
                    aria-label={`${open ? "Recolher" : "Expandir"} ${project.title}`}
                    aria-expanded={Boolean(open)}
                    onClick={() => {
                      setExpanded((current) => ({
                        ...current,
                        [project.id]: !open,
                      }));
                      if (!open && !content)
                        void library.loadContent(project.id);
                    }}
                  >
                    <FolderIcon />
                  </IconButton>
                  <ListItemButton
                    component={Link}
                    href={projectLocation(project)}
                    sx={{ px: 0.5, minWidth: 0 }}
                    title={project.title}
                  >
                    <ListItemText primary={project.title} />
                  </ListItemButton>
                  <SidebarRowActions className="sidebar-row-actions">
                    <ActionMenu label={`Opções do projeto ${project.title}`}>
                      <MenuItem
                        component={Link}
                        href={projectLocation(project)}
                      >
                        Visão geral
                      </MenuItem>
                      <MenuItem
                        component={Link}
                        href={`${projectLocation(project)}/read`}
                      >
                        Ler livro
                      </MenuItem>
                    </ActionMenu>
                    <IconButton
                      component={Link}
                      href={`${projectLocation(project)}/new`}
                      aria-label={`Adicionar texto a ${project.title}`}
                    >
                      <ComposeIcon />
                    </IconButton>
                  </SidebarRowActions>
                </SidebarRow>
                <Collapse in={Boolean(open)}>
                  <Box sx={{ pl: 3 }}>
                    {content ? (
                      content.texts
                        .filter((text) => text.parent === null)
                        .map((text) => (
                          <Box key={text.id}>
                            <ListItemButton
                              component={Link}
                              selected={library.active?.text === text.id}
                              href={`/texts/${text.id}`}
                              title={text.title}
                            >
                              <ListItemText
                                primary={text.title || "Sem título"}
                              />
                            </ListItemButton>
                            {content.texts.some(
                              (variation) => variation.parent === text.id,
                            ) && (
                              <Box
                                component="details"
                                sx={{
                                  color: "text.secondary",
                                  pl: 1,
                                  fontSize: 16,
                                }}
                                open={
                                  content.texts.some(
                                    (variation) =>
                                      variation.parent === text.id &&
                                      library.active?.text === variation.id,
                                  ) || undefined
                                }
                              >
                                <summary>Variações</summary>
                                {content.texts
                                  .filter(
                                    (variation) => variation.parent === text.id,
                                  )
                                  .map((variation) => (
                                    <ListItemButton
                                      component={Link}
                                      selected={
                                        library.active?.text === variation.id
                                      }
                                      key={variation.id}
                                      href={`/texts/${variation.id}`}
                                    >
                                      <ListItemText
                                        primary={
                                          variation.title || "Sem título"
                                        }
                                      />
                                    </ListItemButton>
                                  ))}
                              </Box>
                            )}
                          </Box>
                        ))
                    ) : (
                      <Box sx={{ p: 1, color: "text.secondary" }}>
                        Carregando…
                      </Box>
                    )}
                  </Box>
                </Collapse>
              </Box>
            );
          })}
        </Box>
      </Collapse>
      <SidebarSection
        title="Coleções"
        createHref="/?create=collection"
        createLabel="Criar coleção"
      />
      {library.collections.map((collection) => (
        <ListItemButton
          component={Link}
          key={collection.id}
          href={collectionLocation(collection)}
          title={collection.title}
        >
          <ListItemIcon>
            <FolderIcon />
          </ListItemIcon>
          <ListItemText primary={collection.title} />
        </ListItemButton>
      ))}
      <SidebarSection
        title="Recentes"
        open={recentOpen}
        controls="sidebar-recents"
        onToggle={toggleRecents}
      />
      <Collapse in={recentOpen}>
        <Box id="sidebar-recents">
          {library.recent.map((text) => (
            <SidebarRow
              key={text.id}
              draggable={!pending}
              onDragStart={(event) => {
                event.dataTransfer.setData(textDragType, String(text.id));
                event.dataTransfer.effectAllowed = "move";
              }}
            >
              <ListItemButton
                component={Link}
                sx={{ minWidth: 0 }}
                selected={library.active?.text === text.id}
                href={`/texts/${text.id}`}
                title={`${text.title || "Sem título"}${text.is_loose ? "" : ` · ${textLocation(text)}`}`}
              >
                <ListItemText primary={text.title || "Sem título"} />
              </ListItemButton>
              <SidebarRowActions className="sidebar-row-actions">
                <ActionMenu
                  label={`Opções de ${text.title || "texto sem título"}`}
                >
                  <MenuItem
                    disabled={pending}
                    onClick={() => {
                      setError("");
                      setMoving(text);
                    }}
                  >
                    {text.is_loose ? "Adicionar ao projeto…" : "Mover para…"}
                  </MenuItem>
                </ActionMenu>
              </SidebarRowActions>
            </SidebarRow>
          ))}
        </Box>
      </Collapse>
      {error && !moving && <Alert severity="error">{error}</Alert>}
      <Dialog
        open={Boolean(moving)}
        onClose={() => {
          if (!pending) setMoving(null);
        }}
        aria-labelledby="sidebar-move-title"
      >
        <DialogTitle id="sidebar-move-title">
          {moving?.is_loose ? "Adicionar ao projeto" : "Mover texto"}
        </DialogTitle>
        <Box component="form" onSubmit={submitMove}>
          <DialogContent>
            <Stack spacing={2}>
              {error && <Alert severity="error">{error}</Alert>}
              <TextField
                select
                label="Projeto de destino"
                name="project"
                id="sidebar-destination"
                required
                defaultValue=""
                slotProps={{ select: { native: true } }}
              >
                <option value="" disabled>
                  Escolha um projeto
                </option>
                {library.projects
                  .filter((project) => project.id !== moving?.project)
                  .map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.title}
                    </option>
                  ))}
              </TextField>
              {!library.projects.some(
                (project) => project.id !== moving?.project,
              ) && (
                <Box>
                  Crie um projeto na biblioteca para organizar este texto.
                </Box>
              )}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button
              type="button"
              disabled={pending}
              onClick={() => setMoving(null)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={
                pending ||
                !library.projects.some(
                  (project) => project.id !== moving?.project,
                )
              }
            >
              Adicionar
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Box>
  );
}
