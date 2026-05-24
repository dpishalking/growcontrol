import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Cloud, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { QuizQuestion, QuizStepConfig } from "./types";
import { fetchQuizHint } from "./quizHintService";

type SaveState = "idle" | "saving" | "saved";

type Props = {
  config: QuizStepConfig;
  values: Record<string, string>;
  onChange: (questionId: string, value: string) => void;
  onComplete: () => void;
  initialIndex?: number;
  onIndexChange?: (index: number) => void;
  onAutosave?: () => void;
  canComplete?: (values: Record<string, string>) => boolean;
};

export function QuizFlow({
  config,
  values,
  onChange,
  onComplete,
  initialIndex = 0,
  onIndexChange,
  onAutosave,
  canComplete,
}: Props) {
  const questions = config.questions;
  const [index, setIndex] = useState(() =>
    Math.max(0, Math.min(initialIndex, questions.length - 1)),
  );
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [hintOpen, setHintOpen] = useState(false);
  const [hintText, setHintText] = useState<string | null>(null);
  const [hintLoading, setHintLoading] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const q = questions[index];
  const value = values[q.id] ?? "";
  const progress = ((index + 1) / questions.length) * 100;

  const setIndexSafe = useCallback(
    (next: number) => {
      const clamped = Math.max(0, Math.min(next, questions.length - 1));
      setIndex(clamped);
      onIndexChange?.(clamped);
      setHintOpen(false);
      setHintText(null);
    },
    [onIndexChange, questions.length],
  );

  const triggerAutosave = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaveState("saving");
    saveTimer.current = setTimeout(() => {
      onAutosave?.();
      setSaveState("saved");
      if (savedTimer.current) clearTimeout(savedTimer.current);
      savedTimer.current = setTimeout(() => setSaveState("idle"), 2000);
    }, 450);
  }, [onAutosave]);

  const handleChange = (v: string) => {
    onChange(q.id, v);
    triggerAutosave();
  };

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      if (savedTimer.current) clearTimeout(savedTimer.current);
    };
  }, []);

  const handleNext = () => {
    if (q.required && !value.trim()) {
      toast.error("Это поле обязательно — или вернитесь позже, черновик уже сохранён");
      return;
    }
    if (index < questions.length - 1) {
      setIndexSafe(index + 1);
    } else {
      const ok = canComplete ? canComplete(values) : true;
      if (!ok) {
        toast.error("Заполните обязательные поля — можно вернуться к ним кнопкой «Назад»");
        return;
      }
      onComplete();
    }
  };

  const handleSkip = () => {
    if (index < questions.length - 1) setIndexSafe(index + 1);
    else onComplete();
  };

  const loadHint = async () => {
    setHintOpen(true);
    if (hintText && !hintLoading) return;
    setHintLoading(true);
    try {
      const text = await fetchQuizHint(q, values);
      setHintText(text);
    } catch {
      setHintText("Опишите ответ своими словами — даже черновик лучше пустого поля.");
    } finally {
      setHintLoading(false);
    }
  };

  const sectionLabel = q.section
    ? `${q.section} · ${index + 1}/${questions.length}`
    : `${index + 1} из ${questions.length}`;

  return (
    <div className="space-y-5 max-w-xl mx-auto fade-in">
      {config.intro && index === 0 ? (
        <p className="text-sm text-muted-foreground text-center leading-relaxed">{config.intro}</p>
      ) : null}

      <div className="space-y-2">
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>{sectionLabel}</span>
          <span className="flex items-center gap-1.5">
            {saveState === "saving" ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                Сохраняем…
              </>
            ) : saveState === "saved" ? (
              <>
                <Check className="h-3 w-3 text-success" />
                Сохранено
              </>
            ) : (
              <>
                <Cloud className="h-3 w-3 opacity-60" />
                Автосохранение
              </>
            )}
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-money transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <Card className="surface border-border/80">
        <CardContent className="p-6 sm:p-8 space-y-5">
          <div className="space-y-2">
            <h2 className="font-display text-xl sm:text-2xl font-semibold tracking-tight leading-snug">
              {q.title}
              {q.required ? <span className="text-danger ml-0.5">*</span> : null}
            </h2>
            {q.subtitle ? (
              <p className="text-sm text-muted-foreground leading-relaxed">{q.subtitle}</p>
            ) : null}
          </div>

          {q.multiline ? (
            <Textarea
              rows={4}
              value={value}
              onChange={(e) => handleChange(e.target.value)}
              placeholder={q.placeholder}
              className="text-base resize-none min-h-[120px]"
              autoFocus
            />
          ) : (
            <Input
              value={value}
              onChange={(e) => handleChange(e.target.value)}
              placeholder={q.placeholder}
              className="text-base h-12"
              autoFocus
            />
          )}

          {q.examples && q.examples.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {q.examples.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  className="chip chip-primary text-[11px] cursor-pointer hover:bg-primary/20 transition-colors"
                  onClick={() => handleChange(ex)}
                >
                  {ex}
                </button>
              ))}
            </div>
          ) : null}

          <div className="pt-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground -ml-2"
              onClick={loadHint}
              disabled={hintLoading}
            >
              {hintLoading ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-1.5 h-4 w-4 text-primary" />
              )}
              Подсказка
            </Button>
            {hintOpen && hintText ? (
              <div
                className={cn(
                  "mt-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5 text-sm text-foreground/90 leading-relaxed",
                )}
              >
                {hintText}
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          disabled={index === 0}
          onClick={() => setIndexSafe(index - 1)}
        >
          Назад
        </Button>
        <div className="flex items-center gap-2">
          {!q.required ? (
            <Button type="button" variant="ghost" onClick={handleSkip}>
              Пропустить
            </Button>
          ) : null}
          <Button
            type="button"
            className="bg-gradient-money text-primary-foreground min-w-[120px]"
            onClick={handleNext}
          >
            {index < questions.length - 1 ? "Дальше" : "Готово"}
          </Button>
        </div>
      </div>

      <p className="text-center text-[11px] text-muted-foreground">
        Можно закрыть вкладку — ответы сохранятся. Вернитесь через «Проекты» → продолжить квиз.
      </p>
    </div>
  );
}

