"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { ComposeIcon, ImageIcon } from "@/components/icons/NavigationIcons";
import { PrivateImage } from "@/components/PrivateImage";
import { errorMessage, libraryRequest } from "./api";
import type { Project } from "./types";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";

export function ProjectCover({
  project,
  onChange,
}: {
  project: Project;
  onChange: (project: Project) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const image = event.target.files?.[0];
    event.target.value = "";
    if (!image) return;
    const form = new FormData();
    form.append("image", image);
    setPending(true);
    setError("");
    try {
      onChange(
        await libraryRequest<Project>(
          `projects/${project.id}/cover`,
          "POST",
          form,
        ),
      );
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setPending(false);
    }
  }

  return (
    <Box sx={{ width: 140, flexShrink: 0 }}>
      <ButtonBase
        aria-label={project.cover_url ? "Trocar capa" : "Adicionar capa"}
        aria-busy={pending}
        disabled={pending}
        onClick={() => input.current?.click()}
        sx={{
          width: "100%",
          aspectRatio: "3 / 4",
          position: "relative",
          bgcolor: "action.hover",
          border: 1,
          borderColor: "divider",
          borderRadius: 1,
          overflow: "hidden",
          "& img": { width: "100%", height: "100%", objectFit: "contain" },
          "&:hover .cover-change, &:focus-visible .cover-change": {
            opacity: 1,
          },
        }}
      >
        {project.cover_url ? (
          <>
            <PrivateImage
              src={project.cover_url}
              alt={`Capa de ${project.title}`}
            />
            <Box
              className="cover-change"
              sx={{
                position: "absolute",
                bottom: 0,
                insetInline: 0,
                bgcolor: "background.paper",
                p: 1,
                opacity: 0,
                display: "flex",
                gap: 1,
                alignItems: "center",
              }}
            >
              <ComposeIcon />
              <Typography variant="caption">
                {pending ? "Enviando…" : "Trocar capa"}
              </Typography>
            </Box>
          </>
        ) : (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 1,
              color: "text.secondary",
            }}
          >
            <ImageIcon />
            <Typography variant="caption">
              {pending ? "Enviando…" : "Adicionar capa"}
            </Typography>
          </Box>
        )}
      </ButtonBase>
      <input
        ref={input}
        type="file"
        aria-label="Arquivo de capa"
        accept="image/jpeg,image/png,image/webp"
        hidden
        disabled={pending}
        onChange={upload}
      />
      {error && (
        <Alert severity="error" sx={{ mt: 1 }}>
          {error}
        </Alert>
      )}
    </Box>
  );
}
