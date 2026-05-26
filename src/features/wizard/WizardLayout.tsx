import { Link, useNavigate } from "react-router-dom";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { Funnel } from "@/types/funnel";
import { migrateWizardStepIndex, WIZARD_STEPS } from "./wizardSteps";
import type { WizardStepId } from "./wizardSteps";

type Props = {
  funnel: Funnel | null;
  /** Для шага «Фокус» до создания воронки */
  projectId?: string;
  /** Если funnel ещё не создан — текущий шаг 1. */
  activeStep: WizardStepId;
  children: React.ReactNode;
  onBack?: () => void;
  onNext?: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  hideNav?: boolean;
};

function WizardStepTiles({
  funnel,
  activeIdx,
  maxReached,
}: {
  funnel: Funnel | null;
  activeIdx: number;
  maxReached: number;
}) {
  return (
    <ol className="grid grid-cols-2 gap-1.5 text-[10px] sm:grid-cols-4 lg:grid-cols-7">
      {WIZARD_STEPS.map((s) => {
        const current = s.index === activeIdx;
        const visited = funnel != null && s.index <= maxReached && !current;
        const ahead = funnel != null && s.index > maxReached;
        const href = funnel
          ? `/projects/${funnel.projectId}/funnels/${funnel.id}/wizard/${s.id}`
          : null;
        const clickable = href != null;

        const itemClass = cn(
          "wizard-step-tile rounded-lg px-2 py-2.5 border text-center min-h-[3.5rem] flex flex-col items-center justify-center gap-1",
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
                <span className="tabular-nums font-semibold">{s.index}</span>
              )}
            </div>
            <p className="leading-tight line-clamp-2 text-[10px] sm:text-[11px]">{s.title}</p>
          </div>
        );

        return (
          <li key={s.id} className={clickable ? "group" : undefined}>
            {clickable ? (
              <Link
                to={href}
                className="wizard-step-link block"
                aria-current={current ? "step" : undefined}
                aria-label={`Шаг ${s.index}: ${s.title}`}
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
  );
}

export function WizardLayout({
  funnel,
  activeStep,
  children,
  onBack,
  onNext,
  nextLabel,
  nextDisabled,
  hideNav,
}: Props) {
  const nav = useNavigate();
  const activeIdx = WIZARD_STEPS.find((s) => s.id === activeStep)?.index ?? 1;
  const maxReached = funnel ? migrateWizardStepIndex(funnel.currentWizardStep) : activeIdx;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <WizardStepTiles funnel={funnel} activeIdx={activeIdx} maxReached={maxReached} />
      </div>

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
