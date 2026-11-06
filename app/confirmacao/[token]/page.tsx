import UserRegistration from "@/app/ui/UserRegistration";

export default async function ConfirmacaoPorToken({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <UserRegistration initialToken={token} />;
}
