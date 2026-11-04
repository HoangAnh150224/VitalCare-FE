import type { Control, FieldValues, Path } from "react-hook-form";

import { Input } from "@/shared/ui/input";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/shared/ui/form";

/** The professional record — the part of a member of staff both forms edit. */
export function ProfileFields<T extends FieldValues>({ control }: { control: Control<T> }) {
  const fields: { name: string; label: string; max: number; span: string }[] = [
    { name: "specialty", label: "Chuyên khoa", max: 255, span: "md:col-span-4" },
    { name: "professionalTitle", label: "Chức danh", max: 255, span: "md:col-span-4" },
    { name: "licenseNo", label: "Số chứng chỉ hành nghề", max: 128, span: "md:col-span-4" },
    { name: "clinicPosition", label: "Vị trí công tác", max: 128, span: "md:col-span-4" },
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
            <FormItem className={item.span}>
              <FormLabel>{item.label}</FormLabel>
              <FormControl>
                <Input {...field} value={field.value ?? ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      ))}
    </>
  );
}
