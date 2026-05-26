import type { LucideIcon } from "lucide-react";
import {
  Bot,
  ClipboardList,
  GraduationCap,
  HelpCircle,
  MapPin,
  Newspaper,
  Package,
  Presentation,
  Repeat,
  SlidersHorizontal,
  Stethoscope,
} from "lucide-react";
import type { FunnelTypeId } from "@/types/funnelType";

export type FunnelTypeVisual = {
  icon: LucideIcon;
  /** Tailwind gradient classes for the illustration strip. */
  gradient: string;
  iconClass: string;
  /** Short label for quick scanning. */
  chip: string;
};

export const FUNNEL_TYPE_VISUALS: Record<FunnelTypeId, FunnelTypeVisual> = {
  service_lead: {
    icon: ClipboardList,
    gradient: "from-amber-500/30 via-orange-500/15 to-transparent",
    iconClass: "text-amber-300",
    chip: "Заявки",
  },
  webinar: {
    icon: Presentation,
    gradient: "from-violet-500/30 via-purple-500/15 to-transparent",
    iconClass: "text-violet-300",
    chip: "Вебинар",
  },
  consultation: {
    icon: Stethoscope,
    gradient: "from-sky-500/30 via-blue-500/15 to-transparent",
    iconClass: "text-sky-300",
    chip: "Консультация",
  },
  product_delivery: {
    icon: Package,
    gradient: "from-emerald-500/30 via-teal-500/15 to-transparent",
    iconClass: "text-emerald-300",
    chip: "Доставка",
  },
  online_course: {
    icon: GraduationCap,
    gradient: "from-indigo-500/30 via-blue-600/15 to-transparent",
    iconClass: "text-indigo-300",
    chip: "Курс",
  },
  subscription: {
    icon: Repeat,
    gradient: "from-cyan-500/30 via-teal-500/15 to-transparent",
    iconClass: "text-cyan-300",
    chip: "Подписка",
  },
  quiz: {
    icon: HelpCircle,
    gradient: "from-pink-500/30 via-rose-500/15 to-transparent",
    iconClass: "text-pink-300",
    chip: "Квиз",
  },
  telegram_bot: {
    icon: Bot,
    gradient: "from-blue-500/30 via-sky-500/15 to-transparent",
    iconClass: "text-blue-300",
    chip: "Telegram",
  },
  offline_visit: {
    icon: MapPin,
    gradient: "from-lime-500/30 via-green-500/15 to-transparent",
    iconClass: "text-lime-300",
    chip: "Офлайн",
  },
  content_marketing: {
    icon: Newspaper,
    gradient: "from-orange-500/30 via-rose-500/15 to-transparent",
    iconClass: "text-orange-300",
    chip: "Органика",
  },
  custom: {
    icon: SlidersHorizontal,
    gradient: "from-muted/50 via-muted/25 to-transparent",
    iconClass: "text-muted-foreground",
    chip: "Своя",
  },
};

export function getFunnelTypeVisual(id: FunnelTypeId): FunnelTypeVisual {
  return FUNNEL_TYPE_VISUALS[id];
}
