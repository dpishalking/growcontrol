export const HYPOTHESIS_STATUS_LABELS: Record<string, string> = {
  new: "Новая",
  in_progress: "В работе",
  testing: "Тест",
  won: "Подтверждена",
  lost: "Отклонена",
  archived: "Архив",
};

export const HYPOTHESIS_PRIORITY_LABELS: Record<string, string> = {
  high: "Высокий",
  medium: "Средний",
  low: "Низкий",
};

export const HYPOTHESIS_STATUS_TONE: Record<string, string> = {
  new: "chip",
  in_progress: "chip chip-info",
  testing: "chip chip-warning",
  won: "chip chip-success",
  lost: "chip chip-danger",
  archived: "chip",
};
