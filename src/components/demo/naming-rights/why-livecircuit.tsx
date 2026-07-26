import {
  Globe,
  Megaphone,
  Search,
  Sparkles,
  Ticket,
  TrendingUp,
  Users,
  Video,
  Building2,
  Handshake,
} from "lucide-react";
import { FadeUp, FadeUpItem, FadeUpStagger } from "@/components/demo/naming-rights/fade-up";
import { WHY_LIVECIRCUIT } from "@/lib/demo/naming-rights-data";

const ICONS = [Globe, Megaphone, Ticket, Video, Building2, Search, Sparkles, TrendingUp, Users, Handshake];

export function WhyLiveCircuit() {
  return (
    <FadeUpStagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {WHY_LIVECIRCUIT.map((item, i) => {
        const Icon = ICONS[i % ICONS.length];
        return (
          <FadeUpItem key={item.title}>
            <div className="glass-panel h-full rounded-xl p-5 transition hover:-translate-y-0.5 hover:border-amber-500/20">
              <div className="flex size-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
                <Icon className="size-5" />
              </div>
              <h3 className="mt-4 font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
            </div>
          </FadeUpItem>
        );
      })}
    </FadeUpStagger>
  );
}
