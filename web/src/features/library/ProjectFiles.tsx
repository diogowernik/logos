"use client";

import { useState } from "react";
import { ImageIcon } from "@/components/icons/NavigationIcons";
import { PrivateImage } from "@/components/PrivateImage";
import { errorMessage, libraryRequest } from "./api";
import type { Asset, Project } from "./types";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardHeader from "@mui/material/CardHeader";
import CardContent from "@mui/material/CardContent";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import { CompactActionButton } from "@/components/ui/HeaderControls";

export function ProjectFiles({
  project,
  assets,
  onChange,
}: {
  project: Project;
  assets: Asset[];
  onChange: (project: Project) => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  if (!assets.length) return null;

  async function chooseCover(id: string | null) {
    setPending(true);
    setError("");
    try {
      onChange(
        await libraryRequest<Project>(`projects/${project.id}`, "PATCH", {
          cover: id,
        }),
      );
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setPending(false);
    }
  }

  return (
    <Card component="section" aria-labelledby="project-files-title">
      <CardHeader
        title="Arquivos"
        slotProps={{
          title: { id: "project-files-title", component: "h2", variant: "h6" },
        }}
        action={
          project.cover && (
            <Button
              variant="text"
              disabled={pending}
              onClick={() => chooseCover(null)}
            >
              Remover capa
            </Button>
          )
        }
      />
      <CardContent>
        {error && <Alert severity="error">{error}</Alert>}
        {assets.map((asset) => (
          <Box
            key={asset.id}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 2,
              py: 1,
              borderBottom: 1,
              borderColor: "divider",
              "& img": { width: 40, height: 48, objectFit: "contain" },
            }}
          >
            <PrivateImage src={asset.url} alt="" loading="lazy" />
            <Box
              component="a"
              href={asset.url}
              target="_blank"
              rel="noreferrer"
              sx={{ flex: 1, minWidth: 0, overflowWrap: "anywhere" }}
            >
              {asset.original_name}
            </Box>
            {project.cover === asset.id ? (
              <Typography variant="caption" color="text.secondary">
                Capa
              </Typography>
            ) : (
              <CompactActionButton
                label={`Usar ${asset.original_name} como capa`}
                disabled={pending}
                onClick={() => chooseCover(asset.id)}
              >
                <ImageIcon />
              </CompactActionButton>
            )}
          </Box>
        ))}
      </CardContent>
    </Card>
  );
}
