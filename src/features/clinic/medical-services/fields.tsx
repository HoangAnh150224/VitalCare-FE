import type { Control } from "react-hook-form";

import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/shared/ui/form";
import type { ServiceCategory, ServiceStatus } from "@/domains/billing/types";
import { SERVICE_CATEGORY_OPTIONS, SERVICE_STATUS_LABELS } from "@/domains/billing/types";

export type MedicalServiceFormValues = {
  code: string;
  name: string;
  description: string;
  price: number;
  category: ServiceCategory;
  turnaroundMinutes: number;
  status: ServiceStatus;
};

export const EMPTY_MEDICAL_SERVICE: MedicalServiceFormValues = {
  code: "",
  name: "",
  description: "",
  price: 0,
  category: "lab",
  turnaroundMinutes: 60,
  status: "active",
};

/** A catalogue entry's fields, the same on create and edit. */
export function MedicalServiceFields({ control }: { control: Control<MedicalServiceFormValues> }) {
  return (
    <>
      <FormField
        control={control}
        name="code"
        rules={{ required: "Vui lòng nhập mã dịch vụ", maxLength: { value: 64, message: "Tối đa 64 ký tự" } }}
        render={({ field }) => (
          <FormItem className="md:col-span-4">
            <FormLabel>Mã dịch vụ</FormLabel>
            <FormControl>
              <Input {...field} className="font-mono uppercase" placeholder="XN-CTM" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="name"
        rules={{ required: "Vui lòng nhập tên dịch vụ", maxLength: { value: 255, message: "Tối đa 255 ký tự" } }}
        render={({ field }) => (
          <FormItem className="md:col-span-8">
            <FormLabel>Tên dịch vụ</FormLabel>
            <FormControl>
              <Input {...field} placeholder="Xét nghiệm công thức máu" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="category"
        render={({ field }) => (
          <FormItem className="md:col-span-4">
            <FormLabel>Nhóm</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {SERVICE_CATEGORY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormDescription>"Khám bệnh" là phí khám tính vào mọi hóa đơn, không chỉ định được.</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="price"
        rules={{
          required: "Vui lòng nhập giá",
          min: { value: 0, message: "Giá không âm" },
          validate: (value) => Number.isInteger(Number(value)) || "Giá là số đồng nguyên",
        }}
        render={({ field }) => (
          <FormItem className="md:col-span-4">
            <FormLabel>Giá (đồng)</FormLabel>
            <FormControl>
              <Input {...field} type="number" min={0} step={1000} inputMode="numeric" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="turnaroundMinutes"
        rules={{
          required: "Vui lòng nhập thời gian trả kết quả",
          min: { value: 0, message: "Không âm" },
          max: { value: 43200, message: "Tối đa 30 ngày" },
        }}
        render={({ field }) => (
          <FormItem className="md:col-span-4">
            <FormLabel>Thời gian trả kết quả (phút)</FormLabel>
            <FormControl>
              <Input {...field} type="number" min={0} step={5} inputMode="numeric" />
            </FormControl>
            <FormDescription>Giờ dự kiến có kết quả = lúc chỉ định + số phút này.</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="status"
        render={({ field }) => (
          <FormItem className="md:col-span-4">
            <FormLabel>Trạng thái</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {(Object.keys(SERVICE_STATUS_LABELS) as ServiceStatus[]).map((value) => (
                  <SelectItem key={value} value={value}>
                    {SERVICE_STATUS_LABELS[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormDescription>Ngừng áp dụng thì không chỉ định mới được; chỉ định cũ giữ nguyên giá.</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="description"
        rules={{ maxLength: { value: 2000, message: "Tối đa 2000 ký tự" } }}
        render={({ field }) => (
          <FormItem className="md:col-span-12">
            <FormLabel>Mô tả</FormLabel>
            <FormControl>
              <Textarea {...field} value={field.value ?? ""} rows={3} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}

/** What the API takes: numbers as numbers, an empty description as none. */
export const toMedicalServiceRequest = (values: MedicalServiceFormValues) => ({
  ...values,
  code: values.code.trim().toUpperCase(),
  price: Number(values.price),
  turnaroundMinutes: Number(values.turnaroundMinutes),
  description: values.description?.trim() || null,
});
