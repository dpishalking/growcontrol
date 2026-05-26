import type { FunnelAuditReport } from "@/types/funnelAudit";
import type { FunnelMetric } from "@/types/funnelMetric";
import { buildDiagnostics } from "@/utils/funnelDiagnostics";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function truncate(text: string, max: number): string {
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

function formatRedMetric(m: FunnelMetric): string {
  const pct = m.achievementPercent != null ? ` · <b>${Math.round(m.achievementPercent)}%</b>` : "";
  return `🔴 ${escapeHtml(truncate(m.name, 30))}${pct}`;
}

function formatBottleneckStages(report: FunnelAuditReport): string[] {
  const lines: string[] = [];

  if (report.funnel?.stages?.length) {
    const leaks = report.funnel.stages.filter((s) => s.isMainLeak);
    const pool = leaks.length
      ? leaks
      : report.funnel.stages.slice().sort((a, b) => a.percent - b.percent).slice(0, 2);
    for (const s of pool) {
      const leak = s.isMainLeak ? " ⚠️" : "";
      lines.push(`🔻 ${escapeHtml(truncate(s.name, 22))} — <b>${s.percent}%</b>${leak}`);
      if (s.dropReason) {
        lines.push(`   ↳ ${escapeHtml(truncate(s.dropReason, 95))}`);
      }
    }
    if (report.funnel.mainLeak && !lines.some((l) => l.includes("⚠"))) {
      lines.push(`🔻 ${escapeHtml(truncate(report.funnel.mainLeak, 100))}`);
    }
    return lines;
  }

  if (report.stageBlocks?.length) {
    const bad = report.stageBlocks.filter((s) =>
      s.status === "critical" || s.status === "bad" || s.status === "weak",
    );
    const pool = bad.length ? bad.slice(0, 3) : report.stageBlocks.slice(0, 1);
    for (const s of pool) {
      lines.push(
        `${severityEmoji(s.status === "weak" ? "important" : "critical")} ${escapeHtml(truncate(s.stageLabel, 20))}\n   ↳ ${escapeHtml(truncate(s.problem, 95))}`,
      );
    }
  }

  return lines;
}

function formatMaterialFeedback(report: FunnelAuditReport): string[] {
  const lines: string[] = [];

  const badStages = (report.stageBlocks ?? [])
    .filter((s) =>
      (s.status === "critical" || s.status === "bad" || s.status === "weak") &&
      (s.howToFix?.trim() || s.problem?.trim()),
    )
    .slice(0, 3);

  for (const s of badStages) {
    const fix = s.howToFix?.trim() || s.problem.trim();
    lines.push(
      `${severityEmoji(s.status === "weak" ? "important" : "critical")} <b>${escapeHtml(truncate(s.stageLabel, 18))}</b>\n   💡 ${escapeHtml(truncate(fix, 95))}`,
    );
  }

  const mismatches = (report.crossMaterialMismatches ?? [])
    .filter((m) => m.severity === "critical" || m.severity === "important")
    .slice(0, 2);

  for (const m of mismatches) {
    lines.push(`${severityEmoji(m.severity)} ${escapeHtml(truncate(m.title, 60))}`);
    if (m.fix?.trim()) {
      lines.push(`   💡 ${escapeHtml(truncate(m.fix, 90))}`);
    }
  }

  return lines;
}

function formatKeyProblems(report: FunnelAuditReport): string[] {
  const sorted = [...report.problems].sort((a, b) => {
    const rank = (s: string) => (s === "critical" ? 0 : s === "important" ? 1 : 2);
    return rank(a.severity) - rank(b.severity) || b.impactScore - a.impactScore;
  });

  const top = sorted.filter((p) => p.severity === "critical" || p.severity === "important").slice(0, 3);
  if (!top.length && sorted.length) top.push(sorted[0]!);

  return top.map((p) => {
    const row = [`${severityEmoji(p.severity)} ${escapeHtml(truncate(p.title, 65))}`];
    if (p.moneyImpact?.trim()) {
      row.push(`   ↳ ${escapeHtml(truncate(p.moneyImpact, 55))}`);
    }
    return row.join("\n");
  });
}

export type AuditTelegramDigestInput = {
  projectName: string;
  funnelName: string;
  typeName?: string;
  generatedAt: string;
  report: FunnelAuditReport;
  metrics: FunnelMetric[];
  reportUrl: string;
};

export function formatAuditDigestTelegram(input: AuditTelegramDigestInput): string {
  const { projectName, funnelName, generatedAt, report, metrics, reportUrl } = input;
  const diag = buildDiagnostics(metrics);
  const dateStr = new Date(generatedAt).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
  });

  const lines: string[] = [
    `📊 <b>Аудит воронки</b>`,
    `📁 ${escapeHtml(projectName)} · 🎯 ${escapeHtml(funnelName)} · 📅 ${dateStr}`,
    ``,
  ];

  if (diag.bottleneck) {
    const pct =
      diag.bottleneck.achievementPercent != null
        ? ` · <b>${Math.round(diag.bottleneck.achievementPercent)}%</b> от плана`
        : "";
    lines.push(section("🎯", "Главный ограничитель"), `🔴 ${escapeHtml(diag.bottleneck.name)}${pct}`, ``);
  } else if (report.diagnosis.mainProblem) {
    lines.push(
      section("🎯", "Главная проблема"),
      escapeHtml(truncate(report.diagnosis.mainProblem, 160)),
      ``,
    );
  }

  const stageLines = formatBottleneckStages(report);
  if (stageLines.length) {
    lines.push(section("📉", "Где теряем в воронке"), ...stageLines, ``);
  }

  const redMetrics = diag.red.slice(0, 3);
  if (redMetrics.length) {
    lines.push(section("📊", "Метрики ниже плана"), ...redMetrics.map(formatRedMetric), ``);
  }

  const problems = formatKeyProblems(report);
  if (problems.length) {
    lines.push(section("⚠️", "Ключевые проблемы"), ...problems, ``);
  }

  const materialFeedback = formatMaterialFeedback(report);
  if (materialFeedback.length) {
    lines.push(section("📝", "Материалы — что поправить"), ...materialFeedback, ``);
  }

  if (lines.length <= 3) {
    lines.push(`✅ Критичных узких мест не выявлено.`, ``);
  }

  lines.push(`🔗 <a href="${escapeHtml(reportUrl)}">Открыть полный аудит в GrowControl →</a>`);

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

export function buildAuditReportUrl(projectId: string, funnelId: string): string {
  const base =
    import.meta.env.VITE_SITE_URL?.trim() ||
    (typeof window !== "undefined" ? window.location.origin : "https://controlgrow.ru");
  return `${base.replace(/\/$/, "")}/projects/${encodeURIComponent(projectId)}/funnels/${encodeURIComponent(funnelId)}/wizard/audit`;
}
