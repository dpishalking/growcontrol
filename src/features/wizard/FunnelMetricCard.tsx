import { useEffect, useId, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion, useAnimationControls } from "framer-motion";
import { ChevronDown, Sparkles, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { getEffectivePlan } from "@/utils/metricBenchmarks";
import { evaluateMetric, getMetricAchievementHint, getMetricBarFillPercent } from "@/utils/funnelDiagnostics";
import type { FunnelMetric, MetricStatus } from "@/types/funnelMetric";

const STATUS_META: Record<
  MetricStatus,
  { label: string; stripe: string; surface: string; bar: string; glow: string }
> = {
  green: {
    label: "В норме",
    stripe: "bg-success",
    surface: "border-success-soft bg-success-soft/40",
    bar: "bg-success",
    glow: "shadow-[0_0_0_1px_hsl(var(--success)/0.15),0_8px_24px_-8px_hsl(var(--success)/0.25)]",
  },
  yellow: {
    label: "Внимание",
    stripe: "bg-warning",
    surface: "border-warning-soft bg-warning-soft/40",
    bar: "bg-warning",
    glow: "shadow-[0_0_0_1px_hsl(var(--warning)/0.15),0_8px_24px_-8px_hsl(var(--warning)/0.25)]",
  },
  red: {
    label: "Красная зона",
    stripe: "bg-danger",
    surface: "border-danger-soft bg-danger-soft/40",
    bar: "bg-danger",
    glow: "shadow-[0_0_0_1px_hsl(var(--danger)/0.15),0_8px_24px_-8px_hsl(var(--danger)/0.25)]",
  },
  no_data: {
    label: "Заполните факт",
    stripe: "bg-muted-foreground/30",
    surface: "border-border/50 bg-card/40",
    bar: "bg-primary/60",
    glow: "shadow-[0_0_0_1px_hsl(var(--primary)/0.12),0_8px_24px_-12px_hsl(var(--foreground)/0.08)]",
  },
  unreliable: {
    label: "Низкая достоверность",
    stripe: "bg-info/70",
    surface: "border-border/50 bg-card/40",
    bar: "bg-muted-foreground/40",
    glow: "",
  },
};

function formatDisplay(value: number | null | undefined): string {
  if (value == null) return "";
  return Number.isInteger(value)
    ? String(value)
    : String(Math.round(value * 100) / 100).replace(".", ",");
}

function parseNum(value: string): number | null {
  if (value.trim() === "") return null;
  const n = Number(value.replace(",", ".").replace(/\s+/g, ""));
  return Number.isFinite(n) ? n : null;
}

function formatPtf(value: number): string {
  if (value >= 1000) return `${Math.round(value)}`;
  if (value >= 100) return `${Math.round(value)}`;
  if (value >= 10) return `${Math.round(value * 10) / 10}`.replace(".", ",");
  return `${Math.round(value * 10) / 10}`.replace(".", ",");
}

function ptfTone(status: MetricStatus): string {
  switch (status) {
    case "green":
      return "text-success";
    case "yellow":
      return "text-warning";
    case "red":
      return "text-danger";
    default:
      return "text-muted-foreground";
  }
}

function computeLiveMetric(
  metric: FunnelMetric,
  planDraft: string,
  factDraft: string,
): FunnelMetric {
  const plannedFromDraft = parseNum(planDraft);
  const actualFromDraft = parseNum(factDraft);
  return {
    ...metric,
    plannedValue: planDraft.trim() !== "" ? plannedFromDraft : metric.plannedValue,
    actualValue: factDraft.trim() !== "" ? actualFromDraft : metric.actualValue,
  };
}

const SPARK_ANGLES = Array.from({ length: 8 }, (_, i) => (i / 8) * Math.PI * 2);

const FIELD_ACCENT = {
  plan: {
    ring: "hsl(var(--primary) / 0.55)",
    ringSoft: "hsl(var(--primary) / 0.12)",
    ripple: "bg-primary/30",
    labelActive: "text-primary",
    shadow: "0 12px 32px -12px hsl(var(--primary) / 0.45)",
    caret: "bg-primary",
  },
  fact: {
    ring: "hsl(var(--accent) / 0.55)",
    ringSoft: "hsl(var(--accent) / 0.12)",
    ripple: "bg-accent/30",
    labelActive: "text-accent",
    shadow: "0 12px 32px -12px hsl(var(--accent) / 0.4)",
    caret: "bg-accent",
  },
} as const;

type Ripple = { id: number; x: number; y: number };

type ValueFieldProps = {
  label: string;
  value: string;
  unit: string;
  placeholder: string;
  hint?: string;
  variant: keyof typeof FIELD_ACCENT;
  active: boolean;
  onChange: (v: string) => void;
  onFocus: () => void;
  onBlur: () => void;
};

function ValueField({
  label,
  value,
  unit,
  placeholder,
  hint,
  variant,
  active,
  onChange,
  onFocus,
  onBlur,
}: ValueFieldProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const reduceMotion = useReducedMotion();
  const accent = FIELD_ACCENT[variant];
  const valueControls = useAnimationControls();
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const [focusBurst, setFocusBurst] = useState(0);
  const [typingTick, setTypingTick] = useState(0);

  useEffect(() => {
    if (reduceMotion || typingTick === 0) return;
    void valueControls.start({
      scale: [1, 1.055, 1],
      transition: { duration: 0.22, ease: [0.34, 1.4, 0.64, 1] },
    });
  }, [typingTick, valueControls, reduceMotion]);

  const spawnRipple = (x: number, y: number) => {
    if (reduceMotion) return;
    const id = Date.now() + Math.random();
    setRipples((prev) => [...prev, { id, x, y }]);
    window.setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== id));
    }, 650);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("input")) return;
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    spawnRipple(e.clientX - rect.left, e.clientY - rect.top);
    inputRef.current?.focus();
  };

  const focusInput = () => {
    inputRef.current?.focus();
  };

  const handleFocus = () => {
    onFocus();
    setFocusBurst((n) => n + 1);
  };

  const handleChange = (next: string) => {
    onChange(next);
    setTypingTick((n) => n + 1);
  };

  return (
    <motion.div
      layout
      animate={
        reduceMotion
          ? undefined
          : active
            ? { scale: 1.025, y: -4 }
            : { scale: 1, y: 0 }
      }
      whileHover={reduceMotion ? undefined : active ? undefined : { scale: 1.012, y: -1 }}
      whileTap={reduceMotion ? undefined : { scale: 0.985 }}
      transition={{ type: "spring", stiffness: 480, damping: 26, mass: 0.7 }}
      className="relative"
      style={{ perspective: 800 }}
    >
      <AnimatePresence>
        {active && !reduceMotion ? (
          <motion.div
            key={`ring-${focusBurst}`}
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.25 }}
            className="pointer-events-none absolute -inset-px overflow-hidden rounded-xl"
            aria-hidden
          >
            <motion.div
              className="absolute -inset-full opacity-70"
              style={{
                background: `conic-gradient(from 0deg, transparent 0deg, ${accent.ring} 70deg, transparent 140deg, ${accent.ringSoft} 210deg, transparent 360deg)`,
              }}
              animate={{ rotate: 360 }}
              transition={{ duration: 2.8, repeat: Infinity, ease: "linear" }}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>

      <motion.div
        animate={
          reduceMotion
            ? undefined
            : active
              ? { boxShadow: accent.shadow }
              : { boxShadow: "0 0 0 0 transparent" }
        }
        transition={{ duration: 0.3 }}
        onPointerDown={handlePointerDown}
        className={cn(
          "relative z-[1] overflow-hidden rounded-xl border px-3 py-2.5 cursor-text select-none",
          active
            ? "border-transparent bg-background"
            : "border-border/40 bg-muted/30 hover:border-border/70 hover:bg-muted/45",
        )}
      >
        {ripples.map((r) => (
          <motion.span
            key={r.id}
            className={cn("pointer-events-none absolute rounded-full", accent.ripple)}
            style={{ left: r.x, top: r.y, width: 10, height: 10, marginLeft: -5, marginTop: -5 }}
            initial={{ scale: 0, opacity: 0.55 }}
            animate={{ scale: 14, opacity: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            aria-hidden
          />
        ))}

        <AnimatePresence>
          {active && !reduceMotion ? (
            <>
              {SPARK_ANGLES.map((angle, i) => (
                <motion.span
                  key={`${focusBurst}-${i}`}
                  className="pointer-events-none absolute left-1/2 top-[58%] h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: accent.ring, marginLeft: -3, marginTop: -3 }}
                  initial={{ x: 0, y: 0, opacity: 0.9, scale: 1.2 }}
                  animate={{
                    x: Math.cos(angle) * (22 + (i % 3) * 6),
                    y: Math.sin(angle) * (16 + (i % 2) * 8),
                    opacity: 0,
                    scale: 0,
                  }}
                  transition={{ duration: 0.5, ease: "easeOut", delay: i * 0.025 }}
                  aria-hidden
                />
              ))}
            </>
          ) : null}
        </AnimatePresence>

        {active && !reduceMotion ? (
          <motion.div
            className="pointer-events-none absolute inset-0 opacity-[0.07]"
            style={{
              background: `linear-gradient(105deg, transparent 40%, ${accent.ring} 50%, transparent 60%)`,
              backgroundSize: "200% 100%",
            }}
            animate={{ backgroundPosition: ["200% 0%", "-200% 0%"] }}
            transition={{ duration: 1.6, ease: "easeInOut" }}
            aria-hidden
          />
        ) : null}

        <label htmlFor={inputId} className="block cursor-text" onClick={focusInput}>
          <motion.span
            animate={
              reduceMotion
                ? undefined
                : active
                  ? { y: -1, letterSpacing: "0.12em" }
                  : { y: 0, letterSpacing: "0.05em" }
            }
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            className={cn(
              "relative block text-[10px] font-semibold uppercase tracking-wider transition-colors duration-200",
              active ? accent.labelActive : "text-muted-foreground",
            )}
          >
            {label}
          </motion.span>

          <div className="relative mt-1 flex items-baseline gap-1.5">
            {!value && active ? (
              <motion.span
                className={cn("absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full", accent.caret)}
                animate={{ opacity: [1, 0.2, 1] }}
                transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut" }}
                aria-hidden
              />
            ) : null}

            <motion.div animate={valueControls} className="min-w-0 flex-1">
              <input
                id={inputId}
                ref={inputRef}
                type="text"
                value={value}
                onChange={(e) => handleChange(e.target.value)}
                onFocus={handleFocus}
                onBlur={onBlur}
                placeholder={placeholder}
                inputMode="decimal"
                className={cn(
                  "relative w-full bg-transparent text-xl font-semibold tabular-nums outline-none",
                  "placeholder:text-muted-foreground/40 transition-[color] duration-200",
                  active && "text-foreground",
                )}
              />
            </motion.div>

            {unit ? (
              <motion.span
                animate={
                  reduceMotion
                    ? undefined
                    : active
                      ? { scale: 1.08, opacity: 1 }
                      : { scale: 1, opacity: 0.7 }
                }
                transition={{ type: "spring", stiffness: 400, damping: 22 }}
                className="shrink-0 text-sm font-medium text-muted-foreground"
              >
                {unit}
              </motion.span>
            ) : null}
          </div>

          {hint ? (
            <motion.p
              initial={false}
              animate={active ? { opacity: 1, x: 0 } : { opacity: 0.85, x: 0 }}
              className="relative mt-0.5 truncate text-[10px] text-muted-foreground/80"
            >
              {hint}
            </motion.p>
          ) : null}
        </label>
      </motion.div>
    </motion.div>
  );
}

type Props = {
  metric: FunnelMetric;
  onPatch: (id: string, patch: Partial<FunnelMetric>) => void;
  onDelete: (id: string) => void;
};

export function FunnelMetricCard({ metric, onPatch, onDelete }: Props) {
  const [planDraft, setPlanDraft] = useState(() => formatDisplay(metric.plannedValue));
  const [factDraft, setFactDraft] = useState(() => formatDisplay(metric.actualValue));
  const [focusField, setFocusField] = useState<"plan" | "fact" | null>(null);
  const [ptfPop, setPtfPop] = useState(0);
  const ptfControls = useAnimationControls();
  const reduceMotion = useReducedMotion();
  const [detailsOpen, setDetailsOpen] = useState(
    Boolean(metric.comment.trim() || metric.dataSource.trim()),
  );

  useEffect(() => {
    setPlanDraft(formatDisplay(metric.plannedValue));
  }, [metric.plannedValue, metric.id]);

  useEffect(() => {
    setFactDraft(formatDisplay(metric.actualValue));
  }, [metric.actualValue, metric.id]);

  useEffect(() => {
    if (reduceMotion) return;
    setPtfPop((n) => n + 1);
  }, [planDraft, factDraft, reduceMotion]);

  useEffect(() => {
    if (reduceMotion || ptfPop === 0) return;
    void ptfControls.start({
      scale: [1, 1.12, 1],
      transition: { duration: 0.28, ease: [0.34, 1.5, 0.64, 1] },
    });
  }, [ptfPop, ptfControls, reduceMotion]);

  const liveMetric = useMemo(
    () => computeLiveMetric(metric, planDraft, factDraft),
    [metric, planDraft, factDraft],
  );

  const liveEval = useMemo(() => evaluateMetric(liveMetric), [liveMetric]);
  const ref = getEffectivePlan(liveMetric);
  const meta = STATUS_META[liveEval.status] ?? STATUS_META.no_data;

  const barPct = useMemo(
    () => getMetricBarFillPercent(liveMetric, ref.value, liveEval.evaluationKind),
    [liveMetric, ref.value, liveEval.evaluationKind],
  );

  const hint = getMetricAchievementHint(
    liveMetric,
    liveEval.achievementPercent,
    ref.source,
    liveEval.evaluationKind,
  );
  const hasValues = liveMetric.plannedValue != null || liveMetric.actualValue != null;
  const isFocused = focusField != null;
  const ptf = liveEval.achievementPercent;

  const planHint =
    ref.source === "benchmark" && liveMetric.plannedValue == null && ref.value != null
      ? `~${formatDisplay(ref.value)} эталон`
      : undefined;

  const commitPlan = () => {
    setFocusField(null);
    const parsed = parseNum(planDraft);
    if (parsed !== metric.plannedValue) onPatch(metric.id, { plannedValue: parsed });
  };

  const commitFact = () => {
    setFocusField(null);
    const parsed = parseNum(factDraft);
    if (parsed !== metric.actualValue) onPatch(metric.id, { actualValue: parsed });
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={cn(
        "group relative overflow-hidden rounded-xl border transition-all duration-300",
        hasValues || isFocused ? meta.surface : "border-border/50 bg-card/30",
        isFocused && meta.glow,
        "hover:border-border/80",
      )}
    >
      <div className={cn("absolute inset-y-0 left-0 w-1 transition-colors duration-300", meta.stripe)} />

      <div className="pl-4 pr-3 py-3 sm:pl-5 sm:pr-4 sm:py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="font-medium text-sm leading-tight">{metric.name}</h4>
              <AnimatePresence mode="wait">
                <motion.span
                  key={liveEval.status}
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.92 }}
                  transition={{ duration: 0.2 }}
                  className={cn(
                    "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium",
                    liveEval.status === "green" && "bg-success/15 text-success",
                    liveEval.status === "yellow" && "bg-warning/15 text-warning",
                    liveEval.status === "red" && "bg-danger/15 text-danger",
                    liveEval.status === "no_data" && "bg-muted text-muted-foreground",
                    liveEval.status === "unreliable" && "bg-info/15 text-info",
                  )}
                >
                  {meta.label}
                </motion.span>
              </AnimatePresence>
              {ref.source === "benchmark" && liveMetric.plannedValue == null ? (
                <span className="inline-flex items-center gap-0.5 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary">
                  <Sparkles className="h-3 w-3" />
                  vs эталон
                </span>
              ) : null}
            </div>
            {metric.period ? (
              <p className="mt-0.5 text-[11px] text-muted-foreground">{metric.period}</p>
            ) : null}
          </div>

          <div className="flex shrink-0 items-start gap-1">
            <div className="text-right px-1">
              <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">PTF</p>
              <motion.p
                animate={ptfControls}
                className={cn(
                  "font-display text-2xl font-bold tabular-nums leading-none mt-0.5",
                  ptf != null ? ptfTone(liveEval.status) : "text-muted-foreground/50",
                )}
              >
                {ptf != null ? (
                  <>
                    {formatPtf(ptf)}
                    <span className="text-sm font-semibold">%</span>
                  </>
                ) : (
                  "—"
                )}
              </motion.p>
            </div>

            <Button
              size="icon"
              variant="ghost"
              onClick={() => onDelete(metric.id)}
              aria-label="Удалить метрику"
              className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
          <ValueField
            label="План"
            variant="plan"
            value={planDraft}
            unit={metric.unit}
            placeholder="—"
            hint={planHint}
            active={focusField === "plan"}
            onChange={setPlanDraft}
            onFocus={() => setFocusField("plan")}
            onBlur={commitPlan}
          />
          <ValueField
            label="Факт"
            variant="fact"
            value={factDraft}
            unit={metric.unit}
            placeholder="Введите значение"
            active={focusField === "fact"}
            onChange={setFactDraft}
            onFocus={() => setFocusField("fact")}
            onBlur={commitFact}
          />
        </div>

        <div className="mt-3 space-y-1.5">
          <div className="relative h-1.5 overflow-hidden rounded-full bg-muted/80">
            <motion.div
              className={cn("absolute inset-y-0 left-0 rounded-full", meta.bar)}
              initial={false}
              animate={{ width: `${barPct}%` }}
              transition={{ type: "spring", stiffness: 120, damping: 20 }}
            />
            {liveMetric.actualValue != null && barPct > 0 && barPct < 100 ? (
              <motion.div
                className="absolute inset-y-0 w-8 bg-gradient-to-r from-transparent via-white/25 to-transparent"
                animate={{ x: ["-100%", "400%"] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "linear", repeatDelay: 1 }}
              />
            ) : null}
          </div>
          {hint ? (
            <p className="text-[11px] text-muted-foreground leading-snug">{hint}</p>
          ) : null}
        </div>

        <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen} className="mt-2">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center gap-1.5 rounded-md py-1.5 text-left text-[11px] text-muted-foreground transition-colors hover:text-foreground"
            >
              <ChevronDown
                className={cn("h-3.5 w-3.5 transition-transform duration-200", detailsOpen && "rotate-180")}
              />
              Заметка и источник
              {(metric.comment || metric.dataSource) && !detailsOpen ? (
                <span className="truncate text-foreground/70">· заполнено</span>
              ) : null}
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2 pt-1 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0">
            <Input
              value={metric.dataSource}
              onChange={(e) => onPatch(metric.id, { dataSource: e.target.value })}
              placeholder="Источник: Я.Метрика, рекламный кабинет, CRM"
              className="h-8 text-xs bg-muted/20 border-border/40"
            />
            <Textarea
              rows={2}
              value={metric.comment}
              onChange={(e) => onPatch(metric.id, { comment: e.target.value })}
              placeholder="Контекст, откуда цифры, что учесть"
              className="text-xs bg-muted/20 border-border/40 resize-none"
            />
          </CollapsibleContent>
        </Collapsible>
      </div>
    </motion.div>
  );
}
