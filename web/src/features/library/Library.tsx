"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { textLocation } from "./text-location";
import { libraryRequest, errorMessage } from "./api";
import { useLibrary } from "./LibraryShell";
import type { Collection, Project, TextSummary } from "./types";
import { LibraryItem } from "./LibraryItem";
import { LibrarySearch } from "./LibrarySearch";
import { BookSection } from "./BookSection";
import { LibraryGrid, LibraryEmptyActions } from "@/theme/library";
import { EditorWorkspace } from "@/theme/workspace";
import { useShell } from "@/components/shell/AppShell";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Alert from "@mui/material/Alert";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import {
  HeaderActions,
  CompactActionButton,
} from "@/components/ui/HeaderControls";
import {
  SearchIcon,
  ComposeIcon,
  PlusIcon,
  FilterIcon,
} from "@/components/icons/NavigationIcons";
import { DataSection } from "@/components/ui/DataSection";

export function Library({
  collectionId = null,
  autofocus = false,
  createKind = null,
}: {
  collectionId?: number | null;
  autofocus?: boolean;
  createKind?: "project" | "collection" | null;
}) {
  const router = useRouter();
  const { setRightContext } = useShell();
  useEffect(() => {
    setRightContext({ key: "library", defaultOpen: false });
    return () => setRightContext(null);
  }, [setRightContext]);
  const { projects, collections, loading, refresh } = useLibrary();
  const [searchOpen, setSearchOpen] = useState(autofocus);
  const [booksExpanded, setBooksExpanded] = useState(true);
  const [collectionsExpanded, setCollectionsExpanded] = useState(true);
  const [texts, setTexts] = useState<TextSummary[]>([]);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState<"project" | "collection" | null>(
    createKind,
  );
  const [pending, setPending] = useState(false);
  useEffect(() => {
    let active = true;
    async function loadLooseTexts() {
      try {
        const found = await libraryRequest<TextSummary[]>("texts?loose=1");
        if (active) setTexts(found);
      } catch (reason) {
        if (active) setError(errorMessage(reason));
      }
    }
    void loadLooseTexts();
    return () => {
      active = false;
    };
  }, [projects]);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = String(new FormData(event.currentTarget).get("title") ?? "");
    setPending(true);
    setError("");
    try {
      if (creating === "collection") {
        const collection = await libraryRequest<Collection>(
          "collections",
          "POST",
          { title },
        );
        await refresh();
        setCreating(null);
        router.push(`/?collection=${collection.id}`);
      } else {
        const project = await libraryRequest<Project>("projects", "POST", {
          title,
          collection: collectionId,
        });
        await refresh();
        setCreating(null);
        router.push(`/projects/${project.id}`);
      }
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setPending(false);
    }
  }

  const visible = projects.filter(
    (project) => collectionId === null || project.collection === collectionId,
  );
  const visibleTexts =
    collectionId === null
      ? texts
      : texts.filter((text) =>
          projects.some(
            (project) =>
              project.id === text.project &&
              project.collection === collectionId,
          ),
        );
  const selectedCollection = collections.find(
    (collection) => collection.id === collectionId,
  );
  const visibleCollections = collectionId === null ? collections : [];

  function closeCreate() {
    if (!pending) {
      setCreating(null);
      if (createKind)
        router.push(collectionId ? `/?collection=${collectionId}` : "/");
    }
  }
  return (
    <EditorWorkspace component="section" editing={false} bookWorkspace spacing={2}>
      <BookSection
          title={selectedCollection?.title ?? "Biblioteca"}
          expanded={booksExpanded}
          onToggle={() => setBooksExpanded(!booksExpanded)}
          actions={
            <HeaderActions>
              <CompactActionButton
                label="Buscar na biblioteca"
                onClick={() => setSearchOpen(true)}
              >
                <SearchIcon />
              </CompactActionButton>
              <CompactActionButton
                label="Criar projeto"
                onClick={() => setCreating("project")}
              >
                <ComposeIcon />
              </CompactActionButton>
              <CompactActionButton label="Filtros (em planejamento)" disabled>
                <FilterIcon />
              </CompactActionButton>
            </HeaderActions>
          }
        >
          {error && !creating && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <Stack spacing={2}>
            {selectedCollection?.description && <Typography color="text.secondary">{selectedCollection.description}</Typography>}
            {loading ? (
              <Typography color="text.secondary">
                Carregando biblioteca…
              </Typography>
            ) : (
              <>
                {visible.length > 0 && (
                  <LibraryGrid>
                    {visible.map((project) => (
                      <LibraryItem
                        key={`project-${project.id}`}
                        href={`/projects/${project.id}`}
                        title={project.title}
                        coverUrl={project.cover_url}
                      />
                    ))}
                  </LibraryGrid>
                )}
                {visibleTexts.length > 0 && (
                  <DataSection title="Textos soltos">
                    <List disablePadding>
                      {visibleTexts.map((text) => (
                        <ListItemButton
                          component={Link}
                          key={text.id}
                          href={`/texts/${text.id}`}
                        >
                          <ListItemText
                            primary={text.title || "Sem título"}
                            secondary={
                              textLocation(text)
                            }
                          />
                        </ListItemButton>
                      ))}
                    </List>
                  </DataSection>
                )}
                {!visible.length &&
                  !visibleCollections.length &&
                  !visibleTexts.length && (
                    <Box sx={{ py: 5, textAlign: "center" }}>
                      <Typography
                        aria-hidden="true"
                        sx={{ fontSize: 40, color: "text.secondary" }}
                      >
                        ¶
                      </Typography>
                      <Typography component="h2" variant="h6">
                        Seu próximo texto começa aqui
                      </Typography>
                      <>
                        <LibraryEmptyActions>
                          <Button component={Link} href="/texts/new" startIcon={<ComposeIcon />}>
                            Novo texto
                          </Button>
                          <Button startIcon={<PlusIcon />} onClick={() => setCreating("project")}>
                            Criar projeto
                          </Button>
                        </LibraryEmptyActions>
                      </>
                    </Box>
                  )}
              </>
            )}
          </Stack>
      </BookSection>
      {collectionId === null && <BookSection title="Coleções" expanded={collectionsExpanded} onToggle={() => setCollectionsExpanded(!collectionsExpanded)} actions={
        <HeaderActions><CompactActionButton label="Criar coleção" onClick={() => setCreating("collection")}><PlusIcon /></CompactActionButton></HeaderActions>
      }>
        <LibraryGrid>
          {visibleCollections.map((collection) => <LibraryItem key={collection.id} href={`/?collection=${collection.id}`} title={collection.title} collection coverUrl={projects.find((project) => project.collection === collection.id)?.cover_url}/>) }
        </LibraryGrid>
      </BookSection>}
      <LibrarySearch
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        collectionId={collectionId}
      />
      <Dialog
        open={Boolean(creating)}
        onClose={closeCreate}
        aria-labelledby="create-heading"
      >
        <DialogTitle id="create-heading">
          {creating === "project" ? "Novo projeto" : "Nova coleção"}
        </DialogTitle>
        <Box component="form" onSubmit={create}>
          <DialogContent>
            <Stack spacing={2}>
              {error && <Alert severity="error">{error}</Alert>}
              <TextField
                id="new-title"
                name="title"
                label="Título"
                autoFocus
                required={creating === "collection"}
                placeholder={
                  creating === "project" ? "Sem título" : "Nome da coleção"
                }
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button type="button" disabled={pending} onClick={closeCreate}>
              Cancelar
            </Button>
            <Button type="submit" variant="contained" disabled={pending}>
              {pending ? "Criando…" : "Criar"}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </EditorWorkspace>
  );
}
