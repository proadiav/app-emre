import { VerifyEmailContent } from './VerifyEmailContent';

export default async function VerifyEmailPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  return <VerifyEmailContent token={token} />;
}
