import type { HttpError } from "@refinedev/core";
import { useForm } from "@refinedev/react-hook-form";
import { useNavigate } from "react-router";

import { CreateView, CreateViewHeader } from "@/shared/components/views/create-view";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
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
import { DeviceFields } from "./device-fields";

type DeviceFormValues = {
  deviceCode: string;
  serialNumber: string;
  model: string;
  manufacturer: string;
  deviceType: string;
};

/** Registering a device the clinic has received. It starts available. */
export const DeviceCreate = () => {
  const navigate = useNavigate();
  const {
    refineCore: { onFinish },
    ...form
  } = useForm<DeviceFormValues, HttpError, DeviceFormValues>({
    refineCoreProps: { redirect: "show" },
    defaultValues: { deviceCode: "", serialNumber: "", model: "", manufacturer: "", deviceType: "WRIST_MONITOR" },
  });

  return (
    <CreateView>
      <CreateViewHeader />
      <Form {...form}>
        <form onSubmit={form.handleSubmit((values) => onFinish(values))} className="min-w-0">
          <SectionedFormPanel>
            <FormSection title="Thiết bị" description="Mã thiết bị là mã dán trên vỏ, dùng để nhận diện khi gán và trong lịch sử.">
              <FormField
                control={form.control}
                name="deviceCode"
                rules={{ required: "Vui lòng nhập mã thiết bị", maxLength: { value: 64, message: "Tối đa 64 ký tự" } }}
                render={({ field }) => (
                  <FormItem className="md:col-span-4">
                    <FormLabel>Mã thiết bị</FormLabel>
                    <FormControl>
                      <Input {...field} className="font-mono uppercase" placeholder="VC-W-004" />
                    </FormControl>
                    <FormDescription>Không đổi được sau khi tạo.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DeviceFields control={form.control} />
            </FormSection>
            <FormSectionActions>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Đang lưu..." : "Đăng ký thiết bị"}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                Hủy
              </Button>
            </FormSectionActions>
          </SectionedFormPanel>
        </form>
      </Form>
    </CreateView>
  );
};
