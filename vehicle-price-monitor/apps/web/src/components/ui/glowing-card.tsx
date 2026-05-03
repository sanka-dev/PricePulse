import { cn } from "@/lib/utils";

type GlowingCardProps = {
  value: string;
  title: string;
  description: string;
  className?: string;
};

export function GlowingCard({ value, title, description, className }: GlowingCardProps) {
  return (
    <div className={cn("glow-card-outer relative rounded-2xl p-[1px] h-full", className)}>
      <div className="glow-card-dot" />
      <div className="glow-card-inner relative z-10 h-full rounded-2xl border border-border/70 bg-card/85 p-6 backdrop-blur-md transition-all duration-300 hover:border-primary/60">
        <div className="glow-card-ray" />
        <p className="text-3xl font-bold tracking-tight text-foreground">{value}</p>
        <p className="mt-1 text-base font-semibold text-foreground">{title}</p>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{description}</p>
        <div className="glow-card-line glow-card-line-top" />
        <div className="glow-card-line glow-card-line-left" />
        <div className="glow-card-line glow-card-line-bottom" />
        <div className="glow-card-line glow-card-line-right" />
      </div>
    </div>
  );
}
