import { Link } from "react-router-dom";
import { Rocket, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BILLING_ENABLED } from "@/lib/productFlags";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  onNameChange: (value: string) => void;
  onCreate: () => void;
  canAddProject: boolean;
  projectCount: number;
  maxProjects: number;
  planName: string;
};

export function NewProjectDialog({
  open,
  onOpenChange,
  name,
  onNameChange,
  onCreate,
  canAddProject,
  projectCount,
  maxProjects,
  planName,
}: Props) {
  const atLimit = BILLING_ENABLED && !canAddProject;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md overflow-hidden border-primary/25 bg-card p-0 gap-0">
        <div className="dashboard-new-project-dialog-hero relative px-6 pt-7 pb-6 text-center">
          <div className="dashboard-new-project-dialog-glow pointer-events-none" aria-hidden />
          <div className="relative mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-money text-primary-foreground shadow-glow">
            <Rocket className="h-7 w-7" />
          </div>
          <DialogHeader className="relative space-y-2 text-center sm:text-center">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
              {atLimit ? "Лимит тарифа" : "Новый поток роста"}
            </p>
            <DialogTitle className="font-display text-2xl font-bold leading-tight">
              {atLimit ? "Нужен ещё один проект?" : "Запустите ещё один продукт"}
            </DialogTitle>
          </DialogHeader>
          <p className="relative mt-3 text-sm leading-relaxed text-muted-foreground">
            {atLimit
              ? `На «${planName}» — до ${maxProjects} ${maxProjects === 1 ? "проекта" : "проектов"}. Расширьте тариф и ведите несколько воронок параллельно.`
              : "Отдельная воронка, метрики и очередь тестов — без смешивания с текущим проектом."}
          </p>
        </div>

        <div className="space-y-4 px-6 pb-6 pt-2">
          {!atLimit ? (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Как назовём проект?</Label>
                <Input
                  value={name}
                  onChange={(e) => onNameChange(e.target.value)}
                  placeholder="Например: Курс по маркетингу"
                  autoFocus
                  className="h-11 border-primary/20 bg-muted/20 focus-visible:ring-primary/40"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") onCreate();
                  }}
                />
              </div>

              {BILLING_ENABLED ? (
                <p className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
                  <Zap className="h-3.5 w-3.5 text-primary" />
                  {projectCount} / {maxProjects} проектов · тариф «{planName}»
                </p>
              ) : null}
            </>
          ) : null}

          <DialogFooter className="flex-col gap-2 sm:flex-col sm:space-x-0">
            {atLimit ? (
              <>
                <Button
                  asChild
                  size="lg"
                  className="dashboard-cta-shimmer w-full bg-gradient-money text-primary-foreground shadow-glow"
                >
                  <Link to="/billing">Открыть тарифы</Link>
                </Button>
                <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
                  Позже
                </Button>
              </>
            ) : (
              <>
                <Button
                  size="lg"
                  onClick={onCreate}
                  className={cn(
                    "dashboard-cta-shimmer w-full bg-gradient-money text-primary-foreground shadow-glow",
                    "h-12 text-base font-semibold",
                  )}
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  Создать и перейти к воронке
                </Button>
                <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
                  Отмена
                </Button>
              </>
            )}
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
