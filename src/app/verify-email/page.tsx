import { VerifyEmailRoute } from "@/components/auth/verify-email-route";
import { resolveVerifyEmailParams } from "@/app/verify-email/page-params";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{
    mode?: string | string[];
    oobCode?: string | string[];
    continueUrl?: string | string[];
    link?: string | string[];
  }>;
}) {
  const params = resolveVerifyEmailParams(await searchParams);

  return <VerifyEmailRoute mode={params.mode} oobCode={params.oobCode} />;
}
