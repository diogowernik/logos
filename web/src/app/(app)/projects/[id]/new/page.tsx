import { requireUser } from "@/server/auth";
import { redirect } from "next/navigation";
import { resolveResource, querySuffix, type RouteQuery } from "@/server/library";
import { projectLocation } from "@/features/library/resource-location";
import { ProjectEditor } from "@/features/library/ProjectEditor";

export default async function ProjectPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<RouteQuery>;
}) {
  await requireUser();
  const { id } = await params;
  const project = await resolveResource("projects", id);
  if (id !== project.slug) redirect(projectLocation(project) + "/new" + querySuffix(await searchParams));
  return <ProjectEditor key={project.id} projectId={String(project.id)} initialView="new" />;
}
