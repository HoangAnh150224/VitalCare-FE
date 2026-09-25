import { useMemo } from "react";
import { useCan, useResourceParams, useSelect } from "@refinedev/core";
import { useForm } from "@refinedev/react-hook-form";

import { RouteDialog } from "@/shared/components/views/route-dialog";
import { Button } from "@/shared/ui/button";
import { DialogClose } from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
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

// The submit button sits in the dialog footer, outside the `<form>` element,
// so it is wired back to the form with the HTML `form` attribute.
const FORM_ID = "blog-post-create-form";

export const BlogPostCreate = () => {
  // Same component serves `/blog-posts/create` and `/blog-posts/clone/:id`;
  // `useForm` picks the action up from the route, only the wording differs.
  const { action } = useResourceParams();
  const isClone = action === "clone";

  const {
    refineCore: { onFinish, query },
    ...form
  } = useForm({
    refineCoreProps: {},
  });

  // Only ever set on the clone route: a plain create has no record behind it.
  const recordCategory = query?.data?.data?.category as
    | { id: number | string; title: string }
    | undefined;

  // Reading categories is a separate grant from writing blog posts, so the
  // lookup is gated rather than left to fail with a toast over the form.
  const { data: canReadCategories } = useCan({
    resource: "categories",
    action: "list",
  });

  const { options: categoryOptions } = useSelect({
    resource: "categories",
    queryOptions: {
      enabled: canReadCategories?.can ?? false,
    },
  });

  /**
   * The cloned record's own category, merged in rather than waited for.
   *
   * `Select` matches its `value` against the items mounted at that moment and
   * does not re-run the match when items arrive later, so on the clone route
   * the category has to be an option no later than the render that fills the
   * form from the record. The list query races that, and losing the race leaves
   * the trigger showing its placeholder over a value that is really set.
   *
   * A no-op on `/blog-posts/create`, which has no record. Same reasoning as the
   * edit form, which hit this for real.
   */
  const options = useMemo(() => {
    const list = categoryOptions ?? [];
    if (!recordCategory?.id) return list;

    return list.some((o) => String(o.value) === String(recordCategory.id))
      ? list
      : [{ label: recordCategory.title, value: recordCategory.id }, ...list];
  }, [categoryOptions, recordCategory?.id, recordCategory?.title]);

  function onSubmit(values: Record<string, string>) {
    onFinish(values);
  }

  return (
    <RouteDialog
      title={isClone ? "Nhân bản bài viết" : "Tạo mới bài viết"}
      description={
        isClone
          ? "Bắt đầu từ bản sao của một bài viết có sẵn. Bài viết gốc sẽ không bị thay đổi."
          : "Điền các trường bên dưới để thêm bài viết mới."
      }
      footer={
        <>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Hủy
            </Button>
          </DialogClose>
          <Button
            type="submit"
            form={FORM_ID}
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? "Đang tạo..." : "Tạo mới"}
          </Button>
        </>
      }
    >
      <Form {...form}>
        <form
          id={FORM_ID}
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-6"
        >
          <FormField
            control={form.control}
            name="title"
            rules={{ required: "Tiêu đề là bắt buộc" }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tiêu đề</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    value={field.value || ""}
                    placeholder="Nhập tiêu đề"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="content"
            rules={{ required: "Nội dung là bắt buộc" }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nội dung</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    value={field.value || ""}
                    placeholder="Nhập nội dung"
                    rows={8}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name={"category.id"}
            rules={{ required: "Danh mục là bắt buộc" }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Danh mục</FormLabel>
                {/*
                  Category ids are numbers on the wire but `Select` compares
                  values as strings, so both sides are stringified here. The API
                  reads the id back out of the string it receives.
                */}
                <Select
                  onValueChange={field.onChange}
                  value={field.value ? String(field.value) : ""}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn danh mục" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {options.map((option) => (
                      <SelectItem
                        key={String(option.value)}
                        value={String(option.value)}
                      >
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
            name="status"
            defaultValue="draft"
            rules={{ required: "Trạng thái là bắt buộc" }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Trạng thái</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || ""}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn trạng thái" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="draft">Bản nháp</SelectItem>
                    <SelectItem value="published">Đã xuất bản</SelectItem>
                    <SelectItem value="rejected">Bị từ chối</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </form>
      </Form>
    </RouteDialog>
  );
};
