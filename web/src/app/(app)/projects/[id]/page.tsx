import { requireUser } from "@/server/auth";
import { ProjectEditor } from "@/features/library/ProjectEditor";

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  return <ProjectEditor key={(await params).id} projectId={(await params).id} />;
}
