import * as React from "react";
import * as CollapsiblePrimitive from "@radix-ui/react-collapsible";
import { cn } from "@/lib/utils";

function preserveWindowScroll(run: () => void) {
  const scrollX = window.scrollX;
  const scrollY = window.scrollY;
  run();
  const restore = () => {
    window.scrollTo(scrollX, scrollY);
  };
  restore();
  requestAnimationFrame(restore);
  requestAnimationFrame(() => requestAnimationFrame(restore));
  for (const delay of [0, 16, 50, 120, 220, 350]) {
    window.setTimeout(restore, delay);
  }
}

const Collapsible = ({
  onOpenChange,
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.Root>) => {
  const handleOpenChange = React.useCallback(
    (open: boolean) => {
      if (!onOpenChange) return;
      preserveWindowScroll(() => onOpenChange(open));
    },
    [onOpenChange],
  );

  return (
    <CollapsiblePrimitive.Root
      {...props}
      onOpenChange={onOpenChange ? handleOpenChange : undefined}
    />
  );
};

const CollapsibleTrigger = React.forwardRef<
  React.ElementRef<typeof CollapsiblePrimitive.CollapsibleTrigger>,
  React.ComponentPropsWithoutRef<typeof CollapsiblePrimitive.CollapsibleTrigger>
>(({ onMouseDown, ...props }, ref) => (
  <CollapsiblePrimitive.CollapsibleTrigger
    ref={ref}
    onMouseDown={(event) => {
      // Не даём браузеру прокручивать страницу к триггеру при фокусе после клика.
      event.preventDefault();
      onMouseDown?.(event);
    }}
    {...props}
  />
));
CollapsibleTrigger.displayName = CollapsiblePrimitive.CollapsibleTrigger.displayName;

const CollapsibleContent = React.forwardRef<
  React.ElementRef<typeof CollapsiblePrimitive.CollapsibleContent>,
  React.ComponentPropsWithoutRef<typeof CollapsiblePrimitive.CollapsibleContent>
>(({ className, children, ...props }, ref) => (
  <CollapsiblePrimitive.CollapsibleContent
    ref={ref}
    className={cn(
      "grid overflow-hidden transition-[grid-template-rows] duration-200 ease-out [overflow-anchor:none]",
      "data-[state=open]:grid-rows-[1fr] data-[state=closed]:grid-rows-[0fr]",
    )}
    {...props}
  >
    <div className={cn("min-h-0 overflow-hidden", className)}>{children}</div>
  </CollapsiblePrimitive.CollapsibleContent>
));
CollapsibleContent.displayName = CollapsiblePrimitive.CollapsibleContent.displayName;

export { Collapsible, CollapsibleTrigger, CollapsibleContent };
