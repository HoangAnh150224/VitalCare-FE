import type { HttpError } from "@refinedev/core";
import { useNotification } from "@refinedev/core";
import { useForm } from "@refinedev/react-hook-form";
import { useRef, useState } from "react";
import { useNavigate } from "react-router";

import { kyInstance } from "@/shared/api/data";
import {
  CreateView,
  CreateViewHeader,
} from "@/shared/components/views/create-view";
import { EditView, EditViewHeader } from "@/shared/components/views/edit-view";
import {
  FormSection,
  FormSectionActions,
  SectionedFormPanel,
} from "@/shared/components/form/form-section";
import {
  EmergencyWarning,
  GuidanceBody,
} from "@/shared/components/first-aid/guidance";
import { Alert, AlertDescription } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/ui/form";
import { Input } from "@/shared/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { Textarea } from "@/shared/ui/textarea";
import type {
  FirstAidArticle,
  FirstAidCategory,
} from "@/domains/first-aid/types";
import { FIRST_AID_CATEGORY_OPTIONS } from "@/domains/first-aid/types";
import { billingErrorText } from "@/domains/billing/messages";
import { revisionLabel } from "./parts";

type Values = {
  title: string;
  category: FirstAidCategory;
  summary: string;
  body: string;
  emergencyWarning: string;
};

const EMPTY: Values = {
  title: "",
  category: "general",
  summary: "",
  // The headings of SRS 3.17.2, so a new article starts in the shape patients read.
  body: "## Tình huống\n\n\n## Việc cần làm ngay\n1. \n\n## Những điều không nên làm\n- \n\n## Khi nào cần hỗ trợ y tế\n",
  emergencyWarning: "",
};

/** The marks the body understands, inserted at the caret: SRS 3.17.5's toolbar. */
const MARKS = [
  { label: "Tiêu đề", text: "\n## " },
  { label: "Đoạn văn", text: "\n\n" },
  { label: "Các bước", text: "\n1. " },
  { label: "Danh sách", text: "\n- " },
];

/**
 * SRS 3.17.5 / 3.17.7: create and edit are one form. Saving keeps a draft;
 * "Lưu & gửi duyệt" saves and sends it on. Editing an article past the draft
 * stage starts its next revision — the screen says so before anybody saves.
 */
