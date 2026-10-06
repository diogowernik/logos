import { requireUser } from "@/server/auth";
import { ProjectEditor } from "@/features/library/ProjectEditor";

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  return <ProjectEditor projectId={(await params).id} />;
}
