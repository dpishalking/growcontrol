import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { HelpCircle, Plus, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppData } from "@/context/AppDataContext";
import { WizardLayout } from "@/features/wizard/WizardLayout";
import { FunnelTypeCard, FunnelTypeStagePreview } from "@/features/wizard/FunnelTypeCard";
import { getFunnelTypeVisual } from "@/data/funnelTypes/visuals";
import {
  FUNNEL_TYPE_CATALOG,
  getFunnelTypeTemplate,
  suggestFunnelTypeFromQuiz,
} from "@/data/funnelTypes/catalog";
import type { Funnel } from "@/types/funnel";
import type { FunnelStageDefinition, FunnelTypeId } from "@/types/funnelType";

const QUIZ_Q1 = [
  { value: "lead", label: "Оставить заявку" },
  { value: "register", label: "Зарегистрироваться" },
  { value: "quiz", label: "Пройти квиз" },
  { value: "bot", label: "Подписаться в бот" },
  { value: "buy", label: "Купить сразу" },
  { value: "visit", label: "Записаться на визит" },
];

const QUIZ_Q2 = [
  { value: "site", label: "На сайте" },
  { value: "call", label: "На звонке" },
  { value: "webinar", label: "На вебинаре" },
  { value: "messenger", label: "В мессенджере" },
  { value: "offline", label: "В офлайн-точке" },
  { value: "delivery", label: "После доставки" },
];

const QUIZ_Q3 = [
  { value: "payment", label: "Оплата" },
  { value: "buyout", label: "Выкуп" },
  { value: "subscription", label: "Подписка" },
  { value: "visit", label: "Визит" },
  { value: "contract", label: "Договор" },
  { value: "renewal", label: "Повторное продление" },
];

