import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { getHeaderUser } from "@/lib/auth/session";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const user = await getHeaderUser();

  return (
    <>
      <SiteHeader user={user} />
      <main className="flex-1">{children}</main>
      <SiteFooter user={user} />
    </>
  );
}
