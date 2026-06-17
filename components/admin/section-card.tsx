import type { ReactNode } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type SectionCardProps = {
  title?: ReactNode;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Remove the default padding on the body (useful for full-bleed tables). */
  flush?: boolean;
};

/** Titled card wrapper used across admin screens. */
export function SectionCard({
  title,
  description,
  action,
  children,
  className,
  flush,
}: SectionCardProps) {
  return (
    <Card className={cn("shadow-card", className)}>
      {title || action ? (
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div className="space-y-1">
            {title ? (
              <CardTitle className="font-display text-base">{title}</CardTitle>
            ) : null}
            {description ? (
              <CardDescription>{description}</CardDescription>
            ) : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </CardHeader>
      ) : null}
      <CardContent className={cn(flush && "px-0 pb-0")}>{children}</CardContent>
    </Card>
  );
}