export function quizValuesFromFocus(funnel: {
  productName: string;
  productDescription: string;
  averagePrice: string;
  trafficSource: string;
  landingUrl: string;
  targetAudience: string;
  funnelGoal: string;
  currentProblem: string;
}): Record<string, string> {
  return {
    productName: funnel.productName,
    productDescription: funnel.productDescription,
    averagePrice: funnel.averagePrice,
    trafficSource: funnel.trafficSource,
    landingUrl: funnel.landingUrl,
    targetAudience: funnel.targetAudience,
    funnelGoal: funnel.funnelGoal,
    currentProblem: funnel.currentProblem,
  };
}

export function focusPatchFromValues(values: Record<string, string>): Partial<{
  productName: string;
  productDescription: string;
  averagePrice: string;
  trafficSource: string;
  landingUrl: string;
  targetAudience: string;
  funnelGoal: string;
  currentProblem: string;
}> {
  return {
    productName: values.productName?.trim() ?? "",
    productDescription: values.productDescription?.trim() ?? "",
    averagePrice: values.averagePrice?.trim() ?? "",
    trafficSource: values.trafficSource?.trim() ?? "",
    landingUrl: values.landingUrl?.trim() ?? "",
    targetAudience: values.targetAudience?.trim() ?? "",
    funnelGoal: values.funnelGoal?.trim() ?? "",
    currentProblem: values.currentProblem?.trim() ?? "",
  };
}

export function requiredQuestionIds(questions: QuizQuestion[]): string[] {
  return questions.filter((q) => q.required).map((q) => q.id);
}
