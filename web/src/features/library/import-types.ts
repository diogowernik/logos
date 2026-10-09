import { ApiError } from "@/api/client";

export type EpubSource = "original" | "cleaned";
export type ImportWarning = { code: string; href?: string; section?: string };
export type ImportDiagnostic = {
  id: string;
  operation: string;
  source: string;
  code: string;
  message: string;
  copy_text: string;
};
export type ImportSection = {
  href: string;
  title: string;
  kind: string;
  selected: boolean;
  characters: number;
  preview: string;
};
export type EpubImportJob = {
  id: string;
  original_name: string;
  original_url: string;
  sha256: string;
  inspection: { title: string; language: string; sections: ImportSection[]; warnings: ImportWarning[] };
  clean_url: string | null;
  clean_filename: string;
  clean_sha256: string;
  clean_generation: number;
  clean_report: { warnings?: ImportWarning[]; kept?: string[] };
  status: "ready" | "processing" | "done" | "error";
  error: string;
  error_diagnostic: ImportDiagnostic | Record<string, never>;
  created_at: string;
};
export type ExtractionPreview = {
  project: number;
  source: EpubSource | "markdown";
  source_sha256: string;
  project_state: string;
  existing_text_count: number;
  existing_primary_count: number;
  requires_confirmation: boolean;
  warnings: ImportWarning[];
  sections: { href: string; title: string; position: number; markdown: string }[];
};
export type ExtractionResult = { project: number; source: EpubSource; mode: string; text_ids: number[]; reused: boolean };

export function importDiagnostic(value: unknown): ImportDiagnostic | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<ImportDiagnostic>;
  return typeof candidate.copy_text === "string" && typeof candidate.message === "string"
    ? candidate as ImportDiagnostic : null;
}
export function diagnosticFromError(error: unknown) {
  if (!(error instanceof ApiError) || !error.payload || typeof error.payload !== "object") return null;
  return importDiagnostic((error.payload as { diagnostic?: unknown }).diagnostic);
}
