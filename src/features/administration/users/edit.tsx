import { useEffect, useState } from "react";
import { useForm } from "@refinedev/react-hook-form";
import { useNavigate } from "react-router";

import { EditView, EditViewHeader } from "@/shared/components/views/edit-view";
import { Badge } from "@/shared/ui/badge";
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
import { DetailPanel, MetaItem } from "@/shared/components/views/record-detail";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/shared/components/tabs/tabs";
import { formatDateTime } from "@/shared/lib/format";
import { ResetPasswordCard } from "./reset-password-card";
import {
  ROLE_ORIGIN_HINT,
  STATUS_LABELS,
  STATUS_OPTIONS,
} from "@/domains/user/types";
import type { User } from "@/domains/user/types";
import { USER_STATUS_VARIANTS } from "@/shared/lib/status-variants";

/**
 * Editing an account, in two tabs: what is theirs to change (who they are,
 * whether they may sign in, and the roles they hold), and how they sign in
 * (the account's record and setting a new password).
 *
 * The password has its own tab and its own button, not a field of the form:
 * setting somebody else's password ends every session they have open, which is
 * right when that is what you meant and alarming when you only meant to fix a
 * typo in their name.
 */
export const UserEdit = () => {
  const navigate = useNavigate();

  const {
    refineCore: { onFinish, query },
    ...form
  } = useForm({
    refineCoreProps: {},
  });

  const user = query?.data?.data as User | undefined;
  const userId = user?.id;

  /**
   * Fill the form from the record, in one go.
   *
   * `roles` has no field of its own any more (it is shown, not picked), so the
   * per-field fill would skip it and Save would send no roles. `reset` writes
   * the whole record into the form, so the account's roles go back unchanged.
   * `keepDirtyValues` stops a refetch from throwing away edits in progress.
   */
  const { reset } = form;
  useEffect(() => {
    if (!user) return;
    reset(user, { keepDirtyValues: true });
  }, [user, reset]);

  function onSubmit(values: Record<string, unknown>) {
    // `roles` arrives from the API as full objects and goes back as `{ id }`
    // refs. The API ignores the extra keys, but trimming them keeps the request
    // an honest statement of what is being changed.
    const roles = Array.isArray(values.roles)
      ? (values.roles as { id: number }[]).map((role) => ({ id: role.id }))
      : values.roles;

    onFinish({
      ...values,
      roles,
    });
  }

  const status = user?.status;
  const [tab, setTab] = useState("info");

  return (
    <EditView>
      <EditViewHeader />

      <Tabs value={tab} onValueChange={setTab} className="min-w-0 gap-4">
        <TabsList>
          <TabsTrigger value="info">Thông tin</TabsTrigger>
          <TabsTrigger value="sign-in">Đăng nhập & mật khẩu</TabsTrigger>
        </TabsList>

        {/* Kept mounted while hidden, so unsaved edits survive a look at the other tab. */}
        <TabsContent
          value="info"
          forceMount
          className="data-[state=inactive]:hidden"
        >
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="min-w-0">
              <SectionedFormPanel>
                <FormSection
                  title="Thông tin định danh"
                  description="Tài khoản này thuộc về ai và họ dùng gì để đăng nhập."
                >
                  <FormField
                    control={form.control}
                    name="phone"
                    rules={{
                      required: "Vui lòng nhập số điện thoại",
                      pattern: {
                        value:
                          /^[\s.()-]*(?:\+?84|0)(?:[\s.()-]*\d){9}[\s.()-]*$/,
                        message:
                          "Nhập số điện thoại Việt Nam, ví dụ 0901234567 hoặc +84901234567",
                      },
                    }}
                    render={({ field }) => (
                      <FormItem className="md:col-span-4">
                        <FormLabel>Số điện thoại <span className="text-destructive" aria-hidden="true">*</span></FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="tel"
                            aria-required="true"
                            placeholder="Nhập số điện thoại"
                            inputMode="tel"
                            value={field.value ?? ""}
                            className="font-mono"
                          />
                        </FormControl>
                        <FormDescription>
                          Dùng để đăng nhập. Đổi số sẽ đổi cách đăng nhập.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    rules={{
                      pattern: {
                        value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                        message: "Vui lòng nhập địa chỉ email hợp lệ",
                      },
                    }}
                    render={({ field }) => (
                      <FormItem className="md:col-span-4">
                        <FormLabel>Email (không bắt buộc)</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="email"
                            placeholder="Nhập địa chỉ email (không bắt buộc)"
                            value={field.value ?? ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="fullName"
                    rules={{ required: "Vui lòng nhập họ và tên" }}
                    render={({ field }) => (
                      <FormItem className="md:col-span-4">
                        <FormLabel>Họ và tên <span className="text-destructive" aria-hidden="true">*</span></FormLabel>
                        <FormControl>
                          <Input {...field} aria-required="true" value={field.value ?? ""} placeholder="Nhập họ và tên" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </FormSection>

                <FormSection
                  title="Trạng thái và vai trò"
                  description="Tài khoản có được đăng nhập hay không, và họ là ai trong hệ thống."
                >
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem className="md:col-span-4">
                        <FormLabel>Trạng thái</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value ?? "active"}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Chọn trạng thái" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {STATUS_OPTIONS.map((option) => (
                              <SelectItem
                                key={option.value}
                                value={option.value}
                              >
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Mọi trạng thái khác ngoài Hoạt động sẽ đăng xuất tất
                          cả phiên đang mở.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Roles follow from how the account came to be, so they are
                    shown, not picked: the API refuses to change them here.
                    Laid out like the field beside it - label, a box the
                    height of an input, a note - so the row reads as one. */}
                  <div className="grid content-start gap-2 md:col-span-8">
                    <span className="text-sm leading-none font-medium">
                      Vai trò
                    </span>
                    <div className="bg-muted/40 flex min-h-9 flex-wrap items-center gap-2 rounded-md border px-3 py-1.5">
                      {user?.roles?.length ? (
                        user.roles.map((role) => (
                          <Badge key={role.id} variant="secondary">
                            {role.name}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-muted-foreground text-sm">
                          Chưa có vai trò
                        </span>
                      )}
                    </div>
                    <p className="text-muted-foreground text-sm">
                      {ROLE_ORIGIN_HINT}
                    </p>
                  </div>
                </FormSection>

                <FormSectionActions>
                  <Button type="submit" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? "Đang lưu..." : "Lưu"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate(-1)}
                  >
                    Hủy
                  </Button>
                  {form.formState.isDirty && (
                    <span className="text-muted-foreground ms-auto flex items-center gap-2 text-sm">
                      <span
                        aria-hidden
                        className="bg-warning inline-block size-2 rounded-full"
                      />
                      Thay đổi chưa lưu
                    </span>
                  )}
                </FormSectionActions>
              </SectionedFormPanel>
            </form>
          </Form>
        </TabsContent>

        <TabsContent value="sign-in">
          <div className="grid min-w-0 gap-4 lg:grid-cols-2 lg:items-start">
            <DetailPanel
              title="Tài khoản"
              bodyClassName="grid gap-4 p-4 sm:grid-cols-2"
            >
              <MetaItem label="Trạng thái hiện tại">
                {status ? (
                  <Badge variant={USER_STATUS_VARIANTS[status] ?? "secondary"}>
                    {STATUS_LABELS[status] ?? status}
                  </Badge>
                ) : (
                  "—"
                )}
              </MetaItem>
              <MetaItem label="ID người dùng">
                <span className="tabular-nums">{user?.id ?? "—"}</span>
              </MetaItem>
              <MetaItem label="Ngày tạo">
                {user?.createdAt ? formatDateTime(user.createdAt) : "—"}
              </MetaItem>
              <MetaItem label="Cập nhật lần cuối">
                {user?.updatedAt ? formatDateTime(user.updatedAt) : "—"}
              </MetaItem>
              {/* A never-signed-in account is a fact, not a missing value. */}
              <MetaItem label="Đăng nhập lần cuối">
                {user?.lastLoginAt
                  ? formatDateTime(user.lastLoginAt)
                  : "Chưa từng"}
              </MetaItem>
            </DetailPanel>

            {userId != null && <ResetPasswordCard userId={userId} />}
          </div>
        </TabsContent>
      </Tabs>
    </EditView>
  );
};
