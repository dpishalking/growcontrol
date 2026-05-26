import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TelegramConnectCard } from "@/features/dashboard/TelegramConnectCard";
import { cn } from "@/lib/utils";

type Props = {
  appProjectId: string;
  className?: string;
  size?: "sm" | "default";
  variant?: "outline" | "secondary" | "default";
};

export function TelegramConnectButton({
  appProjectId,
  className,
  size = "sm",
  variant = "outline",
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        size={size}
        variant={variant}
        className={cn("shrink-0", className)}
        onClick={() => setOpen(true)}
      >
        <MessageCircle className="mr-2 h-4 w-4" />
        Подключить Telegram
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Telegram</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground -mt-2">
            Уведомления только по этому проекту — личный или командный чат.
          </p>
          <TelegramConnectCard appProjectId={appProjectId} compact />
        </DialogContent>
      </Dialog>
    </>
  );
}
