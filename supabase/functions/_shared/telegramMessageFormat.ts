/** Форматирование Telegram-сообщений GrowControl (HTML). */

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function truncate(text: string, max: number): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function severityEmoji(severity: string): string {
  if (severity === "critical") return "🔴";
  if (severity === "important") return "🟡";
  return "⚪";
}

function section(emoji: string, title: string): string {
  return `${emoji} <b>${title}</b>`;
}

function stripIfPrefix(text: string): string {
  return text.replace(/^если\s+/i, "").trim();
}

type MetricRow = {
  name: string;
  status: string;
  achievementPercent: number | null;
  revenueImpact: number;
};

type AuditRow = {
  diagnosis?: { mainProblem?: string };
  problems?: { severity: string; title: string; moneyImpact?: string; impactScore: number }[];
  stageBlocks?: { stageLabel: string; status: string; problem: string; howToFix?: string }[];
  funnel?: {
    mainLeak?: string;
    stages?: { name: string; percent: number; dropReason?: string; isMainLeak?: boolean }[];
  };
  crossMaterialMismatches?: { severity: string; title: string; fix?: string }[];
};

function formatStageLines(audit: AuditRow): string[] {
  if (audit.funnel?.stages?.length) {
    const leaks = audit.funnel.stages.filter((s) => s.isMainLeak);
    const pool = leaks.length
      ? leaks
      : audit.funnel.stages.slice().sort((a, b) => a.percent - b.percent).slice(0, 2);
    return pool.map((s) => {
      const leak = s.isMainLeak ? " ⚠️" : "";
      const lines = [`🔻 ${escapeHtml(truncate(s.name, 22))} — <b>${s.percent}%</b>${leak}`];
      if (s.dropReason) {
        lines.push(`   ↳ ${escapeHtml(truncate(s.dropReason, 95))}`);
      }
      return lines.join("\n");
    });
  }

  const bad = (audit.stageBlocks ?? []).filter((s) =>
    s.status === "critical" || s.status === "bad" || s.status === "weak"
  );
  const pool = bad.length ? bad.slice(0, 3) : (audit.stageBlocks ?? []).slice(0, 1);
  return pool.map((s) =>
    `${severityEmoji(s.status === "weak" ? "important" : "critical")} ${escapeHtml(truncate(s.stageLabel, 20))}\n   ↳ ${escapeHtml(truncate(s.problem, 95))}`,
  );
}

function formatMaterialFeedback(audit: AuditRow): string[] {
  const lines: string[] = [];

  for (const s of (audit.stageBlocks ?? [])
    .filter((s) =>
      (s.status === "critical" || s.status === "bad" || s.status === "weak") &&
      (s.howToFix?.trim() || s.problem?.trim()),
    )
    .slice(0, 3)) {
    const fix = (s.howToFix ?? s.problem).trim();
    lines.push(
      `${severityEmoji(s.status === "weak" ? "important" : "critical")} <b>${escapeHtml(truncate(s.stageLabel, 18))}</b>\n   💡 ${escapeHtml(truncate(fix, 95))}`,
    );
  }

  for (const m of (audit.crossMaterialMismatches ?? [])
    .filter((m) => m.severity === "critical" || m.severity === "important")
    .slice(0, 2)) {
    lines.push(`${severityEmoji(m.severity)} ${escapeHtml(truncate(m.title, 60))}`);
    if (m.fix?.trim()) {
      lines.push(`   💡 ${escapeHtml(truncate(m.fix, 90))}`);
    }
  }

  return lines;
}

function formatProblems(audit: AuditRow): string[] {
  const sorted = [...(audit.problems ?? [])].sort((a, b) => {
    const rank = (s: string) => (s === "critical" ? 0 : s === "important" ? 1 : 2);
    return rank(a.severity) - rank(b.severity) || b.impactScore - a.impactScore;
  });
  const top = sorted.filter((p) => p.severity === "critical" || p.severity === "important").slice(0, 3);
  if (!top.length && sorted.length) top.push(sorted[0]!);

  return top.map((p) => {
    const lines = [`${severityEmoji(p.severity)} ${escapeHtml(truncate(p.title, 65))}`];
    if (p.moneyImpact?.trim()) {
      lines.push(`   ↳ ${escapeHtml(truncate(p.moneyImpact, 55))}`);
    }
    return lines.join("\n");
  });
}

function findBottleneck(metrics: MetricRow[]): MetricRow | null {
  const red = metrics.filter((m) => m.status === "red");
  const pool = red.length ? red : metrics.filter((m) => m.status === "yellow");
  if (!pool.length) return null;
  return pool.slice().sort((a, b) => b.revenueImpact - a.revenueImpact)[0] ?? null;
}

