import { CheckIcon, ChevronsUpDownIcon } from "lucide-react";
import { forwardRef, useState } from "react";

import { Button } from "@/shared/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/shared/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { cn } from "@/shared/lib/utils";
import { formatMoney } from "@/shared/lib/format";
import type { MedicalService } from "@/domains/billing/types";
import { SERVICE_CATEGORY_LABELS } from "@/domains/billing/types";

/** "Công thức máu" is found by "cong thuc mau" too. */
const fold = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();

type Props = {
  services: MedicalService[];
  value: string;
  onChange: (serviceId: string) => void;
  id?: string;
  "aria-label"?: string;
};

/**
 * Choosing a service from the catalogue by typing part of its name: the list
 * grows past what a plain dropdown can be scrolled through. Grouped by category.
 */
export const ServicePicker = forwardRef<HTMLButtonElement, Props>(function ServicePicker(
  { services, value, onChange, id, "aria-label": ariaLabel },
  ref
) {
  const [open, setOpen] = useState(false);
  const chosen = services.find((s) => String(s.id) === value);
  const categories = [...new Set(services.map((s) => s.category))];

  return (
    // Modal, so its list still scrolls when the picker sits inside a dialog.
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        <Button
          ref={ref}
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label={ariaLabel}
          className="w-full justify-between font-normal"
        >
          <span className={cn("truncate", !chosen && "text-muted-foreground")}>
            {chosen ? `${chosen.name} · ${formatMoney(chosen.price)}` : "Chọn dịch vụ"}
          </span>
          <ChevronsUpDownIcon className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) min-w-72 p-0" align="start">
        <Command filter={(itemValue, search) => (fold(itemValue).includes(fold(search.trim())) ? 1 : 0)}>
          <CommandInput placeholder="Tìm dịch vụ..." />
          <CommandList>
            <CommandEmpty>Không tìm thấy dịch vụ.</CommandEmpty>
            {categories.map((category) => (
              <CommandGroup key={category} heading={SERVICE_CATEGORY_LABELS[category]}>
                {services
                  .filter((s) => s.category === category)
                  .map((service) => (
                    <CommandItem
                      key={service.id}
                      // Unique per item, and what the search matches against.
                      value={`${service.name} ${SERVICE_CATEGORY_LABELS[service.category]} #${service.id}`}
                      onSelect={() => {
                        onChange(String(service.id));
                        setOpen(false);
                      }}
                    >
                      <CheckIcon className={cn(String(service.id) === value ? "opacity-100" : "opacity-0")} />
                      <span className="min-w-0 flex-1 truncate">{service.name}</span>
                      <span className="text-muted-foreground text-xs tabular-nums">{formatMoney(service.price)}</span>
                    </CommandItem>
                  ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
});
