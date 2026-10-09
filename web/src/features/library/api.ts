import { apiRequest } from "@/api/client";

const fieldLabels = {
  title: "Título", subtitle: "Subtítulo", author: "Autor", markdown: "Markdown",
  project: "Projeto", group: "Grupo", new_group_name: "Nome do grupo", collection: "Coleção", parent: "Texto principal", ids: "Ordem dos textos",
  image: "Imagem", cover: "Capa",
};

export function libraryRequest<T>(path: string, method = "GET", data?: unknown) {
  return apiRequest<T>(`/api/library/${path}`, {
    method, ...(data === undefined ? {} : { body: data instanceof FormData ? data : JSON.stringify(data) }),
  }, fieldLabels);
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Não foi possível concluir. Tente novamente.";
}
