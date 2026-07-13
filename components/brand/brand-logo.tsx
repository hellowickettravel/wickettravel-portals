import Image from "next/image";
import { cn } from "@/lib/utils";
import logoColor from "@/public/logo-trans.png";
import logoWhite from "@/public/logo-white.png";

type BrandLogoProps = {
  /**
   * "color" (navy + orange) for light backgrounds; "white" (white + orange)
   * for dark navy surfaces like the sidebar and the auth hero panel.
   */
  variant?: "color" | "white";
  /** Size with `h-* w-auto` utilities; defaults to h-7. */
  className?: string;
  priority?: boolean;
};

/** The Wicket Travel wordmark. Static imports keep intrinsic size — no layout shift. */
export function BrandLogo({
  variant = "color",
  className,
  priority = false,
}: BrandLogoProps) {
  return (
    <Image
      src={variant === "white" ? logoWhite : logoColor}
      alt="Wicket Travel"
      priority={priority}
      className={cn("h-7 w-auto", className)}
    />
  );
}
