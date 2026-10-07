import { apiRequest } from "@/api/client";

const fieldLabels = {
  title: "Título", subtitle: "Subtítulo", author: "Autor", markdown: "Markdown",
  project: "Projeto", collection: "Coleção", parent: "Texto principal", ids: "Ordem dos textos",
};

export function libraryRequest<T>(path: string, method = "GET", data?: unknown) {
  return apiRequest<T>(`/api/library/${path}`, {
    method, ...(data === undefined ? {} : { body: JSON.stringify(data) }),
  }, fieldLabels);
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Não foi possível concluir. Tente novamente.";
}
