import UserRegistration from "@/app/ui/UserRegistration";

export default async function Confirmacao({ searchParams }: { searchParams: Promise<{ token?: string | string[] }> }) {
  const params = await searchParams;
  const token = Array.isArray(params.token) ? params.token[0] : params.token;
  return <UserRegistration initialToken={token || ""} />;
}
