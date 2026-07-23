import Link from "next/link";
import { APP_NAME, APP_TAGLINE, ROUTES } from "@/lib/constants";

const footerLinks = [
  { title: "Platform", links: ["Discover", "Artists", "Tours", "VIP"] },
  { title: "Creators", links: ["Artist Dashboard", "Analytics", "Merch", "Streaming"] },
  { title: "Company", links: ["About", "Careers", "Press", "Contact"] },
  { title: "Legal", links: ["Terms", "Privacy", "Community Guidelines"] },
];

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-white/5 bg-card/30">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="grid gap-10 md:grid-cols-5">
          <div className="md:col-span-2">
            <p className="text-xl font-semibold">{APP_NAME}</p>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">{APP_TAGLINE}</p>
            <div className="mt-6 flex gap-3">
              <Link href={ROUTES.register} className="text-sm text-primary hover:underline">
                Create account
              </Link>
              <Link href={ROUTES.sponsor} className="text-sm text-muted-foreground hover:text-foreground">
                Partners & sponsorship
              </Link>
            </div>
          </div>
          {footerLinks.map((group) => (
            <div key={group.title}>
              <p className="text-sm font-medium">{group.title}</p>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                {group.links.map((link) => (
                  <li key={link}>
                    <span className="cursor-default hover:text-foreground">{link}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="mt-12 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} {APP_NAME}. Built for artists touring the world from home.
        </p>
      </div>
    </footer>
  );
}
