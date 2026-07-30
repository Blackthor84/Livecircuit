import Image from "next/image";
import Link from "next/link";
import {
  APP_NAME,
  LIVECIRCUIT_LOGO,
  LIVECIRCUIT_LOGO_HEIGHT,
  LIVECIRCUIT_LOGO_WIDTH,
  ROUTES,
} from "@/lib/constants";
import { cn } from "@/lib/utils";

const SIZES = {
  xs: 48,
  sm: 64,
  md: 88,
  lg: 112,
  xl: 144,
  "2xl": 192,
} as const;

type LiveCircuitLogoProps = {
  size?: keyof typeof SIZES;
  className?: string;
  priority?: boolean;
  href?: string | null;
};

export function LiveCircuitLogo({
  size = "md",
  className,
  priority = false,
  href = ROUTES.home,
}: LiveCircuitLogoProps) {
  const height = SIZES[size];
  const width = Math.round(height * (LIVECIRCUIT_LOGO_WIDTH / LIVECIRCUIT_LOGO_HEIGHT));

  const image = (
    <Image
      src={LIVECIRCUIT_LOGO}
      alt={APP_NAME}
      width={width}
      height={height}
      priority={priority}
      className={cn("h-auto w-auto max-h-none object-contain", className)}
      style={{ height, width: "auto", minHeight: height, maxWidth: "none" }}
    />
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex shrink-0 items-center">
        {image}
      </Link>
    );
  }

  return image;
}
