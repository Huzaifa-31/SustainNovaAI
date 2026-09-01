import { redirect } from "next/navigation";

export default function AuditIndexPage({ params }: { params: Promise<{ id: string }> }) {
  // Redirect to dashboard sub-page — params is a Promise in Next.js 15
  params.then(({ id }) => redirect(`/audits/${id}/dashboard`));
  return null;
}
