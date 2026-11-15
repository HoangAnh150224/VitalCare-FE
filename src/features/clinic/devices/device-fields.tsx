import type { Control, FieldValues, Path } from "react-hook-form";

import { Input } from "@/shared/ui/input";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/shared/ui/form";

/** What a device is — the fields both the register and the edit form carry. */
export function DeviceFields<T extends FieldValues>({ control, required = false }: { control: Control<T>; required?: boolean }) {
  const fields: { name: string; label: string; max: number; placeholder?: string }[] = [
    { name: "serialNumber", label: "Số serial", max: 128 },
    { name: "model", label: "Model", max: 255, placeholder: "VC Band 1" },
    { name: "manufacturer", label: "Hãng sản xuất", max: 255 },
    { name: "deviceType", label: "Loại thiết bị", max: 128, placeholder: "WRIST_MONITOR" },
  ];

  return (
    <>
      {fields.map((item) => (
        <FormField
          key={item.name}
          control={control}
          name={item.name as Path<T>}
          rules={{ required: required ? `Vui lòng nhập ${item.label.toLocaleLowerCase("vi-VN")}` : false, validate: (value) => !required || !!String(value ?? "").trim() || `Vui lòng nhập ${item.label.toLocaleLowerCase("vi-VN")}`, maxLength: { value: item.max, message: `Tối đa ${item.max} ký tự` } }}
          render={({ field }) => (
            <FormItem className="md:col-span-4">
              <FormLabel>{item.label}{required && <span className="text-destructive" aria-hidden="true"> *</span>}</FormLabel>
              <FormControl>
                <Input {...field} aria-required={required} value={field.value ?? ""} placeholder={item.placeholder ?? `Nhập ${item.label.toLocaleLowerCase("vi-VN")}`} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      ))}
    </>
  );
}
