import { FolderPlus, Sparkles, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function timeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 6) return "Доброй ночи";
  if (hour < 12) return "Доброе утро";
  if (hour < 18) return "Добрый день";
  return "Добрый вечер";
}

type Props = {
  name: string;
  projectCount: number;
  activeTests: number;
  redMetrics: number;
  onNewProject: () => void;
};

export function DashboardHero({ name, projectCount, activeTests, redMetrics, onNewProject }: Props) {
  const firstName = name.split(" ")[0] || name;

  const subtitle =
    projectCount === 0
      ? "Создайте первый проект — и пройдите мастер одной воронки от фокуса до плана тестов."
      : activeTests > 0
        ? `${activeTests} ${activeTests === 1 ? "тест" : activeTests < 5 ? "теста" : "тестов"} в плане — продолжайте там, где остановились.`
        : redMetrics > 0
          ? `${redMetrics} ${redMetrics === 1 ? "метрика" : "метрик"} ниже плана — самое время для гипотез.`
          : "Воронки на месте, метрики под контролем. Время масштабировать победители.";

  return (
    <section className="dashboard-hero relative mb-8 overflow-hidden rounded-2xl border border-border/50 p-6 sm:p-8">
      <div className="dashboard-hero-glow pointer-events-none" aria-hidden />

      <div className="relative z-[1] flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[11px] font-medium text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            Система управления ростом
          </div>

          <div>
            <p className="text-sm text-muted-foreground">{timeGreeting()},</p>
            <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl lg:text-[2.75rem] lg:leading-tight">
              {firstName}
            </h1>
          </div>

          <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">{subtitle}</p>

          {projectCount > 0 ? (
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/40 px-2.5 py-1">
                <TrendingUp className="h-3.5 w-3.5 text-success" />
                Гипотезы → тест → внедрение
              </span>
            </div>
          ) : null}
        </div>

        <Button
          size="lg"
          onClick={onNewProject}
          className={cn(
            "relative z-[1] h-12 shrink-0 bg-gradient-money px-6 text-primary-foreground shadow-glow",
            "transition-transform hover:scale-[1.02] active:scale-[0.98]",
          )}
        >
          <FolderPlus className="mr-2 h-4 w-4" />
          {projectCount === 0 ? "Создать первый проект" : "Новый проект"}
        </Button>
      </div>
    </section>
  );
}
