import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Banknote,
  Bell,
  Bot,
  CalendarDays,
  CheckCircle2,
  Clock,
  CreditCard,
  FileText,
  Filter,
  Flame,
  Gift,
  Globe,
  Heart,
  HelpCircle,
  Hourglass,
  Inbox,
  Layers,
  LayoutTemplate,
  ListChecks,
  Mail,
  MapPin,
  Megaphone,
  MessageCircle,
  MonitorPlay,
  MousePointerClick,
  Newspaper,
  Package,
  Phone,
  PhoneCall,
  Presentation,
  RefreshCw,
  ShoppingCart,
  Sparkles,
  Target,
  Truck,
  UserPlus,
  Users,
  Zap,
} from "lucide-react";
import type { StageAuditStatus } from "./auditStageModel";

export const STAGE_ICONS: Record<string, LucideIcon> = {
  traffic: Megaphone,
  click: MousePointerClick,
  ads: Sparkles,
  /** Точка входа (офлайн, кастом) */
  entry: Globe,
  /** Запись на визит */
  booking: CalendarDays,
  /** Повторный визит */
  repeat_visit: RefreshCw,
  /** Кастомная воронка */
  target_action: Target,
  sale_point: ShoppingCart,
  money: Banknote,
  landing: LayoutTemplate,
  reg_page: Globe,
  registration: UserPlus,
  confirmation: CheckCircle2,
  attendance: Presentation,
  retention: Hourglass,
  selling_block: MonitorPlay,
  webinar: Users,
  webinar_reg: UserPlus,
  webinar_lead: ShoppingCart,
  followup: PhoneCall,
  lead: Inbox,
  consultation_lead: Inbox,
  qualification: Filter,
  contact: Phone,
  consultation: MessageCircle,
  offer: FileText,
  sale: CreditCard,
  payment: Banknote,
  repeat: RefreshCw,
  order: Package,
  shipping: Truck,
  delivery: MapPin,
  buyout: CheckCircle2,
  subscribe: Bell,
  warmup: Flame,
  sales_event: Zap,
  start: Sparkles,
  completion: CheckCircle2,
  sub_page: Globe,
  activation: Zap,
  first_use: MousePointerClick,
  renewal: RefreshCw,
  churn: Clock,
  reactivation: RefreshCw,
  /** Контент-маркетинг */
  content_entry: Newspaper,
  content_engagement: Activity,
  lead_magnet: Gift,
  nurture: Mail,
  loyalty: Heart,
  quiz_start: HelpCircle,
  quiz_session: ListChecks,
  quiz_progress: ListChecks,
  quiz_complete: CheckCircle2,
  result: Sparkles,
  call: Phone,
  bot_entry: Bot,
  first_message: MessageCircle,
  warmup_series: Flame,
  content_view: MonitorPlay,
  cta_click: MousePointerClick,
  thank_you: CheckCircle2,
  checkout: ShoppingCart,
  offline_visit: MapPin,
  visit: MapPin,
};

export function getStageIcon(stageId: string): LucideIcon {
  return STAGE_ICONS[stageId] ?? Layers;
}

export type TrafficLightStyle = {
  tile: string;
  icon: string;
  dot: string;
  label: string;
};

/** Подсветка этапа по оценке AI (не план/факт). */
export function trafficLightStyle(status: StageAuditStatus): TrafficLightStyle {
  switch (status) {
    case "critical":
      return {
        tile: "border-danger/45 bg-danger-soft/40 shadow-[0_0_14px_-2px_hsl(var(--danger)/0.55)]",
        icon: "text-danger",
        dot: "bg-danger shadow-[0_0_6px_hsl(var(--danger)/0.8)]",
        label: "text-foreground",
      };
    case "bad":
      return {
        tile: "border-warning/45 bg-warning-soft/35 shadow-[0_0_14px_-2px_hsl(var(--warning)/0.5)]",
        icon: "text-warning",
        dot: "bg-warning shadow-[0_0_6px_hsl(var(--warning)/0.75)]",
        label: "text-foreground",
      };
    case "weak":
      return {
        tile: "border-warning/30 bg-warning-soft/20 shadow-[0_0_10px_-3px_hsl(var(--warning)/0.35)]",
        icon: "text-warning/90",
        dot: "bg-warning/80",
        label: "text-foreground/90",
      };
    case "good":
      return {
        tile: "border-success/40 bg-success-soft/30 shadow-[0_0_10px_-3px_hsl(var(--success)/0.35)]",
        icon: "text-success",
        dot: "bg-success shadow-[0_0_5px_hsl(var(--success)/0.6)]",
        label: "text-muted-foreground",
      };
    default:
      return {
        tile: "border-border/50 bg-muted/20",
        icon: "text-muted-foreground",
        dot: "bg-muted-foreground/45",
        label: "text-muted-foreground",
      };
  }
}

export function splitStagesIntoRows<T>(items: T[], maxPerRow = 5): T[][] {
  if (items.length <= maxPerRow) return [items];
  const firstCount = Math.min(maxPerRow, Math.ceil(items.length / 2));
  return [items.slice(0, firstCount), items.slice(firstCount)];
}
