import type { Control, FieldValues, Path } from "react-hook-form";

import { Input } from "@/shared/ui/input";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/shared/ui/form";

/** What a device is — the fields both the register and the edit form carry. */
export function DeviceFields<T extends FieldValues>({ control }: { control: Control<T> }) {
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
          rules={{ maxLength: { value: item.max, message: `Tối đa ${item.max} ký tự` } }}
          render={({ field }) => (
            <FormItem className="md:col-span-4">
              <FormLabel>{item.label}</FormLabel>
              <FormControl>
                <Input {...field} value={field.value ?? ""} placeholder={item.placeholder} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      ))}
    </>
  );
}
