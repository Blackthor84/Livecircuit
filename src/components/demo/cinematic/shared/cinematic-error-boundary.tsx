"use client";

import Link from "next/link";
import { Component, type ReactNode } from "react";
import { ROUTES } from "@/lib/constants";

type Props = { children: ReactNode; label?: string };
type State = { error: Error | null };

export class CinematicErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black px-6 text-center text-foreground">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-primary">Demo Fallback</p>
          <h1 className="mt-4 text-2xl font-bold">{this.props.label ?? "Interactive demo"} unavailable</h1>
          <p className="mt-3 max-w-md text-sm text-muted-foreground">
            Something went wrong while loading this experience. You can return to the demo gateway and try again.
          </p>
          <Link
            href={ROUTES.demo}
            className="mt-8 rounded-full bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground"
          >
            Back to Demo Gateway
          </Link>
        </div>
      );
    }

    return this.props.children;
  }
}
