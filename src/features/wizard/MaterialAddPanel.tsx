import { useCallback, useEffect, useRef, useState } from "react";
import {
  Check,
  FileText,
  Image as ImageIcon,
  Link2,
  Loader2,
  Paperclip,
  Plus,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MATERIAL_TYPES,
  type MaterialAttachment,
  type MaterialType,
} from "@/types/material";
import type { ChecklistItem, StageGroup } from "@/features/wizard/MaterialChecklist";
import { MaterialStepPicker } from "@/features/wizard/MaterialStepPicker";
import { formatFileSize } from "@/utils/fileAttachment";
import { cn } from "@/lib/utils";

export type MaterialDraft = {
  type: MaterialType;
  funnelStage: string;
  title: string;
  url: string;
  attachment: MaterialAttachment | null;
};

type SourceMode = "link" | "file" | "both";

type StageOption = { id: string; label: string };

type Props = {
  draft: MaterialDraft;
  onDraftChange: (patch: Partial<MaterialDraft>) => void;
  stages: StageOption[];
  checklistGroups: StageGroup[];
  activeItem: ChecklistItem | null;
  checklistProgress: { covered: number; total: number };
  uploading: boolean;
  onFileSelect: (file: File) => void;
  onAdd: () => void;
  onPickChecklistItem: (item: ChecklistItem) => void;
  onUseCustomMaterial: () => void;
};

