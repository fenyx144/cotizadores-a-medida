import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { getClientSession } from "@/lib/client-session";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const session = await getClientSession();
  return (
    <>
      <SiteHeader clientName={session?.name} />
      <main>{children}</main>
      <SiteFooter />
    </>
  );
}
