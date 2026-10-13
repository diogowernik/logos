import type { Collection, Project } from "./types";

export function projectLocation(project: Pick<Project, "slug">) {
  return `/projects/${project.slug}`;
}

export function collectionLocation(collection: Pick<Collection, "slug">) {
  return `/collections/${collection.slug}`;
}
