import { cn } from "@/lib/utils";

export function HypothesisStructure({
  ifText,
  thenText,
  becauseText,
  testMethod,
  successCriteria,
  metricLabel,
  compact,
}: {
  ifText: string | null;
  thenText?: string | null;
  becauseText?: string | null;
  testMethod?: string | null;
  successCriteria?: string | null;
  metricLabel?: string | null;
  compact?: boolean;
}) {
  return (
    <dl className={cn("grid gap-2.5", compact ? "text-xs" : "text-sm")}>
      {ifText ? (
        <div className="grid gap-1 sm:grid-cols-[4.5rem_1fr] sm:gap-3">
          <dt className="text-[10px] font-semibold uppercase tracking-wider text-primary/80">Если</dt>
          <dd className="leading-relaxed text-foreground break-words">{ifText}</dd>
        </div>
      ) : null}
      {thenText ? (
        <div className="grid gap-1 sm:grid-cols-[4.5rem_1fr] sm:gap-3">
          <dt className="text-[10px] font-semibold uppercase tracking-wider text-success/90">То</dt>
          <dd className="leading-relaxed text-foreground break-words">{thenText}</dd>
        </div>
      ) : null}
      {becauseText ? (
        <div className="grid gap-1 sm:grid-cols-[4.5rem_1fr] sm:gap-3">
          <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Почему
          </dt>
          <dd className="leading-relaxed text-foreground/90 break-words">{becauseText}</dd>
        </div>
      ) : null}
      {metricLabel && metricLabel !== thenText ? (
        <div className="grid gap-1 sm:grid-cols-[4.5rem_1fr] sm:gap-3">
          <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Метрика
          </dt>
          <dd className="leading-relaxed text-foreground/90 break-words">{metricLabel}</dd>
        </div>
      ) : null}
      {testMethod ? (
        <div className="grid gap-1 sm:grid-cols-[4.5rem_1fr] sm:gap-3 border-t border-border/30 pt-2">
          <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Тест
          </dt>
          <dd className="text-xs leading-relaxed text-foreground/85 break-words">{testMethod}</dd>
        </div>
      ) : null}
      {successCriteria ? (
        <div className="grid gap-1 sm:grid-cols-[4.5rem_1fr] sm:gap-3">
          <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Успех
          </dt>
          <dd className="text-xs leading-relaxed text-foreground/85 break-words">{successCriteria}</dd>
        </div>
      ) : null}
    </dl>
  );
}
