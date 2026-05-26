import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  onClick: () => void;
  disabled?: boolean;
  className?: string;
};

export function NewProjectButton({ onClick, disabled, className }: Props) {
  return (
    <div className={cn("flex flex-col items-stretch gap-1.5 sm:items-end", className)}>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={cn(
          "dashboard-new-project-cta dashboard-cta-shimmer group relative text-left",
          "transition-[transform,box-shadow] duration-300 ease-out",
          "motion-safe:hover:scale-[1.015] motion-safe:active:scale-[0.99]",
          "disabled:pointer-events-none disabled:opacity-55",
        )}
      >
        <span className="dashboard-new-project-cta-ring pointer-events-none" aria-hidden />
        <span className="relative flex items-center gap-3 px-4 py-3 sm:px-5 sm:py-3.5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/20 shadow-inner">
            <Plus className="h-5 w-5 text-primary-foreground" strokeWidth={2.5} />
          </span>
          <span className="font-display text-lg font-bold leading-tight text-primary-foreground sm:text-xl">
            Новый проект
          </span>
        </span>
      </button>
    </div>
  );
}
