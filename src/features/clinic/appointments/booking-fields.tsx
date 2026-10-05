import { useCallback, useEffect, useState } from "react";
import { useSelect } from "@refinedev/core";
import { useFormContext, useWatch, type Control } from "react-hook-form";

import { Input } from "@/shared/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/ui/form";
import type { Clinic } from "@/domains/clinic/types";
import type { BookingFormValues } from "./booking";
import { clinicToday } from "./clinic-day";
import { SlotPicker } from "./slot-picker";

/**
 * Where, when and why — the part of a booking both the front desk and a
 * customer fill in. When is a clinic, a day, then one of that day's slots.
 */
export function BookingFields({ control }: { control: Control<BookingFormValues> }) {
  const { setValue, getValues } = useFormContext<BookingFormValues>();
  const clinicId = useWatch({ control, name: "clinicId" });
  const date = useWatch({ control, name: "appointmentDate" });
  const [lastBookableDate, setLastBookableDate] = useState<string | undefined>();

  const { options: clinicOptions } = useSelect<Clinic>({
    resource: "clinics",
    optionLabel: "name",
    optionValue: "id",
    pagination: { mode: "off" },
  });

  // Most deployments have one clinic; asking somebody to choose from a list
  // of one is a step for nothing.
  useEffect(() => {
    if (clinicOptions.length === 1 && !getValues("clinicId")) {
      setValue("clinicId", String(clinicOptions[0].value));
    }
  }, [clinicOptions, getValues, setValue]);

  // A slot belongs to one clinic on one day; change either and the choice no
  // longer means anything.
  useEffect(() => {
    setValue("startTime", "");
  }, [clinicId, date, setValue]);

  const onWindow = useCallback((value: string) => setLastBookableDate(value), []);

  return (
    <>
      <FormField
        control={control}
        name="clinicId"
        rules={{ required: "Vui lòng chọn phòng khám" }}
        render={({ field }) => (
          <FormItem className="md:col-span-5">
            <FormLabel>Phòng khám</FormLabel>
            <Select onValueChange={field.onChange} value={field.value ?? ""}>
              <FormControl>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Chọn phòng khám" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {clinicOptions.map((option) => (
                  <SelectItem key={String(option.value)} value={String(option.value)}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="appointmentDate"
        rules={{ required: "Vui lòng chọn ngày" }}
        render={({ field }) => (
          <FormItem className="md:col-span-3">
            <FormLabel>Ngày khám</FormLabel>
            <FormControl>
              <Input
                {...field}
                type="date"
                min={clinicToday()}
                max={lastBookableDate}
                value={field.value ?? ""}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="startTime"
        rules={{ required: "Vui lòng chọn một khung giờ" }}
        render={({ field }) => (
          <FormItem className="md:col-span-8">
            <FormLabel>Khung giờ</FormLabel>
            <SlotPicker
              clinicId={clinicId}
              date={date}
              value={field.value}
              onChange={field.onChange}
              onWindow={onWindow}
            />
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="reason"
        rules={{ maxLength: { value: 255, message: "Tối đa 255 ký tự" } }}
        render={({ field }) => (
          <FormItem className="md:col-span-8">
            <FormLabel>Lý do khám</FormLabel>
            <FormControl>
              <Input {...field} value={field.value ?? ""} placeholder="Khám tổng quát" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}
