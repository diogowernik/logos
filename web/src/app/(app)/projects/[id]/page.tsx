import { requireUser } from "@/server/auth";
import { ProjectEditor } from "@/features/library/ProjectEditor";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;
  return <ProjectEditor key={id} projectId={id} />;
}
