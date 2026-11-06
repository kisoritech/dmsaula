import { notFound } from "next/navigation";
import ResourceManager from "@/app/ui/ResourceManager";
import { getResource } from "@/app/ui/school-config";

export default async function ResourcePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const resource = getResource(slug);
  if (!resource) notFound();
  return <ResourceManager resource={resource} />;
}
