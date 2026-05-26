import { useMemo, useState } from "react";
import { format, isValid } from "date-fns";
import { ru } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

function parseDateValue(value: string): Date | undefined {
  if (!value) return undefined;
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return undefined;
  const date = new Date(y, m - 1, d);
  return isValid(date) ? date : undefined;
}

function toDateValue(date: Date | undefined): string {
  if (!date || !isValid(date)) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

type Props = {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
};

export function PlanDateField({
  value,
  onChange,
  className,
  placeholder = "Выберите дату",
}: Props) {
  const [open, setOpen] = useState(false);
  const selected = useMemo(() => parseDateValue(value), [value]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            "h-10 w-full justify-start gap-2 px-3 font-normal bg-background/40 border-border/50",
            !selected && "text-muted-foreground",
            className,
          )}
        >
          <CalendarIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          {selected ? format(selected, "d MMMM yyyy", { locale: ru }) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(date) => {
            onChange(toDateValue(date));
            setOpen(false);
          }}
          locale={ru}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
