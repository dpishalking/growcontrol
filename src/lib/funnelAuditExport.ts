import type { FunnelAuditReport } from "@/types/funnelAudit";

function section(title: string, body: string): string {
  if (!body.trim()) return "";
  return `\n## ${title}\n\n${body.trim()}\n`;
}

function list(items: string[]): string {
  return items.filter(Boolean).map((x) => `- ${x}`).join("\n");
}

export function funnelAuditToMarkdown(
  report: FunnelAuditReport,
  meta?: { funnelName?: string; typeName?: string; generatedAt?: string },
): string {
  const lines: string[] = [
    "# Полный аудит воронки",
    meta?.funnelName ? `**Продукт:** ${meta.funnelName}` : "",
    meta?.typeName ? `**Тип:** ${meta.typeName}` : "",
    meta?.generatedAt ? `**Дата:** ${new Date(meta.generatedAt).toLocaleString("ru-RU")}` : "",
    "",
  ].filter(Boolean);

  const d = report.diagnosis;
  lines.push(
    section(
      "Диагноз",
      [
        d.mainLever ? `**Главный рычаг:** ${d.mainLever}` : "",
        `**Главная проблема:** ${d.mainProblem}`,
        `**Утечка денег:** ${d.mainMoneyLeak}`,
        `**Оценка потерь:** ${d.estimatedLossPercent}`,
        "",
        "**Метрики:**",
        ...d.metrics.map((m) => `- ${m.name}: ${m.score}/10 — ${m.comment}`),
      ].join("\n"),
    ),
  );

  if (report.problems.length) {
    lines.push(
      section(
        "Ключевые проблемы",
        report.problems
          .map(
            (p, i) =>
              `### ${i + 1}. ${p.title} (${p.severity})\n${p.whyItHurts}\n**Деньги:** ${p.moneyImpact}\n**Как исправить:**\n${list(p.howToFix)}${p.customerThought ? `\n**Мысль клиента:** ${p.customerThought}` : ""}`,
          )
          .join("\n\n"),
      ),
    );
  }

  if (report.stageBlocks?.length) {
    lines.push(
      section(
        "Этапы воронки",
        report.stageBlocks
          .map(
            (s) =>
              `### ${s.stageLabel} [${s.status}]\n**Проблема:** ${s.problem}\n**Почему важно:** ${s.whyImportant}\n**Как исправить:** ${s.howToFix}${s.rewriteExample ? `\n**Пример:** ${s.rewriteExample}` : ""}`,
          )
          .join("\n\n"),
      ),
    );
  }

  if (report.crossMaterialMismatches?.length) {
    lines.push(
      section(
        "Расхождения между материалами",
        report.crossMaterialMismatches
          .map((m) => `### ${m.title}\n${m.detail}\n**Исправление:** ${m.fix}`)
          .join("\n\n"),
      ),
    );
  }

  if (report.blocks.length) {
    lines.push(
      section(
        "Разбор лендинга (7 зон)",
        report.blocks
          .map((b) => `### ${b.name} [${b.status}]\n${b.problem}\n**Исправление:** ${b.howToFix}`)
          .join("\n\n"),
      ),
    );
  }

  lines.push(
    section(
      "Утечки денег",
      [
        ...report.moneyLeaks.items.map((i) => `- ${i.reason} (${i.lossPercent})${i.verification ? ` — проверка: ${i.verification}` : ""}`),
        `**Итого:** ${report.moneyLeaks.totalLoss}`,
      ].join("\n"),
    ),
  );

  lines.push(
    section(
      "Потенциал роста",
      [
        `Заявки: ${report.growthPotential.requestsGrowth}`,
        `Конверсия: ${report.growthPotential.conversionGrowth}`,
        report.growthPotential.revenueLogic,
        report.growthPotential.verification ? `Проверка: ${report.growthPotential.verification}` : "",
      ].join("\n"),
    ),
  );

  if (report.offerScore) {
    const o = report.offerScore;
    lines.push(
      section(
        "Offer Score (Hormozi)",
        `Итого: ${o.totalScore}/100 — ${o.verdict}\n${o.biggestLever}`,
      ),
    );
  }

  if (report.meclabsScore) {
    const m = report.meclabsScore;
    lines.push(section("MECLABS", `Score: ${m.score} — ${m.interpretation}`));
  }

  if (report.marketContext) {
    const mc = report.marketContext;
    lines.push(
      section(
        "Контекст рынка (Schwartz)",
        `Уровень осознанности: ${mc.awarenessLevel}\n${mc.awarenessComment}\nНесоответствие: ${mc.mismatch}`,
      ),
    );
  }

  if (report.funnel) {
    lines.push(
      section(
        "Воронка — потери по этапам",
        [
          ...report.funnel.stages.map((s) => `- ${s.name}: ${s.percent}%${s.isMainLeak ? " ⚠ главная утечка" : ""} — ${s.dropReason}`),
          `**Главная утечка:** ${report.funnel.mainLeak}`,
          report.funnel.insight,
        ].join("\n"),
      ),
    );
  }

  const roadmap = report.roadmap;
  const mapRoad = (title: string, items: typeof roadmap.quickWins) =>
    items.length ? `**${title}:**\n${items.map((x) => `- ${x.action} (${x.expectedEffect})`).join("\n")}` : "";

  lines.push(
    section(
      "Roadmap",
      [mapRoad("Quick wins", roadmap.quickWins), mapRoad("На неделю", roadmap.thisWeek), mapRoad("На месяц", roadmap.thisMonth)]
        .filter(Boolean)
        .join("\n\n"),
    ),
  );

  if (report.hypotheses?.length) {
    lines.push(
      section(
        "Гипотезы (10 SMART)",
        report.hypotheses
          .map(
            (h, i) =>
              `${i + 1}. **[${h.priority}]** ${h.title}\n   Метрика: ${h.metricName} | Окно: ${h.testWindow} | Эффект: ${h.expectedImpact}${h.guardrail ? ` | Guardrail: ${h.guardrail}` : ""}`,
          )
          .join("\n\n"),
      ),
    );
  }

  if (report.firstScreenRewrite) {
    const f = report.firstScreenRewrite;
    lines.push(
      section(
        "Перепись первого экрана",
        [`H1: ${f.h1}`, `Subtitle: ${f.subtitle}`, `CTA: ${f.cta}`, `Bullets:\n${list(f.bullets)}`].join("\n"),
      ),
    );
  }

  lines.push(section("Итог", report.systemMessage || report.finalCta));

  return lines.filter(Boolean).join("\n");
}

export function downloadFunnelAuditMarkdown(report: FunnelAuditReport, filename: string, meta?: Parameters<typeof funnelAuditToMarkdown>[1]) {
  const md = funnelAuditToMarkdown(report, meta);
  const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".md") ? filename : `${filename}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadFunnelAuditJson(report: FunnelAuditReport, filename: string) {
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".json") ? filename : `${filename}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
