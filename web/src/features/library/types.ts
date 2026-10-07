export type Collection = { id: number; title: string; description: string; position: number };
export type Project = {
  id: number; family_id: number; title: string; subtitle: string; author: string;
  collection: number | null; is_principal: boolean; is_inbox: boolean; text_count: number; updated_at: string;
};
export type Text = { id: number; project: number; parent: number | null; title: string; markdown: string; position: number; last_used_at?: string; compiled_markdown?: string };
export type TextSummary = Omit<Text, "markdown" | "compiled_markdown"> & { project_title: string; is_loose: boolean };
export type ProjectContent = { project: Project; texts: Text[]; versions: Project[] };
