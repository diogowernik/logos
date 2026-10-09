import type { TextSummary } from "./types";

export function textLocation(text: TextSummary) {
  return text.is_loose
    ? undefined
    : [text.project_title, text.group_name].filter(Boolean).join(" · ");
}
