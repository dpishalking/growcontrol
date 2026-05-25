import { Link, useNavigate } from "react-router-dom";
import { Check, ChevronLeft, ChevronRight, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Funnel } from "@/types/funnel";
import { migrateWizardStepIndex, WIZARD_STEPS } from "./wizardSteps";
import type { WizardStepId } from "./wizardSteps";
import { getFunnelTypeTemplate } from "@/data/funnelTypes/catalog";

type Props = {
  funnel: Funnel | null;
  /** Если funnel ещё не создан — текущий шаг 1. */
  activeStep: WizardStepId;
  children: React.ReactNode;
  onBack?: () => void;
  onNext?: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  hideNav?: boolean;
  /** Компактный режим — скрывает сетку шагов, оставляет только контекст воронки. */
  quizMode?: boolean;
};

export function WizardLayout({
  funnel,
  activeStep,
  children,
  onBack,
  onNext,
  nextLabel,
  nextDisabled,
  hideNav,
  quizMode,
}: Props) {
  const nav = useNavigate();
  const activeIdx = WIZARD_STEPS.find((s) => s.id === activeStep)?.index ?? 1;
  const maxReached = funnel ? migrateWizardStepIndex(funnel.currentWizardStep) : activeIdx;

  const focusLabel = funnel
    ? `${funnel.productName || "—"} · ${funnel.trafficSource || "—"} → ${funnel.landingUrl || "—"}`
    : "Фокус ещё не задан";

  const typeLabel = funnel?.funnelTypeId
    ? getFunnelTypeTemplate(funnel.funnelTypeId).name
    : null;

  return (
    <div className="space-y-6">
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <Target className="h-5 w-5 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Сейчас анализируем
            </p>
            <p className="text-sm font-medium truncate">{focusLabel}</p>
            {funnel?.funnelGoal ? (
              <p className="text-xs text-muted-foreground truncate">Цель: {funnel.funnelGoal}</p>
            ) : null}
            {typeLabel ? (
              <p className="text-xs text-primary/80 truncate">Тип: {typeLabel}</p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {!quizMode ? (
        <ol className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-1.5 text-[10px]">
          {WIZARD_STEPS.map((s) => {
            const current = s.index === activeIdx;
            const visited = funnel != null && s.index <= maxReached && !current;
            const ahead = funnel != null && s.index > maxReached;
            const href = funnel
              ? `/projects/${funnel.projectId}/funnels/${funnel.id}/wizard/${s.id}`
              : null;
            const clickable = href != null;

            const itemClass = cn(
              "wizard-step-tile rounded-md px-2 py-2 border text-center min-h-[3.25rem]",
              current &&
                "border-primary/50 bg-primary/10 text-primary font-medium shadow-glow ring-1 ring-primary/20",
              visited && "border-success/30 bg-success/10 text-success",
              ahead && "border-border/50 text-muted-foreground",
              !current && !visited && !ahead && "border-border/40 text-muted-foreground",
              clickable && "group-hover:border-primary/45 group-hover:bg-primary/8 group-hover:text-foreground",
            );

            const content = (
              <div className={itemClass} title={s.title}>
                <div className="wizard-step-icon flex items-center justify-center gap-1">
                  {visited ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <span className="tabular-nums font-medium">{s.index}</span>
                  )}
                </div>
                <p className="mt-1 hidden sm:block leading-tight line-clamp-2 transition-opacity duration-200 group-hover:opacity-100 opacity-90">
                  {s.title}
                </p>
              </div>
            );

            return (
              <li key={s.id} className={clickable ? "group" : undefined}>
                {clickable ? (
                  <Link
                    to={href}
                    className="wizard-step-link"
                    aria-current={current ? "step" : undefined}
                  >
                    {content}
                  </Link>
                ) : (
                  content
                )}
              </li>
            );
          })}
        </ol>
      ) : (
        <div className="flex flex-wrap items-center justify-center gap-2">
          <p className="text-[11px] text-muted-foreground">
            Шаг {activeIdx} из {WIZARD_STEPS.length} ·{" "}
            {WIZARD_STEPS.find((s) => s.id === activeStep)?.title}
          </p>
          {funnel ? (
            <div className="flex flex-wrap justify-center gap-1">
              {WIZARD_STEPS.map((s) => {
                const current = s.index === activeIdx;
                const href = `/projects/${funnel.projectId}/funnels/${funnel.id}/wizard/${s.id}`;
                return (
                  <Link
                    key={s.id}
                    to={href}
                    className={cn(
                      "wizard-step-pill rounded-full px-2.5 py-1 text-[10px] border min-w-[1.75rem] text-center",
                      current
                        ? "border-primary/50 bg-primary/15 text-primary font-medium shadow-glow"
                        : "border-border/50 text-muted-foreground hover:border-primary/40 hover:bg-primary/10 hover:text-foreground",
                    )}
                    title={s.title}
                  >
                    {s.index}
                  </Link>
                );
              })}
            </div>
          ) : null}
        </div>
      )}

      <div>{children}</div>

      {!hideNav ? (
        <div className="flex items-center justify-between border-t border-border/60 pt-4">
          <Button
            variant="outline"
            onClick={() => (onBack ? onBack() : nav(-1))}
            disabled={activeIdx === 1 && !onBack}
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Назад
          </Button>
          {onNext ? (
            <Button onClick={onNext} disabled={nextDisabled} className="bg-gradient-money text-primary-foreground">
              {nextLabel ?? "Дальше"}
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
