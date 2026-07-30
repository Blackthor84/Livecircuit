"use client";

import Image from "next/image";
import type { SponsorPresentation } from "@/lib/sponsorship/display";

type Props = {
  sponsor: SponsorPresentation;
  variant: "livestream" | "replay" | "tour" | "wifi";
  tourTitle?: string;
  className?: string;
};

export function PremiumSponsorPresenter({ sponsor, variant, tourTitle, className }: Props) {
  const copy =
    variant === "livestream"
      ? `Tonight's livestream is presented by ${sponsor.label}`
      : variant === "replay"
        ? `Replay presented by ${sponsor.label}`
        : variant === "tour" && tourTitle
          ? `${tourTitle} presented by ${sponsor.label}`
          : variant === "wifi"
            ? `WiFi courtesy of ${sponsor.label}`
            : sponsor.label;

  return (
    <div
      className={`flex items-center justify-center gap-2 border-y border-white/5 bg-white/[0.02] px-4 py-2 text-xs text-muted-foreground ${className ?? ""}`}
    >
      {sponsor.logoUrl ? (
        <Image
          src={sponsor.logoUrl}
          alt=""
          width={20}
          height={20}
          className="size-5 object-contain opacity-80"
        />
      ) : null}
      <span>{copy}</span>
    </div>
  );
}
