"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import Dialog from "@mui/material/Dialog";
import Alert from "@mui/material/Alert";
import Typography from "@mui/material/Typography";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import ListItemIcon from "@mui/material/ListItemIcon";
import { CompactActionButton } from "@/components/ui/HeaderControls";
import {
  CloseIcon,
  ComposeIcon,
  FolderIcon,
} from "@/components/icons/NavigationIcons";
import {
  LibrarySearchTitle,
  LibrarySearchContent,
  LibrarySearchField,
  LibrarySearchGroup,
} from "@/theme/library";
import { useLibrary } from "./LibraryShell";
import { libraryRequest, errorMessage } from "./api";
import type { Project, TextSummary } from "./types";

type Results = {
  query: string;
  projects: Project[];
  texts: TextSummary[];
  error?: string;
};

export function LibrarySearch({
  open,
  onClose,
  collectionId,
}: {
  open: boolean;
  onClose: () => void;
  collectionId: number | null;
}) {
  const library = useLibrary();
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Results | null>(null);
  const query = search.trim();

  useEffect(() => {
    if (!open || !query) return;
    let active = true;
    const timer = setTimeout(async () => {
      try {
        const encoded = encodeURIComponent(query);
        const [projects, texts] = await Promise.all([
          libraryRequest<Project[]>(`projects?search=${encoded}`),
          libraryRequest<TextSummary[]>(`texts?search=${encoded}`),
        ]);
        if (active) setResults({ query, projects, texts });
      } catch (reason) {
        if (active)
          setResults({
            query,
            projects: [],
            texts: [],
            error: errorMessage(reason),
          });
      }
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [open, query]);

  const current = results?.query === query ? results : null;
  const searching = Boolean(query) && !current;
  const projects = (current?.projects ?? []).filter(
    (project) => collectionId === null || project.collection === collectionId,
  );
  const texts = (query ? (current?.texts ?? []) : library.recent).filter(
    (text) =>
      collectionId === null ||
      library.projects.some(
        (project) =>
          project.id === text.project && project.collection === collectionId,
      ),
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      aria-labelledby="library-search-title"
    >
      <LibrarySearchTitle id="library-search-heading">
        <span id="library-search-title">Buscar na biblioteca</span>
        <CompactActionButton label="Fechar busca" onClick={onClose}>
          <CloseIcon />
        </CompactActionButton>
      </LibrarySearchTitle>
      <LibrarySearchContent>
        <LibrarySearchField
          autoFocus
          fullWidth
          type="search"
          placeholder="Buscar projetos e textos…"
          slotProps={{
            htmlInput: { "aria-label": "Buscar projetos e textos" },
          }}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        {searching ? (
          <Typography role="status" color="text.secondary">
            Buscando…
          </Typography>
        ) : current?.error ? (
          <Alert severity="error">{current.error}</Alert>
        ) : (
          <>
            {projects.length > 0 && (
              <List
                disablePadding
                aria-label="Projetos encontrados"
                subheader={<LibrarySearchGroup>Projetos</LibrarySearchGroup>}
              >
                {projects.map((project) => (
                  <ListItemButton
                    key={project.id}
                    component={Link}
                    href={`/projects/${project.id}`}
                    onClick={onClose}
                  >
                    <ListItemIcon>
                      <FolderIcon />
                    </ListItemIcon>
                    <ListItemText primary={project.title || "Sem título"} />
                  </ListItemButton>
                ))}
              </List>
            )}
            {texts.length > 0 && (
              <List
                disablePadding
                aria-label={query ? "Textos encontrados" : "Textos recentes"}
                subheader={
                  <LibrarySearchGroup>
                    {query ? "Textos" : "Recentes"}
                  </LibrarySearchGroup>
                }
              >
                {texts.map((text) => (
                  <ListItemButton
                    key={text.id}
                    component={Link}
                    href={`/texts/${text.id}`}
                    onClick={onClose}
                  >
                    <ListItemIcon>
                      <ComposeIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary={text.title || "Sem título"}
                      secondary={text.is_loose ? undefined : text.project_title}
                    />
                  </ListItemButton>
                ))}
              </List>
            )}
            {query && !projects.length && !texts.length && (
              <Typography role="status" color="text.secondary">
                Nenhum resultado encontrado
              </Typography>
            )}
          </>
        )}
      </LibrarySearchContent>
    </Dialog>
  );
}
