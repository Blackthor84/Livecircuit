import { LiveCircuitLogo } from "@/components/brand/livecircuit-logo";

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="gradient-mesh flex min-h-screen flex-col items-center justify-center px-4 py-16">
      <LiveCircuitLogo size="lg" priority className="mb-8" />
      <div className="glass-panel w-full max-w-md rounded-2xl p-8 shadow-2xl">
        <h1 className="text-2xl font-semibold">{title}</h1>
        {subtitle && <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>}
        <div className="mt-8">{children}</div>
      </div>
    </div>
  );
}
