import { FolderPlus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardFrame } from "./DashboardFrame";

function timeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 6) return "Доброй ночи";
  if (hour < 12) return "Доброе утро";
  if (hour < 18) return "Добрый день";
  return "Добрый вечер";
}

function todayLabel(): string {
  return new Date().toLocaleDateString("ru-RU", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

type Props = {
  name: string;
  projectCount: number;
  contextLine: string;
  onNewProject: () => void;
};

export function DashboardHero({ name, projectCount, contextLine, onNewProject }: Props) {
  const firstName = name.split(" ")[0] || name;

  return (
    <DashboardFrame variant="accent" innerClassName="px-5 py-5 sm:px-6 sm:py-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-primary">
              <Sparkles className="h-3 w-3" />
              Центр управления
            </span>
            <span className="text-xs capitalize text-muted-foreground">{todayLabel()}</span>
          </div>

          <div>
            <p className="text-sm font-medium text-muted-foreground">{timeGreeting()},</p>
            <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              {firstName}
            </h1>
          </div>

          <p className="max-w-lg text-sm leading-relaxed text-foreground/80">{contextLine}</p>
        </div>

        {projectCount > 0 ? (
          <Button
            onClick={onNewProject}
            variant="outline"
            className="shrink-0 border-primary/30 bg-background/60 hover:bg-primary/10 hover:text-primary"
          >
            <FolderPlus className="mr-2 h-4 w-4" />
            Новый проект
          </Button>
        ) : null}
      </div>
    </DashboardFrame>
  );
}
