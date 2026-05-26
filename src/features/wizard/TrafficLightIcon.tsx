import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  /** Какой сигнал «горит» — для очереди по умолчанию жёлтый. */
  active?: "red" | "yellow" | "green";
};

export function TrafficLightIcon({ className, active = "yellow" }: Props) {
  return (
    <div
      className={cn(
        "flex h-[1.35rem] w-[0.7rem] flex-col items-center justify-center gap-[2px] rounded-full border border-border/50 bg-foreground/5 px-[3px] py-[3px]",
        className,
      )}
      aria-hidden
    >
      <span
        className={cn(
          "h-1 w-1 rounded-full",
          active === "red"
            ? "bg-danger shadow-[0_0_6px_hsl(var(--danger)/0.85)]"
            : "bg-danger/20",
        )}
      />
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          active === "yellow"
            ? "bg-warning shadow-[0_0_8px_hsl(var(--warning)/0.95)] ring-1 ring-warning/40 animate-pulse"
            : "bg-warning/20",
        )}
      />
      <span
        className={cn(
          "h-1 w-1 rounded-full",
          active === "green"
            ? "bg-success shadow-[0_0_6px_hsl(var(--success)/0.85)]"
            : "bg-success/20",
        )}
      />
    </div>
  );
}
