import { VerifyEmailRoute } from "@/components/auth/verify-email-route";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; oobCode?: string }>;
}) {
  const params = await searchParams;

  return <VerifyEmailRoute mode={params.mode} oobCode={params.oobCode} />;
}
