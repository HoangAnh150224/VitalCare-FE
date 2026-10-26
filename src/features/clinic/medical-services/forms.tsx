import type { HttpError } from "@refinedev/core";
import { useForm } from "@refinedev/react-hook-form";
import { useNavigate } from "react-router";

import { CreateView, CreateViewHeader } from "@/shared/components/views/create-view";
import { EditView, EditViewHeader } from "@/shared/components/views/edit-view";
import { Button } from "@/shared/ui/button";
import { Form } from "@/shared/ui/form";
import { FormSection, FormSectionActions, SectionedFormPanel } from "@/shared/components/form/form-section";
import {
  EMPTY_MEDICAL_SERVICE,
  MedicalServiceFields,
  toMedicalServiceRequest,
  type MedicalServiceFormValues,
} from "./fields";

/** Create and edit are the same form; only the header and the starting values differ. */
function MedicalServiceForm({ mode }: { mode: "create" | "edit" }) {
  const navigate = useNavigate();
  const {
    refineCore: { onFinish },
    ...form
  } = useForm<MedicalServiceFormValues, HttpError, MedicalServiceFormValues>({
    refineCoreProps: { resource: "medical_services", redirect: "list" },
    defaultValues: mode === "create" ? EMPTY_MEDICAL_SERVICE : undefined,
  });

  const body = (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((values) =>
          onFinish(toMedicalServiceRequest(values) as unknown as MedicalServiceFormValues),
        )}
        className="min-w-0"
      >
        <SectionedFormPanel>
          <FormSection
            title="Dịch vụ"
            description="Danh mục dùng chung cho mọi cơ sở. Đổi giá chỉ áp dụng cho chỉ định mới."
          >
            <MedicalServiceFields control={form.control} />
          </FormSection>
          <FormSectionActions>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Đang lưu..." : mode === "create" ? "Thêm dịch vụ" : "Lưu"}
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate(-1)}>
              Hủy
            </Button>
          </FormSectionActions>
        </SectionedFormPanel>
      </form>
    </Form>
  );

  return mode === "create" ? (
    <CreateView>
      <CreateViewHeader />
      {body}
    </CreateView>
  ) : (
    <EditView>
      <EditViewHeader />
      {body}
    </EditView>
  );
}

export const MedicalServiceCreate = () => <MedicalServiceForm mode="create" />;
export const MedicalServiceEdit = () => <MedicalServiceForm mode="edit" />;
