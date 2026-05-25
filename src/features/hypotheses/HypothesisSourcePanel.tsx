import type { LucideIcon } from "lucide-react";
import { FileText, Loader2, PenLine, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  generating: boolean;
  auditDraftCount: number;
  hasLibrary: boolean;
  onLibrary: () => void;
  onAudit: () => void;
  onManual: () => void;
  onPickExisting: () => void;
};

export function HypothesisSourcePanel({
  generating,
  auditDraftCount,
  hasLibrary,
  onLibrary,
  onAudit,
  onManual,
  onPickExisting,
}: Props) {
  return (
    <div className="rounded-xl border border-border/50 bg-card/30 p-4 space-y-4">
      <div className="text-center space-y-1">
        <p className="text-sm font-medium">Откуда взять гипотезы?</p>
        <p className="text-[11px] text-muted-foreground">
          Выберите источник — потом отметите 1–2 идеи для первого теста
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <SourceCard
          icon={Sparkles}
          title="Шаблоны"
          badge="Библиотека"
          description={
            hasLibrary
              ? "Типовые тесты под вашу метрику — сгенерируем список"
              : "Для этой метрики шаблонов пока нет"
          }
          disabled={generating || !hasLibrary}
          loading={generating}
          onClick={onLibrary}
        />
        <SourceCard
          icon={FileText}
          title="Из AI-аудита"
          badge={auditDraftCount > 0 ? String(auditDraftCount) : undefined}
          description={
            auditDraftCount > 0
              ? "Идеи, которые AI уже предложил на шаге «Аудит»"
              : "Сначала пройдите AI-аудит — там появятся черновики"
          }
          disabled={generating || auditDraftCount === 0}
          onClick={onAudit}
        />
      </div>

      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <button
          type="button"
          className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
          onClick={onManual}
        >
          <PenLine className="h-3.5 w-3.5" />
          Своя формулировка
        </button>
        <button
          type="button"
          className="hover:text-foreground transition-colors"
          onClick={onPickExisting}
        >
          Уже есть черновики
        </button>
      </div>
    </div>
  );
}

function SourceCard({
  icon: Icon,
  title,
  badge,
  description,
  disabled,
  loading,
  onClick,
}: {
  icon: LucideIcon;
  title: string;
  badge?: string;
  description: string;
  disabled?: boolean;
  loading?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "rounded-xl border px-4 py-3.5 text-left transition-colors space-y-2",
        disabled
          ? "border-border/40 opacity-60 cursor-not-allowed"
          : "border-border/60 bg-background/40 hover:border-primary/40 hover:bg-primary/5",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-sm font-semibold">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          ) : (
            <Icon className="h-4 w-4 text-primary shrink-0" />
          )}
          {title}
        </span>
        {badge ? (
          <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-medium text-primary tabular-nums">
            {badge}
          </span>
        ) : null}
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
    </button>
  );
}
