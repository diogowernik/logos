export type Collection = {
  id: number;
  title: string;
  description: string;
  position: number;
};
export type Project = {
  id: number;
  title: string;
  subtitle: string;
  author: string;
  collection: number | null;
  default_group: number;
  is_inbox: boolean;
  text_count: number;
  updated_at: string;
  cover?: string | null;
  cover_url?: string | null;
};
export type Text = {
  id: number;
  project: number;
  group: number;
  parent: number | null;
  title: string;
  markdown: string;
  position: number;
  last_used_at?: string;
  compiled_markdown?: string;
};
export type TextSummary = Omit<Text, "markdown" | "compiled_markdown"> & {
  project_title: string;
  group_name: string;
  is_loose: boolean;
};
export type Asset = {
  id: string;
  original_name: string;
  mime_type: string;
  url: string;
  created_at: string;
};
export type EpubArtifact = {
  filename: string;
  generation: number;
  url: string;
  created_at: string;
  sha256: string;
  compiler_version: string;
  source_sha256: string;
  is_current: boolean;
};
export type ProjectContent = {
  project: Project;
  texts: Text[];
  group: TextGroup;
  groups: TextGroup[];
  assets?: Asset[];
  epub?: EpubArtifact | null;
  imports?: import("./import-types").EpubImportJob[];
};

export type TextGroup = {
  id: number; project: number; name: string; is_default: boolean; text_count: number;
  export_title: string; export_subtitle: string; export_author: string;
  cover: string | null; created_at: string; updated_at: string;
};
