"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { libraryRequest, errorMessage } from "./api";
import { useLibrary } from "./LibraryShell";
import type { Collection, Project, TextSummary } from "./types";
import { PrivateImage } from "@/components/PrivateImage";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardHeader from "@mui/material/CardHeader";
import CardContent from "@mui/material/CardContent";
import CardActionArea from "@mui/material/CardActionArea";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Alert from "@mui/material/Alert";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Breadcrumbs from "@mui/material/Breadcrumbs";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import { alpha } from "@mui/material/styles";
import { HeaderActions } from "@/components/ui/HeaderControls";
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
  const { projects, collections, loading, refresh } = useLibrary();
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Project[] | null>(null);
  const [texts, setTexts] = useState<TextSummary[]>([]);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState<"project" | "collection" | null>(
    createKind,
  );
  const [pending, setPending] = useState(false);
  const searchInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autofocus) searchInput.current?.focus();
  }, [autofocus]);
  useEffect(() => {
    let active = true;
    const timer = setTimeout(
      async () => {
        try {
          const query = search.trim()
            ? `search=${encodeURIComponent(search.trim())}`
            : "loose=1";
          const [foundTexts, foundProjects] = await Promise.all([
            libraryRequest<TextSummary[]>(`texts?${query}`),
            search.trim()
              ? libraryRequest<Project[]>(`projects?${query}`)
              : Promise.resolve(null),
          ]);
          if (active) {
            setTexts(foundTexts);
            setSearchResults(foundProjects);
          }
        } catch (reason) {
          if (active) setError(errorMessage(reason));
        }
      },
      search.trim() ? 250 : 0,
    );
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [search, projects]);

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
        router.push(`/projects/${project.id}`);
      }
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setPending(false);
    }
  }

  const visible = (search.trim() ? (searchResults ?? []) : projects).filter(
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

  function closeCreate() {
    if (!pending) {
      setCreating(null);
      if (createKind)
        router.push(collectionId ? `/?collection=${collectionId}` : "/");
    }
  }
  return (
    <Stack component="section" spacing={2}>
      {selectedCollection && (
        <Breadcrumbs aria-label="Caminho">
          <Link href="/">Biblioteca</Link>
          <Typography>{selectedCollection.title}</Typography>
        </Breadcrumbs>
      )}
      <Card>
        <CardHeader
          title={selectedCollection?.title ?? "Biblioteca"}
          slotProps={{ title: { component: "h1", variant: "h6" } }}
          subheader={selectedCollection?.description}
          action={
            <HeaderActions>
              <TextField
                inputRef={searchInput}
                slotProps={{
                  htmlInput: { "aria-label": "Buscar projetos e textos" },
                }}
                placeholder="Buscar projetos e textos…"
                type="search"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setSearchResults(null);
                }}
                sx={{ width: { xs: 200, sm: 300 }, maxWidth: "100%" }}
              />
              <Button
                variant="contained"
                onClick={() => setCreating("project")}
              >
                + Projeto
              </Button>
            </HeaderActions>
          }
        />
        <CardContent>
          {error && !creating && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <Stack spacing={2}>
            {!search.trim() &&
              collectionId === null &&
              collections.length > 0 && (
                <DataSection title="Coleções">
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fill, minmax(min(100%, 230px), 1fr))",
                      gap: 2,
                    }}
                  >
                    {collections.map((collection) => (
                      <Card key={collection.id}>
                        <CardActionArea
                          component={Link}
                          href={`/?collection=${collection.id}`}
                        >
                          <CardHeader
                            title={collection.title}
                            slotProps={{
                              title: { component: "h3", variant: "h6" },
                            }}
                          />
                          <CardContent>
                            <Typography color="text.secondary">
                              {
                                projects.filter(
                                  (project) =>
                                    project.collection === collection.id,
                                ).length
                              }{" "}
                              projetos
                            </Typography>
                          </CardContent>
                        </CardActionArea>
                      </Card>
                    ))}
                  </Box>
                </DataSection>
              )}
            {loading ? (
              <Typography color="text.secondary">
                Carregando biblioteca…
              </Typography>
            ) : (
              <>
                {visible.length > 0 && (
                  <DataSection title="Projetos">
                    <Box
                      sx={{
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(auto-fill, minmax(min(100%, 230px), 1fr))",
                        gap: 2,
                      }}
                    >
                      {visible.map((project) => (
                        <Card key={project.id} sx={{ minWidth: 0 }}>
                          <CardActionArea
                            component={Link}
                            href={`/projects/${project.id}`}
                            sx={{
                              height: "100%",
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "stretch",
                              justifyContent: "flex-start",
                            }}
                          >
                            <CardHeader
                              title={project.title}
                              slotProps={{
                                title: { component: "h3", variant: "h6" },
                              }}
                              sx={{ width: "100%" }}
                            />
                            <Box
                              aria-hidden="true"
                              sx={(theme) => ({
                                height: 150,
                                display: "grid",
                                placeItems: "center",
                                bgcolor: alpha(theme.palette.primary.main, 0.08),
                                fontSize: 44,
                                color: "primary.main",
                                "& img": {
                                  width: "100%",
                                  height: "100%",
                                  objectFit: "contain",
                                },
                              })}
                            >
                              {project.cover_url ? (
                                <PrivateImage src={project.cover_url} alt="" />
                              ) : (
                                "¶"
                              )}
                            </Box>
                            <CardContent sx={{ width: "100%" }}>
                              {project.subtitle && (
                                <Typography>{project.subtitle}</Typography>
                              )}
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                {project.text_count}{" "}
                                {project.text_count === 1 ? "texto" : "textos"}
                                {project.collection &&
                                  ` · ${collections.find((collection) => collection.id === project.collection)?.title ?? ""}`}
                              </Typography>
                            </CardContent>
                          </CardActionArea>
                        </Card>
                      ))}
                    </Box>
                  </DataSection>
                )}
                {visibleTexts.length > 0 && (
                  <DataSection
                    title={
                      search.trim() ? "Textos encontrados" : "Textos soltos"
                    }
                  >
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
                              !text.is_loose ? text.project_title : undefined
                            }
                          />
                        </ListItemButton>
                      ))}
                    </List>
                  </DataSection>
                )}
                {!visible.length && !visibleTexts.length && (
                  <Box sx={{ py: 5, textAlign: "center" }}>
                    <Typography
                      aria-hidden="true"
                      sx={{ fontSize: 40, color: "text.secondary" }}
                    >
                      ¶
                    </Typography>
                    <Typography component="h2" variant="h6">
                      {search
                        ? "Nenhum resultado encontrado"
                        : "Seu próximo texto começa aqui"}
                    </Typography>
                    {!search && (
                      <>
                        <Typography color="text.secondary" sx={{ my: 2 }}>
                          Comece um texto ou crie um projeto para reunir seus
                          capítulos.
                        </Typography>
                        <HeaderActions>
                          <Button component={Link} href="/texts/new">
                            ✎ Novo texto
                          </Button>
                          <Button onClick={() => setCreating("project")}>
                            + Criar projeto
                          </Button>
                        </HeaderActions>
                      </>
                    )}
                  </Box>
                )}
              </>
            )}
          </Stack>
        </CardContent>
      </Card>
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
    </Stack>
  );
}
