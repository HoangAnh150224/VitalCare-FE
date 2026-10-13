import { useCan, useSelect, type HttpError } from "@refinedev/core";
import { useForm } from "@refinedev/react-hook-form";
import { useNavigate } from "react-router";

import { CreateView, CreateViewHeader } from "@/shared/components/views/create-view";
import { EditView, EditViewHeader } from "@/shared/components/views/edit-view";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/ui/form";
import {
  FormSection,
  FormSectionActions,
  SectionedFormPanel,
} from "@/shared/components/form/form-section";
import type { Employee } from "@/domains/employee/types";
import type { DoctorSchedule, ScheduleStatus } from "@/domains/schedule/types";
import { SCHEDULE_STATUS_OPTIONS } from "@/domains/schedule/types";
import { clinicToday } from "../appointments/clinic-day";

type ScheduleFormValues = {
  employeeId: string;
  workDate: string;
  startTime: string;
  endTime: string;
  status: ScheduleStatus;
  note: string;
};

/**
 * One period of a doctor's day, to add or to change.
 *
 * Whose it is is asked only of somebody who can pick: a clinic administrator
 * reads the staff list and chooses the doctor; a doctor cannot, and the API
 * makes the period theirs. It is fixed once saved.
 */
function ScheduleForm({ submitLabel, creating }: { submitLabel: string; creating: boolean }) {
  const navigate = useNavigate();
  const {
    refineCore: { onFinish, query },
    ...form
  } = useForm<DoctorSchedule, HttpError, ScheduleFormValues>({
    refineCoreProps: { resource: "doctor_schedules", redirect: "list" },
    defaultValues: { employeeId: "", workDate: "", startTime: "", endTime: "", status: "working", note: "" },
  });
  const record = query?.data?.data;

  const { data: canListStaff } = useCan({ resource: "employees", action: "list" });
  const pickDoctor = creating && (canListStaff?.can ?? false);
  const { options: doctorOptions } = useSelect<Employee>({
    resource: "employees",
    optionLabel: "fullName",
    optionValue: "id",
    filters: [
      { field: "staffType", operator: "eq", value: "doctor" },
      { field: "status", operator: "eq", value: "active" },
    ],
    // ponytail: one page of 200. The provider always sends a window, so "off"
    // would mean its default 10; a searchable picker when a clinic outgrows this.
    pagination: { pageSize: 200 },
    queryOptions: { enabled: pickDoctor },
  });

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((values) =>
          // Only what the API takes: an edit's loaded record carries far more.
          onFinish({
            ...(pickDoctor ? { employeeId: Number(values.employeeId) } : {}),
            workDate: values.workDate,
            startTime: values.startTime,
            endTime: values.endTime,
            status: values.status,
            note: values.note ?? "",
          } as unknown as ScheduleFormValues)
        )}
        className="min-w-0"
      >
        <SectionedFormPanel>
          <FormSection
            title={record ? `Ca của ${record.doctor.fullName}` : "Ca làm việc"}
            description="Hai ca của cùng một bác sĩ trong một ngày không được chồng giờ nhau."
          >
            {pickDoctor && (
              <FormField
                control={form.control}
                name="employeeId"
                rules={{ required: "Vui lòng chọn bác sĩ" }}
                render={({ field }) => (
                  <FormItem className="md:col-span-6">
                    <FormLabel>Bác sĩ</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? ""}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Chọn bác sĩ" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {doctorOptions.map((option) => (
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
            )}
            <FormField
              control={form.control}
              name="workDate"
              rules={{ required: "Vui lòng chọn ngày" }}
              render={({ field }) => (
                <FormItem className="md:col-span-3">
                  <FormLabel>Ngày</FormLabel>
                  <FormControl>
                    <Input {...field} type="date" min={clinicToday()} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="startTime"
              rules={{ required: "Vui lòng nhập giờ bắt đầu" }}
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Từ</FormLabel>
                  <FormControl>
                    <Input {...field} type="time" value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="endTime"
              rules={{
                required: "Vui lòng nhập giờ kết thúc",
                validate: (value, values) => value > values.startTime || "Giờ kết thúc phải sau giờ bắt đầu",
              }}
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Đến</FormLabel>
                  <FormControl>
                    <Input {...field} type="time" value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem className="md:col-span-3">
                  <FormLabel>Loại</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? "working"}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {SCHEDULE_STATUS_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
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
              control={form.control}
              name="note"
              rules={{ maxLength: { value: 255, message: "Tối đa 255 ký tự" } }}
              render={({ field }) => (
                <FormItem className="md:col-span-8">
                  <FormLabel>Ghi chú</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ""} placeholder="Ví dụ: trực phòng khám số 2" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </FormSection>
          <FormSectionActions>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Đang lưu..." : submitLabel}
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate(-1)}>
              Hủy
            </Button>
          </FormSectionActions>
        </SectionedFormPanel>
      </form>
    </Form>
  );
}

export const DoctorScheduleCreate = () => (
  <CreateView>
    <CreateViewHeader resource="doctor_schedules" />
    <ScheduleForm submitLabel="Thêm ca" creating />
  </CreateView>
);

export const DoctorScheduleEdit = () => (
  <EditView>
    <EditViewHeader resource="doctor_schedules" />
    <ScheduleForm submitLabel="Lưu thay đổi" creating={false} />
  </EditView>
);
