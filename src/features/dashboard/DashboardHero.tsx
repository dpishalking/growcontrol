import { Sparkles } from "lucide-react";
import { greetingFirstName } from "@/lib/userDisplayName";
import { DashboardFrame } from "./DashboardFrame";
import { NewProjectButton } from "./NewProjectButton";

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
  email?: string | null;
  projectCount: number;
  onNewProject: () => void;
};

export function DashboardHero({ name, email, projectCount, onNewProject }: Props) {
  const firstName = greetingFirstName(name, email);
  const isEmpty = projectCount === 0;

  return (
    <DashboardFrame variant="accent" innerClassName="px-5 py-5 sm:px-6 sm:py-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-3">
          {!isEmpty ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-primary">
                <Sparkles className="h-3 w-3" />
                Центр управления
              </span>
              <span className="text-xs capitalize text-muted-foreground">{todayLabel()}</span>
            </div>
          ) : (
            <span className="text-xs capitalize text-muted-foreground">{todayLabel()}</span>
          )}

          <div>
            {firstName ? (
              <>
                <p className="text-sm font-medium text-muted-foreground">{timeGreeting()},</p>
                <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                  {firstName}
                </h1>
              </>
            ) : (
              <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                {timeGreeting()}
              </h1>
            )}
          </div>
        </div>

        {projectCount > 0 ? (
          <NewProjectButton onClick={onNewProject} />
        ) : null}
      </div>
    </DashboardFrame>
  );
}
