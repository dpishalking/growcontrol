import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { BillingPlan } from "@/types/billing";
import { formatCurrency } from "@/utils/format";
import { cn } from "@/lib/utils";

type Props = {
  plan: BillingPlan;
  current: boolean;
  onSelect: () => void;
};

export function PlanCard({ plan, current, onSelect }: Props) {
  return (
    <Card
      className={cn(
        "border-border/60 flex flex-col",
        plan.highlighted && "border-primary/40 ring-1 ring-primary/20",
        current && "bg-primary/5",
      )}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-display">{plan.name}</CardTitle>
          {current ? <Badge>Текущий</Badge> : null}
          {plan.highlighted && !current ? <Badge variant="secondary">Популярный</Badge> : null}
        </div>
        <p className="text-2xl font-bold tabular-nums">
          {plan.priceMonthly === 0 ? "Бесплатно" : formatCurrency(plan.priceMonthly)}
          {plan.priceMonthly > 0 ? <span className="text-sm font-normal text-muted-foreground"> / мес</span> : null}
        </p>
      </CardHeader>
      <CardContent className="flex-1 space-y-2">
        <p className="text-xs text-muted-foreground">
          {plan.creditsIncluded} генераций · до {plan.maxProjects} проектов
        </p>
        <ul className="space-y-1.5">
          {plan.features.map((f) => (
            <li key={f} className="flex gap-2 text-sm">
              <Check className="h-4 w-4 shrink-0 text-money" />
              {f}
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter>
        <Button
          className="w-full"
          variant={current ? "outline" : "default"}
          disabled={current}
          onClick={onSelect}
        >
          {current ? "Активен" : "Выбрать (mock)"}
        </Button>
      </CardFooter>
    </Card>
  );
}