export function formatAuditDigestTelegram(args: {
  projectName: string;
  funnelName: string;
  reportUrl: string;
  audit: AuditRow;
  metrics: MetricRow[];
}): string {
  const { projectName, funnelName, reportUrl, audit, metrics } = args;
  const dateStr = new Date().toLocaleDateString("ru-RU", { day: "numeric", month: "short" });

  const lines: string[] = [
    `📊 <b>Аудит воронки</b>`,
    `📁 ${escapeHtml(projectName)} · 🎯 ${escapeHtml(funnelName)} · 📅 ${dateStr}`,
    ``,
  ];

  const bottleneck = findBottleneck(metrics);
  if (bottleneck) {
    const pct =
      bottleneck.achievementPercent != null
        ? ` · <b>${Math.round(bottleneck.achievementPercent)}%</b> от плана`
        : "";
    lines.push(section("🎯", "Главный ограничитель"), `🔴 ${escapeHtml(bottleneck.name)}${pct}`, ``);
  } else if (audit.diagnosis?.mainProblem) {
    lines.push(
      section("🎯", "Главная проблема"),
      escapeHtml(truncate(audit.diagnosis.mainProblem, 160)),
      ``,
    );
  }

  const stageLines = formatStageLines(audit);
  if (stageLines.length) {
    lines.push(section("📉", "Где теряем в воронке"), ...stageLines, ``);
  }

  const redMetrics = metrics.filter((m) => m.status === "red").slice(0, 3);
  if (redMetrics.length) {
    lines.push(
      section("📊", "Метрики ниже плана"),
      ...redMetrics.map((m) => {
        const pct = m.achievementPercent != null ? ` · <b>${Math.round(m.achievementPercent)}%</b>` : "";
        return `🔴 ${escapeHtml(truncate(m.name, 30))}${pct}`;
      }),
      ``,
    );
  }

  const problems = formatProblems(audit);
  if (problems.length) {
    lines.push(section("⚠️", "Ключевые проблемы"), ...problems, ``);
  }

  const materialFeedback = formatMaterialFeedback(audit);
  if (materialFeedback.length) {
    lines.push(section("📝", "Материалы — что поправить"), ...materialFeedback, ``);
  }

  if (lines.length <= 3) {
    lines.push(`✅ Критичных узких мест не выявлено.`, ``);
  }

  lines.push(`🔗 <a href="${escapeHtml(reportUrl)}">Открыть полный аудит в GrowControl →</a>`);

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

export function formatTestStartedTelegram(args: {
  projectName: string;
  title: string;
  ifChange: string;
  thenMetric: string;
  metricName: string;
  funnelStage: string;
  endDate: string;
  owner?: string;
  budget?: string;
}): string {
  const ifPart = stripIfPrefix(args.ifChange);
  const thenPart = args.thenMetric.trim() || "—";

  const lines: string[] = [
    `🚀 <b>Тест запущен</b>`,
    `📁 ${escapeHtml(args.projectName)}`,
    ``,
    `🧪 <b>${escapeHtml(truncate(args.title, 120))}</b>`,
    ``,
    section("💡", "Гипотеза"),
    `Если ${escapeHtml(truncate(ifPart, 100))}`,
    `→ ${escapeHtml(truncate(thenPart, 100))}`,
    ``,
    `📈 Метрика: <b>${escapeHtml(args.metricName || "—")}</b>`,
    `🎯 Этап: ${escapeHtml(args.funnelStage || "—")}`,
    `📅 Дедлайн: <b>${escapeHtml(args.endDate)}</b>`,
  ];

  if (args.owner?.trim()) {
    lines.push(`👤 Владелец: ${escapeHtml(args.owner.trim())}`);
  }
  if (args.budget?.trim()) {
    lines.push(`💰 Бюджет: ${escapeHtml(args.budget.trim())}`);
  }

  return lines.join("\n");
}

const DECISION_LABELS: Record<string, { emoji: string; label: string }> = {
  scale: { emoji: "✅", label: "Масштабировать" },
  iterate: { emoji: "🔄", label: "Доработать" },
  rerun: { emoji: "🔁", label: "Повторить" },
  stop: { emoji: "🛑", label: "Стоп" },
  archive: { emoji: "📦", label: "В архив" },
  pending: { emoji: "⏳", label: "Без решения" },
};

function decisionLabel(decision: string): string {
  const d = DECISION_LABELS[decision] ?? { emoji: "📋", label: decision };
  return `${d.emoji} ${d.label}`;
}

export function formatTestFinishedTelegram(args: {
  projectName: string;
  funnelName?: string;
  title: string;
  metricName: string;
  beforeValue: string;
  afterValue: string;
  result: string;
  decision: string;
  owner?: string;
}): string {
  const lines: string[] = [
    `🏁 <b>Тест завершён</b>`,
    `📁 ${escapeHtml(args.projectName)}`,
  ];
  if (args.funnelName?.trim()) {
    lines.push(`🎯 ${escapeHtml(args.funnelName.trim())}`);
  }
  lines.push(
    ``,
    `🧪 <b>${escapeHtml(truncate(args.title, 120))}</b>`,
    ``,
    `📈 Метрика: <b>${escapeHtml(args.metricName || "—")}</b>`,
    `📊 До: <b>${escapeHtml(args.beforeValue?.trim() || "—")}</b> → После: <b>${escapeHtml(args.afterValue?.trim() || "—")}</b>`,
  );
  if (args.result?.trim()) {
    lines.push(`📝 ${escapeHtml(truncate(args.result.trim(), 160))}`);
  }
  lines.push(``, `🎯 Решение: <b>${escapeHtml(decisionLabel(args.decision))}</b>`);
  if (args.owner?.trim()) {
    lines.push(`👤 Владелец: ${escapeHtml(args.owner.trim())}`);
  }
  return lines.join("\n");
}

export function formatDeadlineReminderTelegram(args: {
  projectName: string;
  title: string;
  metricName?: string;
  endDate: string;
  owner?: string;
  kind: "day_before" | "due_day" | "overdue";
}): string {
  const kindHeader =
    args.kind === "day_before"
      ? "⏰ Дедлайн теста завтра"
      : args.kind === "due_day"
        ? "📅 Дедлайн теста сегодня"
        : "⚠️ Дедлайн теста просрочен";

  const lines: string[] = [
    kindHeader,
    `📁 ${escapeHtml(args.projectName)}`,
    ``,
    `🧪 <b>${escapeHtml(truncate(args.title, 120))}</b>`,
    `📅 ${escapeHtml(args.endDate)}`,
  ];
  if (args.metricName?.trim()) {
    lines.push(`📈 Метрика: ${escapeHtml(args.metricName.trim())}`);
  }
  if (args.owner?.trim()) {
    lines.push(`👤 Владелец: ${escapeHtml(args.owner.trim())}`);
  }
  lines.push(``, `💡 Зафиксируйте результат в GrowControl → План тестов`);
  return lines.join("\n");
}

export function formatHypothesisBacklogTelegram(args: {
  projectName: string;
  funnelName: string;
  metricName: string;
  items: { title: string; priorityScore?: number }[];
}): string {
  const lines: string[] = [
    `📋 <b>Гипотезы в бэклоге</b>`,
    `📁 ${escapeHtml(args.projectName)} · 🎯 ${escapeHtml(args.funnelName)}`,
    `📈 Метрика: <b>${escapeHtml(args.metricName)}</b>`,
    ``,
  ];
  for (const item of args.items.slice(0, 5)) {
    const score = item.priorityScore != null ? ` · ⭐ ${item.priorityScore.toFixed(1)}` : "";
    lines.push(`• ${escapeHtml(truncate(item.title, 90))}${score}`);
  }
  if (args.items.length > 5) {
    lines.push(`… и ещё ${args.items.length - 5}`);
  }
  lines.push(``, `▶️ Следующий шаг: План тестов в GrowControl`);
  return lines.join("\n");
}

export function formatMetricRedTelegram(args: {
  projectName: string;
  funnelName: string;
  metricName: string;
  actualValue?: string | null;
  plannedValue?: string | null;
  achievementPercent?: number | null;
}): string {
  const pct =
    args.achievementPercent != null
      ? ` · <b>${Math.round(args.achievementPercent)}%</b> от плана`
      : "";
  const lines: string[] = [
    `🔴 <b>Метрика ниже плана</b>`,
    `📁 ${escapeHtml(args.projectName)} · 🎯 ${escapeHtml(args.funnelName)}`,
    ``,
    `📉 <b>${escapeHtml(args.metricName)}</b>${pct}`,
  ];
  if (args.actualValue != null || args.plannedValue != null) {
    lines.push(
      `Факт: <b>${escapeHtml(String(args.actualValue ?? "—"))}</b> · План: <b>${escapeHtml(String(args.plannedValue ?? "—"))}</b>`,
    );
  }
  lines.push(``, `💡 Проверьте гипотезы и материалы по этой метрике`);
  return lines.join("\n");
}

export function formatMaterialsCompleteTelegram(args: {
  projectName: string;
  funnelName: string;
  covered: number;
  total: number;
  auditUrl?: string;
}): string {
  const lines: string[] = [
    `✅ <b>Материалы собраны</b>`,
    `📁 ${escapeHtml(args.projectName)} · 🎯 ${escapeHtml(args.funnelName)}`,
    ``,
    `📎 Чеклист: <b>${args.covered}/${args.total}</b>`,
    ``,
    `🚀 Можно запускать AI-аудит воронки`,
  ];
  if (args.auditUrl?.trim()) {
    lines.push(``, `🔗 <a href="${escapeHtml(args.auditUrl.trim())}">Открыть аудит в GrowControl →</a>`);
  }
  return lines.join("\n");
}

export function formatAuditStaleTelegram(args: {
  projectName: string;
  funnelName: string;
  changes: string[];
  auditUrl?: string;
}): string {
  const lines: string[] = [
    `🔄 <b>Аудит устарел</b>`,
    `📁 ${escapeHtml(args.projectName)} · 🎯 ${escapeHtml(args.funnelName)}`,
    ``,
    `Изменилось:`,
    ...args.changes.slice(0, 4).map((c) => `• ${escapeHtml(c)}`),
    ``,
    `💡 Перезапустите AI-аудит, чтобы обновить выводы`,
  ];
  if (args.auditUrl?.trim()) {
    lines.push(``, `🔗 <a href="${escapeHtml(args.auditUrl.trim())}">Запустить аудит →</a>`);
  }
  return lines.join("\n");
}
