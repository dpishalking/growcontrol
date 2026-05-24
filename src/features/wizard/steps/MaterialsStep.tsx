import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FileText, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAppData } from "@/context/AppDataContext";
import { WizardLayout } from "@/features/wizard/WizardLayout";
import {
  buildMaterialChecklist,
  type ChecklistItem,
} from "@/features/wizard/MaterialChecklist";
import { MaterialAddPanel, type MaterialDraft } from "@/features/wizard/MaterialAddPanel";
import { MATERIAL_TYPES } from "@/types/material";
import type { FunnelTypeId } from "@/types/funnelType";
import { getFunnelTypeTemplate } from "@/data/funnelTypes/catalog";
import type { Funnel } from "@/types/funnel";
import { getStagesForFunnel } from "@/utils/funnelStages";
import { formatFileSize, processFile } from "@/utils/fileAttachment";

const EMPTY_DRAFT: MaterialDraft = {
  type: "site",
  funnelStage: "landing",
  title: "",
  url: "",
  attachment: null,
};

function findNextUndone(
  groups: ReturnType<typeof buildMaterialChecklist>["groups"],
  afterLabel?: string | null,
): ChecklistItem | null {
  const flat = groups.flatMap((g) => g.items);
  const startIdx = afterLabel ? flat.findIndex((i) => i.label === afterLabel) + 1 : 0;
  return flat.slice(startIdx).find((i) => !i.done) ?? flat.find((i) => !i.done) ?? null;
}

