import type { MaterialAttachment } from "@/types/material";
import { MAX_INLINE_FILE_BYTES, MAX_TEXT_EXTRACT_BYTES } from "@/types/material";

const TEXT_EXTENSIONS = [".txt", ".md", ".csv", ".json", ".log"];
const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml"];

function isTextLike(file: File): boolean {
  if (file.type.startsWith("text/")) return true;
  const name = file.name.toLowerCase();
  return TEXT_EXTENSIONS.some((ext) => name.endsWith(ext));
}

function isImage(file: File): boolean {
  return IMAGE_TYPES.includes(file.type) || file.type.startsWith("image/");
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("Не удалось прочитать файл"));
    reader.readAsDataURL(file);
  });
}

function readAsText(file: File, maxBytes: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const slice = file.size > maxBytes ? file.slice(0, maxBytes) : file;
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("Не удалось прочитать файл"));
    reader.readAsText(slice);
  });
}

export type ProcessedFile = {
  attachment: MaterialAttachment;
  /** Текст для предзаполнения `content` поля (для txt/md). */
  contentText?: string;
  /** Предупреждение, если файл слишком большой для inline-хранения. */
  warning?: string;
};

export async function processFile(file: File): Promise<ProcessedFile> {
  const base: MaterialAttachment = {
    fileName: file.name,
    fileType: file.type || "application/octet-stream",
    fileSize: file.size,
    dataUrl: null,
  };

  if (isImage(file)) {
    if (file.size <= MAX_INLINE_FILE_BYTES) {
      const dataUrl = await readAsDataUrl(file);
      return { attachment: { ...base, dataUrl } };
    }
    return {
      attachment: base,
      warning: `Картинка > ${(MAX_INLINE_FILE_BYTES / 1024 / 1024).toFixed(0)} МБ — сохранили только метаданные. Подключите Supabase Storage для полного файла.`,
    };
  }

  if (isTextLike(file)) {
    const text = await readAsText(file, MAX_TEXT_EXTRACT_BYTES);
    return {
      attachment: { ...base, extractedText: text },
      contentText: text,
      warning:
        file.size > MAX_TEXT_EXTRACT_BYTES
          ? `Файл усечён до ${(MAX_TEXT_EXTRACT_BYTES / 1024).toFixed(0)} КБ для предпросмотра.`
          : undefined,
    };
  }

  // PDF / PPTX и прочие бинарные — храним только метаданные.
  return {
    attachment: base,
    warning:
      "Для PDF / PPTX мы пока сохраняем только имя и размер. Полноценное чтение подключим вместе с Supabase Storage и парсером.",
  };
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / 1024 / 1024).toFixed(1)} МБ`;
}
