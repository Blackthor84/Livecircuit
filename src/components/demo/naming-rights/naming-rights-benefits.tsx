import {
  Award,
  Building2,
  Globe,
  Handshake,
  Megaphone,
  Sparkles,
  Ticket,
  TrendingUp,
  Users,
  Video,
  Wifi,
} from "lucide-react";
import { FadeUp, FadeUpItem, FadeUpStagger } from "@/components/demo/naming-rights/fade-up";
import { NAMING_RIGHTS_BENEFITS } from "@/lib/demo/naming-rights-data";

const ICONS = [Building2, Globe, Sparkles, Wifi, Ticket, Video, Megaphone, Users, Handshake, Award, TrendingUp];

export function NamingRightsBenefits() {
  return (
    <FadeUpStagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {NAMING_RIGHTS_BENEFITS.map((item, i) => {
        const Icon = ICONS[i % ICONS.length];
        return (
          <FadeUpItem key={item.title}>
            <div className="glass-panel h-full rounded-2xl p-6 transition hover:-translate-y-0.5 hover:border-amber-500/25">
              <div className="flex size-11 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
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