export function FunnelTypeStep({ funnel }: { funnel: Funnel | null }) {
  const { projectId } = useParams<{ projectId: string }>();
  const nav = useNavigate();
  const { applyFunnelTypeAction, createFunnelDraft, setFunnelStep } = useAppData();

  const [selected, setSelected] = useState<FunnelTypeId | null>(funnel?.funnelTypeId ?? null);
  const [showQuiz, setShowQuiz] = useState(false);
  const [quiz, setQuiz] = useState({ firstAction: "", salePoint: "", moneyEvent: "" });
  const [customStages, setCustomStages] = useState<FunnelStageDefinition[]>(
    funnel?.funnelTypeId === "custom" && funnel.stages.length
      ? funnel.stages
      : getFunnelTypeTemplate("custom").requiredStages,
  );

  const suggested = useMemo(() => {
    if (!quiz.firstAction || !quiz.salePoint || !quiz.moneyEvent) return null;
    return suggestFunnelTypeFromQuiz(quiz);
  }, [quiz]);

  const handleApplySuggestion = () => {
    if (!suggested) return;
    setSelected(suggested);
    setShowQuiz(false);
    toast.success("Подобрали тип воронки — проверьте и подтвердите");
  };

  const handleNext = () => {
    if (!projectId) {
      toast.error("Нет проекта");
      return;
    }
    if (!selected) {
      toast.error("Выберите тип воронки");
      return;
    }
    if (selected === "custom" && customStages.filter((s) => s.label.trim()).length < 3) {
      toast.error("Добавьте минимум 3 этапа для кастомной воронки");
      return;
    }

    let targetFunnel = funnel;
    if (!targetFunnel) {
      targetFunnel = createFunnelDraft(projectId);
    }

    const stages =
      selected === "custom"
        ? customStages
            .filter((s) => s.label.trim())
            .map((s, i) => ({
              id: s.id || `stage_${i + 1}`,
              label: s.label.trim(),
            }))
        : undefined;

    applyFunnelTypeAction(targetFunnel.id, selected, stages);
    setFunnelStep(targetFunnel.id, 2);
    toast.success("Тип выбран — ответьте на вопросы по фокусу");
    nav(`/projects/${projectId}/funnels/${targetFunnel.id}/wizard/focus`, {
      replace: !funnel,
    });
  };

  const updateCustomStage = (index: number, label: string) => {
    setCustomStages((prev) =>
      prev.map((s, i) => (i === index ? { ...s, label } : s)),
    );
  };

  const addCustomStage = () => {
    setCustomStages((prev) => [
      ...prev,
      { id: `custom_${prev.length + 1}`, label: "" },
    ]);
  };

  const removeCustomStage = (index: number) => {
    if (customStages.length <= 3) {
      toast.error("Минимум 3 этапа");
      return;
    }
    setCustomStages((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <WizardLayout
      funnel={funnel}
      activeStep="funnel-type"
      onBack={() => nav(`/projects/${projectId}`)}
      onNext={handleNext}
      nextLabel="К фокусу воронки"
      nextDisabled={!selected}
    >
      <div className="space-y-6">
        <div className="space-y-2">
          <h2 className="font-display text-xl font-semibold tracking-tight">Тип воронки</h2>
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
              Сначала шаблон — потом квиз задаст только релевантные вопросы про продукт, канал и цель.
            </p>
            <Button variant="outline" size="sm" onClick={() => setShowQuiz((v) => !v)} className="shrink-0">
              <HelpCircle className="mr-1 h-4 w-4" />
              Не знаю, какой тип
            </Button>
          </div>
        </div>

        {showQuiz ? (
          <Card className="border-primary/30 bg-primary/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Помощник выбора типа
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <QuizField
                label="1. Что является первым целевым действием?"
                value={quiz.firstAction}
                options={QUIZ_Q1}
                onChange={(v) => setQuiz((q) => ({ ...q, firstAction: v }))}
              />
              <QuizField
                label="2. Где происходит основная продажа?"
                value={quiz.salePoint}
                options={QUIZ_Q2}
                onChange={(v) => setQuiz((q) => ({ ...q, salePoint: v }))}
              />
              <QuizField
                label="3. Что является главным денежным событием?"
                value={quiz.moneyEvent}
                options={QUIZ_Q3}
                onChange={(v) => setQuiz((q) => ({ ...q, moneyEvent: v }))}
              />
              {suggested ? (
                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <span className="text-sm">Рекомендуем:</span>
                  <Badge variant="secondary">{getFunnelTypeTemplate(suggested).name}</Badge>
                  <Button size="sm" onClick={handleApplySuggestion}>
                    Выбрать
                  </Button>
                </div>
              ) : null}
            </CardContent>
          </Card>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          {FUNNEL_TYPE_CATALOG.map((type) => (
            <FunnelTypeCard
              key={type.id}
              type={type}
              active={selected === type.id}
              onSelect={() => setSelected(type.id)}
            />
          ))}
        </div>

        {selected === "custom" ? (
          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Этапы кастомной воронки</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-xs text-muted-foreground mb-3">
                Обязательно: источник трафика, точка входа, целевое действие, точка продажи, финансовый
                результат. Можно добавить свои этапы и переименовать.
              </p>
              {customStages.map((stage, index) => (
                <div key={stage.id + index} className="flex gap-2">
                  <Input
                    value={stage.label}
                    onChange={(e) => updateCustomStage(index, e.target.value)}
                    placeholder={`Этап ${index + 1}`}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeCustomStage(index)}
                    aria-label="Удалить этап"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addCustomStage}>
                <Plus className="mr-1 h-4 w-4" />
                Добавить этап
              </Button>
            </CardContent>
          </Card>
        ) : selected ? (
          <section className="rounded-2xl border border-border/60 bg-card/15 overflow-hidden">
            <div className="border-b border-border/50 bg-muted/15 px-4 py-4 sm:px-5">
              <h3 className="font-display text-lg font-bold tracking-tight">Этапы шаблона</h3>
              <p className="text-xs text-muted-foreground mt-1">
                {getFunnelTypeTemplate(selected).name}
              </p>
            </div>
            <div className="p-4 sm:p-5">
              <FunnelTypeStagePreview
                stages={getFunnelTypeTemplate(selected).requiredStages}
                accentClass={getFunnelTypeVisual(selected).iconClass}
              />
            </div>
          </section>
        ) : null}
      </div>
    </WizardLayout>
  );
}

function QuizField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder="Выберите ответ" />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