export function MaterialsStep({ funnel }: { funnel: Funnel }) {
  const { projectId } = useParams<{ projectId: string }>();
  const nav = useNavigate();
  const { funnelMaterials, addMaterial, deleteMaterial, setFunnelStep } = useAppData();
  const materials = funnelMaterials(funnel.id);

  const [draft, setDraft] = useState<MaterialDraft>(EMPTY_DRAFT);
  const [uploading, setUploading] = useState(false);
  const [activeChecklistLabel, setActiveChecklistLabel] = useState<string | null>(null);
  const addFormRef = useRef<HTMLDivElement>(null);
  const autoStarted = useRef(false);

  const stages = getStagesForFunnel(funnel);
  const typeTemplate = getFunnelTypeTemplate(funnel.funnelTypeId ?? undefined);
  const funnelTypeId = (funnel.funnelTypeId ?? "custom") as FunnelTypeId;
  const { groups, covered, total } = buildMaterialChecklist(typeTemplate, materials, funnelTypeId);

  const activeItem = useMemo(() => {
    if (!activeChecklistLabel) return null;
    for (const g of groups) {
      const found = g.items.find((i) => i.label === activeChecklistLabel);
      if (found) return found;
    }
    return null;
  }, [activeChecklistLabel, groups]);

  const applyChecklistItem = (item: ChecklistItem) => {
    setActiveChecklistLabel(item.label);
    setDraft({
      type: item.suggestedType ?? "content",
      funnelStage: item.stageId,
      title: item.label,
      url: "",
      attachment: null,
    });
    addFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  useEffect(() => {
    if (autoStarted.current || activeChecklistLabel) return;
    const first = findNextUndone(groups, null);
    if (first) {
      autoStarted.current = true;
      applyChecklistItem(first);
    }
  }, [groups, activeChecklistLabel]);

  const handleDraftChange = (patch: Partial<MaterialDraft>) => {
    setDraft((d) => ({ ...d, ...patch }));
  };

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const result = await processFile(file);
      setDraft((d) => ({
        ...d,
        attachment: result.attachment,
        title: d.title || file.name,
      }));
      if (result.warning) toast.warning(result.warning);
      else toast.success("Файл прикреплён");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Не удалось прочитать файл");
    } finally {
      setUploading(false);
    }
  };

  const handleAdd = () => {
    if (!draft.title.trim()) {
      toast.error("Укажите название материала");
      return;
    }
    if (!draft.url.trim() && !draft.attachment) {
      toast.error("Добавьте ссылку или файл");
      return;
    }
    const addedLabel = activeChecklistLabel;
    addMaterial({
      funnelId: funnel.id,
      type: draft.type,
      funnelStage: draft.funnelStage,
      title: draft.title,
      url: draft.url,
      content: draft.attachment?.extractedText ?? "",
      attachment: draft.attachment,
    });

    const nextGroups = buildMaterialChecklist(
      typeTemplate,
      [
        ...materials,
        {
          id: "temp",
          funnelId: funnel.id,
          type: draft.type,
          funnelStage: draft.funnelStage,
          title: draft.title,
          url: draft.url,
          content: draft.attachment?.extractedText ?? "",
          attachment: draft.attachment,
          source: "",
          summary: "",
          strengths: [],
          weaknesses: [],
          affectedMetrics: [],
          focusFlag: "in_focus",
          createdAt: new Date().toISOString(),
        },
      ],
      funnelTypeId,
    );
    const next = findNextUndone(nextGroups.groups, addedLabel);

    toast.success("Материал добавлен");
    if (next) {
      applyChecklistItem(next);
      toast.info(`Следующий пункт: «${next.label}»`);
    } else {
      setActiveChecklistLabel(null);
      setDraft(EMPTY_DRAFT);
      toast.success("Чек-лист закрыт — можно идти к метрикам");
    }
  };

  const handleNext = () => {
    setFunnelStep(funnel.id, 4);
    nav(`/projects/${projectId}/funnels/${funnel.id}/wizard/metrics`);
  };

  return (
    <WizardLayout
      funnel={funnel}
      activeStep="materials"
      onBack={() => nav(`/projects/${projectId}/funnels/${funnel.id}/wizard/funnel-type`)}
      onNext={handleNext}
      nextLabel={materials.length === 0 ? "Пропустить (метрики всё равно нужны)" : "К метрикам"}
    >
      <div className="space-y-6">
        <div ref={addFormRef}>
          <MaterialAddPanel
            draft={draft}
            onDraftChange={handleDraftChange}
            stages={stages}
            checklistGroups={groups}
            activeItem={activeItem}
            checklistProgress={{ covered, total }}
            uploading={uploading}
            onFileSelect={(file) => void handleFile(file)}
            onAdd={handleAdd}
            onPickChecklistItem={applyChecklistItem}
            onUseCustomMaterial={() => {
              setActiveChecklistLabel(null);
              setDraft((d) => ({
                ...EMPTY_DRAFT,
                type: d.type,
                funnelStage: d.funnelStage,
              }));
            }}
          />
        </div>

        {materials.length > 0 ? (
          <section className="space-y-2">
            <h3 className="font-display text-base font-semibold">
              Загружено{" "}
              <span className="text-muted-foreground text-sm font-normal">({materials.length})</span>
            </h3>
            <ul className="space-y-2">
              {materials.map((m) => (
                <li
                  key={m.id}
                  className="rounded-lg border border-border/60 px-3 py-2.5 flex items-start justify-between gap-3 hover:border-primary/25 transition-colors"
                >
                  <div className="min-w-0 flex-1 flex gap-3">
                    {m.attachment?.dataUrl && m.attachment.fileType.startsWith("image/") ? (
                      <img
                        src={m.attachment.dataUrl}
                        alt={m.attachment.fileName}
                        className="h-12 w-12 rounded-md object-cover border border-border/60 shrink-0"
                      />
                    ) : m.attachment ? (
                      <div className="h-12 w-12 rounded-md border border-border/60 bg-secondary/40 flex items-center justify-center shrink-0">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                      </div>
                    ) : null}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="text-sm font-medium leading-snug">{m.title}</p>
                        <Badge variant="outline" className="text-[10px]">
                          {MATERIAL_TYPES.find((t) => t.id === m.type)?.label ?? m.type}
                        </Badge>
                      </div>
                      {m.url ? (
                        <a
                          href={m.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] text-primary hover:underline block mt-0.5 truncate max-w-full"
                        >
                          {m.url}
                        </a>
                      ) : null}
                      {m.attachment ? (
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {m.attachment.fileName} · {formatFileSize(m.attachment.fileSize)}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteMaterial(m.id)}
                    aria-label="Удалить"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </WizardLayout>
  );
}
