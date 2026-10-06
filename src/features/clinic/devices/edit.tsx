import type { HttpError } from "@refinedev/core";
import { useForm } from "@refinedev/react-hook-form";
import { useNavigate } from "react-router";

import { EditView, EditViewHeader } from "@/shared/components/views/edit-view";
import { Button } from "@/shared/ui/button";
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
  FormDescription,
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
import type { Device } from "@/domains/device/types";
import { DEVICE_STATUS_LABELS, SETTABLE_DEVICE_STATUS_OPTIONS } from "@/domains/device/types";
import { DeviceFields } from "./device-fields";

/**
 * Editing a device. Its status can be moved between available, maintenance
 * and retired; a device on a patient has to be taken back first, and
 * "assigned" is never chosen here — handing the device out sets it.
 */
export const DeviceEdit = () => {
  const navigate = useNavigate();
  const {
    refineCore: { onFinish, query },
    ...form
  } = useForm<Device, HttpError, Device>({ refineCoreProps: {} });
  const assigned = query?.data?.data?.status === "assigned";

  function onSubmit(values: Device) {
    onFinish({
      serialNumber: values.serialNumber ?? "",
      model: values.model ?? "",
      manufacturer: values.manufacturer ?? "",
      deviceType: values.deviceType ?? "",
      // Left out while assigned: the API would refuse any change, and sending
      // "assigned" back would be read as setting it by hand.
      ...(assigned ? {} : { status: values.status }),
    } as unknown as Device);
  }

  return (
    <EditView>
      <EditViewHeader />
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="min-w-0">
          <SectionedFormPanel>
            <FormSection title="Thiết bị" description="Mã thiết bị không đổi được.">
              <DeviceFields control={form.control} />
            </FormSection>
            <FormSection title="Trạng thái" description="Bảo trì hoặc ngừng sử dụng chỉ khi thiết bị không đang gán cho bệnh nhân.">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem className="md:col-span-4">
                    <FormLabel>Trạng thái</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? ""} disabled={assigned}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder={assigned ? DEVICE_STATUS_LABELS.assigned : undefined} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {SETTABLE_DEVICE_STATUS_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {assigned && (
                      <FormDescription>Thiết bị đang gán cho bệnh nhân — thu hồi trước khi đổi trạng thái.</FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </FormSection>
            <FormSectionActions>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Đang lưu..." : "Lưu"}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                Hủy
              </Button>
            </FormSectionActions>
          </SectionedFormPanel>
        </form>
      </Form>
    </EditView>
  );
};
