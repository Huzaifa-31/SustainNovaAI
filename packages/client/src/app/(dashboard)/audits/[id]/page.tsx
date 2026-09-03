import { redirect } from "next/navigation";

export default async function AuditIndexPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/audits/${id}/dashboard`);
}
