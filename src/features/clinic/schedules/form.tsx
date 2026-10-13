import type { HttpError } from "@refinedev/core";
import { useForm } from "@refinedev/react-hook-form";
import { useNavigate, useSearchParams } from "react-router";

import { CreateView, CreateViewHeader } from "@/shared/components/views/create-view";
import { EditView, EditViewHeader } from "@/shared/components/views/edit-view";
import { Alert, AlertDescription } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
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
import type { DoctorSchedule } from "@/domains/schedule/types";
import { clinicToday } from "../appointments/clinic-day";
import { useOwnClinicDoctors } from "./use-doctors";

type BlockedTimeValues = {
  workDate: string;
  startTime: string;
  endTime: string;
  note: string;
};

/**
 * A period a doctor takes no patients in (SRS 3.11.7, "chặn khoảng thời
 * gian"): a day, a range of time, and why. Its turns leave that day's queue.
 *
 * Whose it is comes from the schedule screen that opened the form
 * (`?doctorId=`) and is fixed once saved. The API refuses a period that
 * covers a visit somebody has already registered.
 */
function BlockedTimeForm({ submitLabel, doctorId }: { submitLabel: string; doctorId?: number }) {
  const navigate = useNavigate();
  const {
    refineCore: { onFinish, query },
    ...form
  } = useForm<DoctorSchedule, HttpError, BlockedTimeValues>({
    refineCoreProps: { resource: "doctor_schedules", redirect: "list" },
    defaultValues: { workDate: "", startTime: "", endTime: "", note: "" },
  });
  const record = query?.data?.data;
  const { doctors } = useOwnClinicDoctors();
  const doctorName = record?.doctor.fullName ?? doctors.find((doctor) => doctor.id === doctorId)?.fullName;

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((values) =>
          // Only what the API takes: an edit's loaded record carries far more.
          onFinish({
            ...(doctorId ? { employeeId: doctorId } : {}),
            workDate: values.workDate,
            startTime: values.startTime,
            endTime: values.endTime,
            note: values.note ?? "",
          } as unknown as BlockedTimeValues)
        )}
        className="min-w-0"
      >
        <SectionedFormPanel>
          <FormSection
            title={doctorName ? `Chặn khoảng thời gian — ${doctorName}` : "Chặn khoảng thời gian"}
            description="Bác sĩ không nhận khám trong khoảng này. Nếu đã có người đăng ký rơi vào đó, cần đổi lịch hoặc huỷ các lượt ấy trước."
          >
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
              name="note"
              rules={{ maxLength: { value: 255, message: "Tối đa 255 ký tự" } }}
              render={({ field }) => (
                <FormItem className="md:col-span-8">
                  <FormLabel>Lý do</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ""} placeholder="Không khả dụng" />
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

export const DoctorScheduleCreate = () => {
  const [params] = useSearchParams();
  const doctorId = Number(params.get("doctorId"));

  return (
    <CreateView>
      <CreateViewHeader resource="doctor_schedules" title="Chặn khoảng thời gian" />
      {doctorId ? (
        <BlockedTimeForm submitLabel="Chặn khoảng thời gian" doctorId={doctorId} />
      ) : (
        <Alert>
          <AlertDescription>
            Mở màn này từ "Lịch làm việc bác sĩ", sau khi chọn bác sĩ, để biết đang chặn giờ của ai.
          </AlertDescription>
        </Alert>
      )}
    </CreateView>
  );
};

export const DoctorScheduleEdit = () => (
  <EditView>
    <EditViewHeader resource="doctor_schedules" title="Sửa khoảng thời gian chặn" />
    <BlockedTimeForm submitLabel="Lưu thay đổi" />
  </EditView>
);
