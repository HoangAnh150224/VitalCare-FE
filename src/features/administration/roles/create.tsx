import { useState } from "react";
import { useCan } from "@refinedev/core";
import { useForm } from "@refinedev/react-hook-form";
import { useNavigate } from "react-router";

import {
  CreateView,
  CreateViewHeader,
} from "@/shared/components/views/create-view";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import { Badge } from "@/shared/ui/badge";
import { Card } from "@/shared/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/shared/components/tabs/tabs";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/ui/form";
import { cn } from "@/shared/lib/utils";
import { PermissionMatrix, type PermissionRef } from "./permission-matrix";
import { RoleDataScopes } from "./data-scopes";

/**
 * The create payload, which is `RoleRequest` on the backend rather than the
 * `RoleResponse` shape the rest of the resource speaks.
 */
type RoleFormValues = {
  code: string;
  name: string;
  description: string;
  permissions: PermissionRef[];
};

/**
 * Annotated rather than inferred, so the empty arrays widen to their element
 * type instead of being pinned to `never[]`.
 */
const DEFAULT_VALUES: RoleFormValues = {
  code: "",
  name: "",
  description: "",
  permissions: [],
};

/** The same band the edit and show screens carry, so all three read alike. */
const TAB_HINTS: Record<string, string> = {
  permissions:
    "Mỗi dòng là một tài nguyên, mỗi cột là một hành động; ô giao nhau chính là mã quyền. Vai trò không có quyền nào vẫn hợp lệ nhưng không cấp gì cả.",
  scopes:
    "Phạm vi dữ liệu cần thuộc về một vai trò. Sau khi tạo vai trò này, bạn sẽ được chuyển đến màn hình chỉnh sửa với tab này đã sẵn sàng.",
};

export const RoleCreate = () => {
  const navigate = useNavigate();

  const {
    refineCore: { onFinish },
    ...form
  } = useForm({
    // To the edit screen rather than back to the list, which is Refine's
    // default. A new role is not finished when its row exists: its data scopes
    // cannot be written until it has an id to belong to, and the tab that
    // writes them is on the edit screen. Landing there is the difference
    // between the second half of the job being the next thing in front of you
    // and being something you have to go and find.
    refineCoreProps: { redirect: "edit" },
    defaultValues: DEFAULT_VALUES,
  });

  const grantedCount = form.watch("permissions")?.length ?? 0;

  const { data: canReadScopes } = useCan({
    resource: "row_level_policies",
    action: "list",
  });
  const mayReadScopes = canReadScopes?.can ?? false;

  const [tab, setTab] = useState("permissions");

  function onSubmit(values: RoleFormValues) {
    onFinish(values);
  }

  return (
    <CreateView>
      <CreateViewHeader />
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex min-w-0 flex-col gap-4"
        >
          {/* One row of fields rather than a column in a 2xl box: the same
              proportions the edit screen uses, so the shape of a role does not
              change between making one and changing it. */}
          <Card className="gap-0 overflow-hidden py-0">
            <div className="bg-surface-subtle border-b px-4 py-3">
              <h2 className="text-sm leading-5 font-semibold">Thông tin vai trò</h2>
              <p className="text-muted-foreground text-xs">
                Tên gọi của vai trò này và mục đích sử dụng.
              </p>
            </div>

            <div className="grid gap-4 p-4 lg:grid-cols-12 lg:gap-6">
              <FormField
                control={form.control}
                name="code"
                rules={{
                  required: "Vui lòng nhập mã",
                  pattern: {
                    value: /^[A-Z][A-Z0-9_]*$/,
                    message:
                      "Chỉ gồm chữ in hoa, chữ số và dấu gạch dưới, bắt đầu bằng một chữ cái",
                  },
                }}
                render={({ field }) => (
                  <FormItem className="lg:col-span-3">
                    <FormLabel>Mã</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value ?? ""}
                        placeholder="CONTENT_EDITOR"
                        className="font-mono"
                        // Typing lower case and having it silently rejected is
                        // a worse experience than having it corrected as you
                        // type.
                        onChange={(e) =>
                          field.onChange(e.target.value.toUpperCase())
                        }
                      />
                    </FormControl>
                    <FormDescription>
                      Mã định danh cố định. Vai trò hệ thống không thể đổi mã sau khi tạo.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="name"
                rules={{ required: "Vui lòng nhập tên" }}
                render={({ field }) => (
                  <FormItem className="lg:col-span-4">
                    <FormLabel>Tên</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value ?? ""}
                        placeholder="Biên tập viên nội dung"
                      />
                    </FormControl>
                    <FormDescription>
                      Tên hiển thị trên giao diện.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem className="lg:col-span-5">
                    <FormLabel>Mô tả</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        value={field.value ?? ""}
                        rows={2}
                        className="min-h-9 resize-y"
                        placeholder="Vai trò này dùng để làm gì, trong một câu."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </Card>

          <Tabs value={tab} onValueChange={setTab} className="gap-3">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <TabsList>
                <TabsTrigger value="permissions">
                  Quyền
                  <Badge variant="secondary" className="ml-2 tabular-nums">
                    {grantedCount}
                  </Badge>
                </TabsTrigger>
                {/*
                  Present but empty rather than absent. A tab that appears only
                  after the first save reads as a feature somebody has not
                  found; one that is there and says why it is waiting reads as
                  the order the work has to happen in.
                */}
                {mayReadScopes && (
                  <TabsTrigger value="scopes">Phạm vi dữ liệu</TabsTrigger>
                )}
              </TabsList>

              <p className="text-muted-foreground hidden max-w-3xl text-xs leading-5 lg:block lg:ms-auto lg:text-right">
                {TAB_HINTS[tab]}
              </p>
            </div>

            <TabsContent value="permissions">
              <Card className="[--panel-reserve:28rem] gap-0 overflow-hidden py-0">
                <FormField
                  control={form.control}
                  name="permissions"
                  render={({ field }) => (
                    <FormItem className="gap-0">
                      <FormControl>
                        <PermissionMatrix
                          value={field.value}
                          onChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage className="px-4 pb-3" />
                    </FormItem>
                  )}
                />
              </Card>
            </TabsContent>

            {mayReadScopes && (
              <TabsContent value="scopes">
                <Card className="gap-0 overflow-hidden py-0">
                  <RoleDataScopes roleId={undefined} roleCode={undefined} />
                </Card>
              </TabsContent>
            )}
          </Tabs>

          <div
            className={cn(
              "sticky bottom-0 z-30 flex flex-wrap items-center gap-3",
              "border-border bg-card/95 rounded-lg border px-4 py-3 shadow-e3 backdrop-blur"
            )}
          >
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Đang tạo..." : "Tạo mới"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(-1)}
            >
              Hủy
            </Button>
          </div>
        </form>
      </Form>
    </CreateView>
  );
};
