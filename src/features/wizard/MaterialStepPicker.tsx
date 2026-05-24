import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChecklistItem } from "@/features/wizard/MaterialChecklist";

type Props = {
  items: ChecklistItem[];
  activeLabel?: string | null;
  onSelect: (item: ChecklistItem) => void;
  onCustom?: () => void;
  customActive?: boolean;
  /** compact — зарезервировано */
  variant?: "form" | "compact";
};

export function MaterialStepPicker({
  items,
  activeLabel,
  onSelect,
  onCustom,
  customActive,
  variant = "form",
}: Props) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border/60 bg-card/25 overflow-hidden",
        variant === "form" && "shadow-sm",
      )}
    >
      <div
        className={cn(
          "material-step-scroll p-1.5",
          variant === "form" ? "max-h-[min(17.5rem,42vh)]" : "max-h-none overflow-visible",
        )}
      >
        <ul className="space-y-0.5" role="listbox" aria-label="Шаги воронки">
          {items.map((item, index) => {
            const active = activeLabel === item.label;
            return (
              <li key={item.label}>
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => onSelect(item)}
                  className={cn(
                    "w-full flex items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-[background-color,border-color,box-shadow] duration-150 ease-out",
                    active
                      ? "bg-primary/12 border border-primary/45 shadow-glow"
                      : "border border-transparent hover:bg-muted/35",
                    item.done && !active && "opacity-80",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold tabular-nums transition-colors",
                      active
                        ? "bg-primary text-primary-foreground"
                        : item.done
                          ? "bg-success/15 text-success ring-1 ring-success/25"
                          : "bg-muted/50 text-muted-foreground",
                    )}
                  >
                    {index + 1}
                  </span>
                  <span
                    className={cn(
                      "flex-1 min-w-0 text-sm leading-snug",
                      active ? "font-medium text-foreground" : "text-foreground/90",
                    )}
                  >
                    {item.label}
                  </span>
                  {item.done ? (
                    <span className="flex items-center gap-1 shrink-0 text-[10px] text-success font-medium">
                      <Check className="h-3.5 w-3.5" aria-hidden />
                      <span className="hidden sm:inline">готово</span>
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {variant === "form" && onCustom ? (
        <button
          type="button"
          onClick={onCustom}
          className={cn(
            "w-full border-t border-border/50 px-3 py-2.5 text-left text-xs transition-colors duration-150",
            customActive
              ? "bg-primary/10 text-primary font-medium"
              : "text-muted-foreground hover:bg-muted/30 hover:text-foreground",
          )}
        >
          Другое — своё название
        </button>
      ) : null}
    </div>
  );
}
