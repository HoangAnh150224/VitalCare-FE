import type { Control, FieldValues, Path } from "react-hook-form";

import {
  CLINIC_POSITION_OPTIONS,
  PROFESSIONAL_TITLE_OPTIONS,
  SPECIALTY_OPTIONS,
} from "@/domains/employee/types";
import { Input } from "@/shared/ui/input";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/shared/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";

/** Radix forbids an empty item value, so "nothing chosen" travels as this and is stored as "". */
const NONE = "__none__";

const SELECT_FIELDS: { name: string; label: string; options: readonly string[] }[] = [
  { name: "specialty", label: "Chuyên khoa", options: SPECIALTY_OPTIONS },
  { name: "professionalTitle", label: "Chức danh", options: PROFESSIONAL_TITLE_OPTIONS },
  { name: "clinicPosition", label: "Vị trí công tác", options: CLINIC_POSITION_OPTIONS },
];

/** The professional record — the part of a member of staff both forms edit. */
export function ProfileFields<T extends FieldValues>({ control }: { control: Control<T> }) {
  return (
    <>
      {SELECT_FIELDS.map((item) => (
        <FormField
          key={item.name}
          control={control}
          name={item.name as Path<T>}
          render={({ field }) => {
            const current: string = field.value ?? "";
            // A value saved before the list existed stays selectable until someone changes it.
            const legacy = current && !item.options.includes(current) ? current : null;
            return (
              <FormItem className="md:col-span-4">
                <FormLabel>{item.label}</FormLabel>
                <Select
                  value={current || NONE}
                  onValueChange={(value) => field.onChange(value === NONE ? "" : value)}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={NONE}>Không chọn</SelectItem>
                    {legacy && <SelectItem value={legacy}>{legacy}</SelectItem>}
                    {item.options.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            );
          }}
        />
      ))}
      <FormField
        control={control}
        name={"licenseNo" as Path<T>}
        rules={{ maxLength: { value: 128, message: "Tối đa 128 ký tự" } }}
        render={({ field }) => (
          <FormItem className="md:col-span-4">
            <FormLabel>Số chứng chỉ hành nghề</FormLabel>
            <FormControl>
              <Input {...field} value={field.value ?? ""} placeholder="Nhập số chứng chỉ hành nghề" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}
