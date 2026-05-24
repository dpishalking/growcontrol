import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { useAppData } from "@/context/AppDataContext";
import { getBillingPlans, getCreditPacks } from "@/services/billingService";
import { PlanCard } from "@/features/billing/PlanCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/utils/format";
import type { PlanId } from "@/types/user";

export default function BillingPage() {
  const { user, currentPlan, setPlan, buyCredits } = useAppData();
  const plans = getBillingPlans();
  const packs = getCreditPacks();

  const handlePlan = (planId: PlanId) => {
    setPlan(planId);
    toast.success(`Тариф ${planId} активирован (mock)`);
  };

  const handlePack = (packId: string) => {
    if (buyCredits(packId)) toast.success("Кредиты начислены (mock)");
  };

  return (
    <>
      <PageHeader
        title="Тариф и кредиты"
        subtitle="Оплата пока не подключена — mock для проверки лимитов и UX."
        backTo="/dashboard"
      />

      <Card className="mb-6 border-border/60">
        <CardContent className="p-4 flex flex-wrap gap-4 justify-between items-center">
          <div>
            <p className="text-sm text-muted-foreground">Текущий баланс</p>
            <p className="font-display text-2xl font-bold tabular-nums">{user.credits} кредитов</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">План</p>
            <p className="font-medium">{currentPlan.name}</p>
          </div>
        </CardContent>
      </Card>

      <h2 className="font-display text-lg font-semibold mb-3">Тарифы</h2>
      <div className="grid gap-4 sm:grid-cols-3 mb-8">
        {plans.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            current={user.plan === plan.id}
            onSelect={() => handlePlan(plan.id)}
          />
        ))}
      </div>

      <h2 className="font-display text-lg font-semibold mb-3">Докупка кредитов</h2>
      <div className="grid gap-3 sm:grid-cols-3">
        {packs.map((pack) => (
          <Card key={pack.id} className="border-border/60">
            <CardContent className="p-4 space-y-3">
              <div>
                <p className="font-medium">{pack.label}</p>
                <p className="text-xl font-bold tabular-nums">{formatCurrency(pack.price)}</p>
              </div>
              <Button variant="outline" className="w-full" onClick={() => handlePack(pack.id)}>
                Купить (mock)
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
