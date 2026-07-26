import Link from "next/link";
import { APP_NAME, APP_TAGLINE, ROUTES } from "@/lib/constants";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-white/5 bg-card/30">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="grid gap-10 md:grid-cols-2">
          <div>
            <p className="text-xl font-semibold">{APP_NAME}</p>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">{APP_TAGLINE}</p>
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
              <Link href="/about" className="text-muted-foreground hover:text-foreground">
                About
              </Link>
            </div>
          </div>
          <div className="md:text-right">
            <p className="text-sm font-medium">Get started</p>
            <div className="mt-4 flex flex-wrap gap-3 md:justify-end">
              <Link href={ROUTES.register} className="text-sm text-primary hover:underline">
                Create account
              </Link>
              <Link href={ROUTES.login} className="text-sm text-muted-foreground hover:text-foreground">
                Sign in
              </Link>
            </div>
          </div>
        </div>
        <p className="mt-12 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} {APP_NAME}. Built for artists touring the world from home.
        </p>
      </div>
    </footer>
  );
}
