export type SourceFile = {
  name: string;
  display_name?: string;
  size: number;
  sha256: string;
  status: "unregistered" | "registered" | "missing" | "changed" | "new" | "imported" | "text_missing";
  job?: string | null;
};