function FirstAidForm({ mode }: { mode: "create" | "edit" }) {
  const navigate = useNavigate();
  const { open } = useNotification();
  const bodyRef = useRef<HTMLTextAreaElement | null>(null);
  const [sending, setSending] = useState(false);
  const {
    refineCore: { onFinish, query },
    ...form
  } = useForm<Values, HttpError, Values>({
    refineCoreProps: { resource: "first_aid_articles", redirect: false },
    defaultValues: mode === "create" ? EMPTY : undefined,
  });
  const current = query?.data?.data as FirstAidArticle | undefined;
  const values = form.watch();

  const save = (andSubmit: boolean) =>
    form.handleSubmit(async (input) => {
      const result = await onFinish({
        title: input.title,
        category: input.category,
        summary: input.summary,
        body: input.body,
        emergencyWarning: input.emergencyWarning,
      });
      const id =
        (result?.data as FirstAidArticle | undefined)?.id ?? current?.id;
      if (!id) return;
      if (andSubmit) {
        setSending(true);
        try {
          await kyInstance.post(`first_aid_articles/${id}/submit`, {
            json: {},
          });
          open?.({ type: "success", message: "Đã lưu và gửi duyệt" });
        } catch (error) {
          open?.({
            type: "error",
            message: billingErrorText(error as { message?: string }),
          });
        } finally {
          setSending(false);
        }
      }
      navigate(`/first-aid-articles/show/${id}`);
    });

  const insert = (text: string) => {
    const area = bodyRef.current;
    const body = form.getValues("body") ?? "";
    const at = area?.selectionStart ?? body.length;
    form.setValue("body", body.slice(0, at) + text + body.slice(at), {
      shouldDirty: true,
    });
    requestAnimationFrame(() => {
      area?.focus();
      area?.setSelectionRange(at + text.length, at + text.length);
    });
  };

  const busy = form.formState.isSubmitting || sending;
  const startsNextRevision =
    mode === "edit" && current && current.status !== "draft";

  const body = (
    <Form {...form}>
      <form onSubmit={save(false)} className="min-w-0">
        {startsNextRevision && (
          <Alert className="mb-4">
            <AlertDescription>
              Bài đang ở trạng thái khác bản nháp. Lưu sẽ tạo phiên bản{" "}
              {revisionLabel(current.revision + 1)} dạng bản nháp và cần duyệt
              lại.
              {current.publishedRevision
                ? ` Bệnh nhân vẫn xem ${revisionLabel(
                    current.publishedRevision
                  )} cho tới khi bản mới được xuất bản.`
                : ""}
            </AlertDescription>
          </Alert>
        )}
        <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_26rem] xl:items-start">
          <SectionedFormPanel>
            <FormSection
              title="Bản nháp nội dung"
              description="Soạn theo cấu trúc. Cần người có quyền duyệt trước khi xuất bản."
            >
              <FormField
                control={form.control}
                name="title"
                rules={{
                  required: "Nhập tiêu đề",
                  maxLength: { value: 200, message: "Tối đa 200 ký tự" },
                }}
                render={({ field }) => (
                  <FormItem className="md:col-span-8">
                    <FormLabel>Tiêu đề</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Khó thở" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="category"
                rules={{ required: "Chọn danh mục" }}
                render={({ field }) => (
                  <FormItem className="md:col-span-4">
                    <FormLabel>Danh mục</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full" aria-label="Danh mục">
                          <SelectValue placeholder="Chọn danh mục" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {FIRST_AID_CATEGORY_OPTIONS.map((option) => (
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
                name="summary"
                rules={{
                  required: "Nhập tóm tắt",
                  maxLength: { value: 500, message: "Tối đa 500 ký tự" },
                }}
                render={({ field }) => (
                  <FormItem className="md:col-span-12">
                    <FormLabel>Tóm tắt</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        rows={2}
                        placeholder="Tóm tắt ngắn gọn, dễ hiểu cho ứng dụng bệnh nhân."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="body"
                rules={{
                  required: "Nhập nội dung hướng dẫn",
                  maxLength: { value: 20000, message: "Tối đa 20.000 ký tự" },
                }}
                render={({ field }) => (
                  <FormItem className="md:col-span-12">
                    <FormLabel>Nội dung</FormLabel>
                    <div className="flex flex-wrap gap-1">
                      {MARKS.map((mark) => (
                        <Button
                          key={mark.label}
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => insert(mark.text)}
                        >
                          {mark.label}
                        </Button>
                      ))}
                    </div>
                    <FormControl>
                      <Textarea
                        {...field}
                        ref={(element) => {
                          field.ref(element);
                          bodyRef.current = element;
                        }}
                        rows={16}
                        className="font-mono text-sm"
                      />
                    </FormControl>
                    <FormDescription>
                      Dòng bắt đầu bằng “## ” là tiêu đề, “1. ” là một bước, “-
                      ” là một ý trong danh sách. Để trống một dòng để sang đoạn
                      mới.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="emergencyWarning"
                rules={{
                  required: "Nhập cảnh báo khẩn cấp",
                  maxLength: { value: 1000, message: "Tối đa 1.000 ký tự" },
                }}
                render={({ field }) => (
                  <FormItem className="md:col-span-12">
                    <FormLabel>Cảnh báo khẩn cấp</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        rows={2}
                        placeholder="Dấu hiệu nào thì gọi 115 ngay."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </FormSection>
            <FormSectionActions>
              <Button type="submit" disabled={busy}>
                {busy ? "Đang lưu..." : "Lưu nháp"}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={save(true)}
              >
                Lưu & gửi duyệt
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => navigate(-1)}
              >
                Hủy
              </Button>
            </FormSectionActions>
          </SectionedFormPanel>

          <section className="bg-card flex flex-col gap-3 rounded-xl border p-5">
            <h3 className="text-overline text-muted-foreground">
              Bệnh nhân sẽ thấy
            </h3>
            <h2 className="text-2xl font-bold tracking-tight">
              {values.title || "Tiêu đề"}
            </h2>
            {values.emergencyWarning && (
              <EmergencyWarning text={values.emergencyWarning} />
            )}
            <GuidanceBody body={values.body ?? ""} />
          </section>
        </div>
      </form>
    </Form>
  );

  return mode === "create" ? (
    <CreateView>
      <CreateViewHeader title="Tạo nội dung sơ cứu" />
      {body}
    </CreateView>
  ) : (
    <EditView>
      <EditViewHeader title="Cập nhật nội dung sơ cứu" />
      {body}
    </EditView>
  );
}

export const FirstAidCreate = () => <FirstAidForm mode="create" />;
export const FirstAidEdit = () => <FirstAidForm mode="edit" />;
