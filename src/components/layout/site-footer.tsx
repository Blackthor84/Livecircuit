import Link from "next/link";
import { LiveCircuitLogo } from "@/components/brand/livecircuit-logo";
import { AuthAccountSection } from "@/components/layout/auth-account-section";
import type { HeaderUser } from "@/components/layout/site-header-user-menu";
import { APP_NAME, APP_TAGLINE, CONTACT_EMAILS, ROUTES } from "@/lib/constants";

export function SiteFooter({ user }: { user: HeaderUser | null }) {
  return (
    <footer className="mt-auto border-t border-white/5 bg-card/30">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="grid gap-10 md:grid-cols-2">
          <div>
            <LiveCircuitLogo size="2xl" href={ROUTES.home} />
            <p className="mt-3 max-w-sm text-sm text-muted-foreground">{APP_TAGLINE}</p>
            <div className="mt-6 flex flex-wrap gap-4 text-sm">
              <Link href={ROUTES.discover} className="text-muted-foreground hover:text-foreground">
                Events
              </Link>
              <Link href={ROUTES.artists} className="text-muted-foreground hover:text-foreground">
                Artists
              </Link>
              <Link href={ROUTES.venues} className="text-muted-foreground hover:text-foreground">
                Venues
              </Link>
              <Link href={ROUTES.creatorPromise} className="text-muted-foreground hover:text-foreground">
                Creator Promise
              </Link>
              <Link href={ROUTES.artistSuccessCenter} className="text-muted-foreground hover:text-foreground">
                For Artists
              </Link>
              <Link href="/about" className="text-muted-foreground hover:text-foreground">
                About
              </Link>
              <Link href={ROUTES.contact} className="text-muted-foreground hover:text-foreground">
                Contact
              </Link>
            </div>
            <div className="mt-6 space-y-1 text-sm text-muted-foreground">
              <p>
                Artists:{" "}
                <a
                  href={`mailto:${CONTACT_EMAILS.artists}`}
                  aria-label={`Email artist bookings at ${CONTACT_EMAILS.artists}`}
                  className="text-foreground/80 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  {CONTACT_EMAILS.artists}
                </a>
              </p>
              <p>
                Partnerships:{" "}
                <a
                  href={`mailto:${CONTACT_EMAILS.partnerships}`}
                  aria-label={`Email partnerships at ${CONTACT_EMAILS.partnerships}`}
                  className="text-foreground/80 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  {CONTACT_EMAILS.partnerships}
                </a>
              </p>
            </div>
          </div>
          <AuthAccountSection user={user} align="right" />
        </div>
        <p className="mt-12 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} {APP_NAME}. Built Artist First — digital live entertainment for creators and fans.
        </p>
      </div>
    </footer>
  );
}