function isValidUrl(value: string): boolean {
  if (!value.trim()) return false;
  try {
    const u = new URL(value.trim());
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export function MaterialAddPanel({
  draft,
  onDraftChange,
  stages,
  checklistGroups,
  activeItem,
  checklistProgress,
  uploading,
  onFileSelect,
  onAdd,
  onPickChecklistItem,
  onUseCustomMaterial,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sourceMode, setSourceMode] = useState<SourceMode>("link");
  const [dragOver, setDragOver] = useState(false);
  const [justAddedPulse, setJustAddedPulse] = useState(false);

  const stageLabel = stages.find((s) => s.id === draft.funnelStage)?.label ?? draft.funnelStage;
  const typeMeta = MATERIAL_TYPES.find((t) => t.id === draft.type);
  const hasLink = isValidUrl(draft.url);
  const hasFile = !!draft.attachment;
  const hasContent =
    sourceMode === "link" ? hasLink : sourceMode === "file" ? hasFile : hasLink || hasFile;
  const canSubmit = draft.title.trim().length > 0 && hasContent;

  const step1Done = !!draft.title.trim();
  const step2Done = hasContent;
  const microProgress = step1Done && step2Done ? 100 : step1Done ? 55 : activeItem ? 25 : 10;

  useEffect(() => {
    if (activeItem) {
      setSourceMode(activeItem.suggestedType === "site" ? "link" : "file");
    }
  }, [activeItem?.label, activeItem?.suggestedType]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file) onFileSelect(file);
    },
    [onFileSelect],
  );

  const handleSubmit = () => {
    onAdd();
    setJustAddedPulse(true);
    setTimeout(() => setJustAddedPulse(false), 600);
  };

  return (
    <Card
      className={cn(
        "scroll-mt-6 overflow-hidden transition-all duration-300",
        activeItem
          ? "border-primary/40 bg-gradient-to-b from-primary/8 to-card shadow-glow"
          : "border-border/60",
        justAddedPulse && "ring-2 ring-success/40",
      )}
    >
      <CardContent className="p-0">
        {/* Hero */}
        <div className="px-5 pt-5 pb-4 border-b border-border/50 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2 min-w-0">
              <h2 className="font-display text-base sm:text-lg font-semibold leading-snug text-foreground">
                Добавьте все возможные материалы — презентации, сайты, рекламные креативы,
                скрипты продаж и другое — для полноценного аудита воронки по смыслу и логике
              </h2>
              {activeItem ? (
                <p className="text-sm text-primary/90 font-medium">Сейчас: {activeItem.label}</p>
              ) : (
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Выберите материал из списка воронки или добавьте свой
                </p>
              )}
            </div>
            {activeItem ? (
              <Button type="button" variant="ghost" size="sm" className="shrink-0 h-8" onClick={onUseCustomMaterial}>
                <X className="h-4 w-4" />
              </Button>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-1.5">
            <span className="chip chip-primary text-[10px]">{typeMeta?.label ?? draft.type}</span>
            <span className="chip text-[10px]">{stageLabel}</span>
            <span className="chip text-[10px]">
              Чек-лист {checklistProgress.covered}/{checklistProgress.total}
            </span>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>Готовность</span>
              <span>{canSubmit ? "можно сохранить" : step1Done ? "добавьте ссылку или файл" : "укажите название"}</span>
            </div>
            <Progress value={microProgress} className="h-1" />
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* Step 1: название */}
          <section className="space-y-3 fade-in">
            <StepHeader n={1} title="Что добавляем?" done={step1Done} />

            {checklistGroups.length > 0 ? (
              <>
                <MaterialStepPicker
                  items={checklistGroups.flatMap((g) => g.items)}
                  activeLabel={activeItem?.label}
                  onSelect={onPickChecklistItem}
                  onCustom={onUseCustomMaterial}
                  customActive={!activeItem}
                  variant="form"
                />

                {activeItem ? (
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Тип и этап подставлены автоматически —{" "}
                    <span className="text-foreground/90">{typeMeta?.label}</span>, {stageLabel}
                  </p>
                ) : (
                  <div className="space-y-3 pt-1">
                    <Input
                      value={draft.title}
                      onChange={(e) => onDraftChange({ title: e.target.value })}
                      placeholder="Своё название материала"
                      className="h-11 text-sm"
                    />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Тип материала</Label>
                        <Select
                          value={draft.type}
                          onValueChange={(v) => onDraftChange({ type: v as MaterialType })}
                        >
                          <SelectTrigger className="h-10">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {MATERIAL_TYPES.map((t) => (
                              <SelectItem key={t.id} value={t.id}>
                                {t.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Этап воронки</Label>
                        <Select
                          value={draft.funnelStage}
                          onValueChange={(v) => onDraftChange({ funnelStage: v })}
                        >
                          <SelectTrigger className="h-10">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {stages.map((s) => (
                              <SelectItem key={s.id} value={s.id}>
                                {s.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                <Input
                  value={draft.title}
                  onChange={(e) => onDraftChange({ title: e.target.value })}
                  placeholder="Название материала"
                  className="h-11 text-sm"
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Тип материала</Label>
                    <Select
                      value={draft.type}
                      onValueChange={(v) => onDraftChange({ type: v as MaterialType })}
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MATERIAL_TYPES.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Этап воронки</Label>
                    <Select
                      value={draft.funnelStage}
                      onValueChange={(v) => onDraftChange({ funnelStage: v })}
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {stages.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </>
            )}
          </section>

          {/* Step 2: способ */}
          <section className="space-y-3">
            <StepHeader n={2} title="Как прикрепить?" done={step2Done} />
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { id: "link" as const, icon: Link2, label: "Ссылка", hint: "URL страницы" },
                  { id: "file" as const, icon: Paperclip, label: "Файл", hint: "Скрин, PDF, txt" },
                  { id: "both" as const, icon: Upload, label: "Оба", hint: "Максимум для аудита" },
                ] as const
              ).map((opt) => {
                const active = sourceMode === opt.id;
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSourceMode(opt.id)}
                    className={cn(
                      "rounded-xl border px-2 py-3 text-center transition-all duration-200 group/src",
                      active
                        ? "border-primary/50 bg-primary/12 text-primary shadow-glow scale-[1.02]"
                        : "border-border/60 bg-card/40 hover:border-primary/35 hover:bg-primary/5",
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-5 w-5 mx-auto mb-1.5 transition-transform duration-200",
                        active ? "scale-110" : "group-hover/src:scale-105",
                      )}
                    />
                    <p className="text-xs font-medium">{opt.label}</p>
                    <p className="text-[9px] text-muted-foreground mt-0.5 leading-tight">{opt.hint}</p>
                  </button>
                );
              })}
            </div>

            {(sourceMode === "link" || sourceMode === "both") && (
              <div className="space-y-1.5 fade-in pt-1">
                <div className="relative">
                  <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={draft.url}
                    onChange={(e) => onDraftChange({ url: e.target.value })}
                    placeholder="https://…"
                    className="h-11 pl-9 pr-10 text-sm"
                  />
                  {hasLink ? (
                    <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-success animate-in fade-in zoom-in duration-200" />
                  ) : null}
                </div>
              </div>
            )}

            {(sourceMode === "file" || sourceMode === "both") && (
              <div className="fade-in pt-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) onFileSelect(file);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                />
                {draft.attachment ? (
                  <AttachmentPreview
                    attachment={draft.attachment}
                    onRemove={() => onDraftChange({ attachment: null })}
                  />
                ) : (
                  <div
                    onDrop={handleDrop}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOver(true);
                    }}
                    onDragLeave={() => setDragOver(false)}
                    className={cn(
                      "rounded-xl border-2 border-dashed px-4 py-8 text-center space-y-3 transition-all duration-200",
                      dragOver
                        ? "border-primary bg-primary/10 scale-[1.01] shadow-glow"
                        : "border-border/60 hover:border-primary/40 hover:bg-primary/5",
                    )}
                  >
                    <div
                      className={cn(
                        "mx-auto h-12 w-12 rounded-full flex items-center justify-center transition-all duration-200",
                        dragOver ? "bg-primary/20 scale-110" : "bg-muted/50",
                      )}
                    >
                      {uploading ? (
                        <Loader2 className="h-6 w-6 text-primary animate-spin" />
                      ) : (
                        <Upload className={cn("h-6 w-6", dragOver ? "text-primary" : "text-muted-foreground")} />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {dragOver ? "Отпустите файл" : "Перетащите файл сюда"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">или</p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={uploading}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {uploading ? "Загрузка…" : "Выбрать файл"}
                    </Button>
                    <p className="text-[10px] text-muted-foreground max-w-xs mx-auto leading-relaxed">
                      Картинки до 1 МБ · txt/md в содержимое · остальное — метаданные
                    </p>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Submit */}
          <div className="pt-2 border-t border-border/50 space-y-2">
            <div className="flex flex-wrap gap-2 text-[10px]">
              <ReadyChip ok={step1Done} label="Название" />
              {(sourceMode === "link" || sourceMode === "both") && (
                <ReadyChip ok={hasLink} label="Ссылка" />
              )}
              {(sourceMode === "file" || sourceMode === "both") && (
                <ReadyChip ok={hasFile} label="Файл" />
              )}
            </div>
            <Button
              onClick={handleSubmit}
              disabled={!canSubmit || uploading}
              className={cn(
                "w-full h-11 bg-gradient-money text-primary-foreground text-sm font-medium",
                canSubmit && "shadow-glow motion-safe:hover:brightness-105",
              )}
            >
              <Plus className="mr-1.5 h-4 w-4" />
              {activeItem ? `Добавить «${activeItem.label.slice(0, 32)}${activeItem.label.length > 32 ? "…" : ""}»` : "В список материалов"}
            </Button>
            <p className="text-[10px] text-center text-muted-foreground">
              Оценку материалов сделает AI-аудит на следующем шаге
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StepHeader({ n, title, done }: { n: number; title: string; done: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={cn(
          "h-6 w-6 rounded-full flex items-center justify-center text-[11px] font-semibold tabular-nums transition-colors",
          done ? "bg-success/20 text-success" : "bg-primary/15 text-primary",
        )}
      >
        {done ? <Check className="h-3.5 w-3.5" /> : n}
      </span>
      <h3 className="text-sm font-medium">{title}</h3>
    </div>
  );
}

function ReadyChip({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={cn("chip text-[10px]", ok ? "chip-success" : "chip-warning")}>
      {ok ? "✓" : "○"} {label}
    </span>
  );
}

function AttachmentPreview({
  attachment,
  onRemove,
}: {
  attachment: MaterialAttachment;
  onRemove: () => void;
}) {
  const isImage = attachment.fileType.startsWith("image/") && attachment.dataUrl;
  return (
    <div className="rounded-xl border border-success/30 bg-success/5 px-3 py-3 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {isImage ? (
        <img
          src={attachment.dataUrl ?? ""}
          alt={attachment.fileName}
          className="h-14 w-14 rounded-lg object-cover border border-border/60"
        />
      ) : (
        <div className="h-14 w-14 rounded-lg border border-border/60 bg-secondary/40 flex items-center justify-center">
          {attachment.fileType.startsWith("image/") ? (
            <ImageIcon className="h-5 w-5 text-muted-foreground" />
          ) : (
            <FileText className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium leading-snug">{attachment.fileName}</p>
        <p className="text-[11px] text-success/90 mt-0.5">Файл прикреплён</p>
        <p className="text-[10px] text-muted-foreground">
          {formatFileSize(attachment.fileSize)}
          {attachment.extractedText ? " · текст загружен" : ""}
        </p>
      </div>
      <Button size="sm" variant="ghost" onClick={onRemove} aria-label="Убрать файл">
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
