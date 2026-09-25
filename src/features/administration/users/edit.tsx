import { useEffect } from "react";
import { useForm } from "@refinedev/react-hook-form";
import { useNavigate } from "react-router";

import {
  EditView,
  EditViewHeader,
} from "@/shared/components/views/edit-view";
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
import {
  DetailPanel,
  MetaItem,
} from "@/shared/components/views/record-detail";
import { formatDateTime } from "@/shared/lib/format";
import { RolePicker } from "./role-picker";
import { PlacementPicker, type PlacementRef } from "./placement-picker";
import { ResetPasswordCard } from "./reset-password-card";
import { STATUS_LABELS, STATUS_OPTIONS } from "@/domains/user/types";
import type { User } from "@/domains/user/types";
import { USER_STATUS_VARIANTS } from "@/shared/lib/status-variants";

/**
 * Trims a placement down to the `{ id }` ref the API reads, preserving the
 * three states it distinguishes.
 *
 * `null` means the field is absent from the request — leave it as it is, which
 * is the right answer for an account that was unplaced and was not touched.
 * `{ id: null }` is the picker's way of saying "clear it", and has to survive
 * intact. Anything else arrived from the API as a full summary object and goes
 * back as its id alone.
 */
function toPlacementRef(value: unknown): PlacementRef | null {
  if (value == null) return null;
  const id = (value as { id?: number | string | null }).id;
  return { id: id == null ? null : Number(id) };
}

/**
 * Editing an account.
 *
 * **The screen is in two columns, and the split is what each side is for.** On
 * the left, everything about this account that is yours to change, in three
 * named zones — who they are, where they sit, what they may do. On the right,
 * what the API settled about the record and the one action that is not a field
 * at all. A single narrow column had them in one order with nothing to say
 * which was which, and left two thirds of a wide screen empty while the form
 * ran off the bottom of it.
 *
 * The zones are not decoration. Eight inputs in one column is a list of things
 * to fill in; the same eight under three headings is a description of the
 * account, and somebody who came to change a department can find it without
 * reading the rest.
 *
 * Deliberately has no password field. Setting somebody else's password ends
 * every session they have open, which is right when that is what you meant to
 * do and alarming when you only meant to correct a typo in their name — so it
 * lives in its own card in the aside, with its own button.
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
   * `@refinedev/react-hook-form` fills a form by walking the fields it believes
   * are registered and `setValue`ing them one at a time. `organization` and
   * `department` are driven by `PlacementPicker` rather than by a `FormField`,
   * so they are never registered and that walk would skip them entirely — the
   * placement would render as "Not placed" on every account that has one.
   *
   * `reset` writes the record into the form's values wholesale instead, so a
   * value is there whether or not anything registered a field for it.
   * `keepDirtyValues` stops the refetch that follows a cache hit from throwing
   * away whatever has been changed since. Same reasoning as the blog post and
   * department edit forms.
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
      organization: toPlacementRef(values.organization),
      department: toPlacementRef(values.department),
    });
  }

  const status = user?.status;

  return (
    <EditView>
      <EditViewHeader />

      {/* The aside is a fixed 20rem so the form column keeps the room that
          matters, and `items-start` stops it stretching to the form's height.
          Below `xl` it drops under the form, where two columns of it would put
          an email field in a 200px box. */}
      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_20rem] xl:items-start">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="min-w-0">
            <SectionedFormPanel>
              <FormSection
                title="Thông tin định danh"
                description="Tài khoản này thuộc về ai và họ dùng gì để đăng nhập."
              >
                <FormField
                  control={form.control}
                  name="username"
                  rules={{
                    required: "Vui lòng nhập tên đăng nhập",
                    minLength: { value: 3, message: "Tối thiểu 3 ký tự" },
                    pattern: {
                      value: /^[a-zA-Z0-9._-]+$/,
                      message:
                        "Chỉ gồm chữ cái, chữ số, dấu chấm, dấu gạch dưới và dấu gạch ngang",
                    },
                  }}
                  render={({ field }) => (
                    <FormItem className="md:col-span-4">
                      <FormLabel>Tên đăng nhập</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value ?? ""}
                          className="font-mono"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  rules={{
                    required: "Vui lòng nhập email",
                    pattern: {
                      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                      message: "Vui lòng nhập địa chỉ email hợp lệ",
                    },
                  }}
                  render={({ field }) => (
                    <FormItem className="md:col-span-4">
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="email"
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
                      <FormLabel>Họ và tên</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </FormSection>

              <FormSection
                title="Đơn vị và trạng thái"
                description="Tài khoản thuộc đơn vị nào trong công ty và có được phép đăng nhập hay không."
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
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Mọi trạng thái khác ngoài Hoạt động sẽ đăng xuất tất cả
                        phiên đang mở.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/*
                  `contents` so the two placement fields become children of this
                  section's own grid and sit on the row with Status, rather than
                  in a column of their own inside a wrapper.

                  The record's own placement is passed in as well as the form
                  value: it is what lets the trigger show the current
                  organization before the option lists arrive, and what keeps it
                  readable for a role that may edit users but not read the
                  organization catalogue.
                */}
                <PlacementPicker
                  className="contents"
                  itemClassName="md:col-span-4"
                  organization={form.watch("organization")}
                  department={form.watch("department")}
                  onOrganizationChange={(value) =>
                    form.setValue("organization", value, { shouldDirty: true })
                  }
                  onDepartmentChange={(value) =>
                    form.setValue("department", value, { shouldDirty: true })
                  }
                  currentOrganization={user?.organization}
                  currentDepartment={user?.department}
                />
              </FormSection>

              <FormSection
                title="Vai trò"
                description="Tài khoản được phép làm gì. Các vai trò được cộng dồn — giữ hai vai trò sẽ có quyền của cả hai, không bao giờ ít hơn."
              >
                <FormField
                  control={form.control}
                  name="roles"
                  rules={{
                    validate: (value) =>
                      (Array.isArray(value) && value.length > 0) ||
                      "Vui lòng chọn ít nhất một vai trò",
                  }}
                  render={({ field }) => (
                    <FormItem className="md:col-span-12">
                      <FormControl>
                        <RolePicker
                          value={field.value}
                          onChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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

        {/*
          What the API settled, and the one action that is not a field. Both are
          about this account without being part of the form, which is exactly
          why neither belongs between two inputs.
        */}
        <aside className="flex min-w-0 flex-col gap-4">
          <DetailPanel title="Tài khoản" bodyClassName="flex flex-col gap-4 p-4">
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
              {user?.lastLoginAt ? formatDateTime(user.lastLoginAt) : "Chưa từng"}
            </MetaItem>
          </DetailPanel>

          {userId != null && <ResetPasswordCard userId={userId} />}
        </aside>
      </div>
    </EditView>
  );
};
