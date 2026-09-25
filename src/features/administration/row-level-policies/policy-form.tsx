import { useCustom, useSelect } from "@refinedev/core";
import type { UseFormReturn } from "react-hook-form";

import { customResult } from "@/shared/hooks/use-custom-result";
import { API_URL } from "@/shared/api/constants";
import { Alert, AlertDescription } from "@/shared/ui/alert";
import { Badge } from "@/shared/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
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
import { Switch } from "@/shared/ui/switch";
import { Textarea } from "@/shared/ui/textarea";
import { ScopeBuilder } from "./scope-builder";
import {
  ACTIONS,
  EMPTY_SCOPE,
  KIND_LABELS,
  actionLabel,
  type PolicyMetadata,
  type ScopeNode,
} from "@/domains/row-level-policy/types";

/**
 * The create and edit forms are the same form, so it lives here once.
 *
 * The shape it edits is `RowLevelPolicyRequest` on the backend. Two of its
 * fields are locked on edit rather than merely discouraged — see
 * `lockIdentity` below.
 */

export type PolicyFormValues = {
  kind: "SCOPE" | "FILTER";
  /**
   * Null for a filter, which has no role by design. Nullable rather than
   * optional because the field is always sent: an omitted role would leave the
   * API guessing, and an explicit null is the only way to say "nobody".
   */
  role: { id: number | null };
  resource: string;
  action: string;
  name: string;
  policyGroup: string;
  description: string;
  scope: ScopeNode;
  /**
   * The `WITH CHECK` clause. Null means "the same as `scope`" — see the card in
   * the form for why that is the default and when to override it.
   */
  checkScope: ScopeNode | null;
  enabled: boolean;
};

type PolicyFormProps = {
  form: UseFormReturn<PolicyFormValues>;
  /**
   * True on the edit screen. `kind` and `resource` are then read-only, because
   * changing either turns a policy into a different policy about different
   * rows — and the audit trail would claim one thing was edited when in truth
   * one rule was withdrawn and another introduced. The API rejects them for the
   * same reason; this is the form agreeing with it rather than discovering it.
   */
  lockIdentity?: boolean;
  /** Every resource under row-level management, for the resource picker. */
  resources: string[];
  /**
   * The role the record already names, for the edit screen.
   *
   * Both pickers here are fed by requests that finish after this form mounts,
   * and a Radix `Select` renders its label from the matching item — so a value
   * whose option has not arrived yet shows the placeholder and looks like an
   * empty field. Merging the current value into the list closes that window;
   * the role needs its label passed in because only the record knows it.
   */
  currentRole?: { id: number; code: string } | null;
  /**
   * True when the screen, rather than the form, has already decided the role —
   * the Data scopes tab of a role, where every policy written belongs to the
   * role being edited.
   *
   * The picker is shown disabled rather than hidden, for the same reason it is
   * on a filter: a field that vanishes reads as one somebody forgot, while a
   * disabled one holding the right value reads as a decision already made.
   */
  lockRole?: boolean;
  /**
   * True when the kind is fixed at `SCOPE`.
   *
   * A `FILTER` names no role by design — that is what makes it inescapable — so
   * there is no such thing as a filter *of* a role, and offering the choice on
   * a role's own screen would offer a policy that screen cannot save.
   */
  lockKind?: boolean;
};

export function PolicyForm({
  form,
  lockIdentity,
  resources,
  currentRole,
  lockRole,
  lockKind,
}: PolicyFormProps) {
  const kind = form.watch("kind");
  const resource = form.watch("resource");
  const action = form.watch("action");

  const { options: roleOptions, query: roleQuery } = useSelect({
    resource: "roles",
    optionLabel: "name",
    optionValue: "id",
    sorters: [{ field: "code", order: "asc" }],
  });

  // The current values, guaranteed to have an option to match, however late the
  // real lists arrive. Without this the field renders as blank rather than as
  // what it holds -- which reads as data loss on a form somebody is editing.
  const resourceOptions =
    resource && !resources.includes(resource) ? [resource, ...resources] : resources;

  const roleChoices = (roleOptions ?? []).some(
    (option) => String(option.value) === String(currentRole?.id)
  )
    ? (roleOptions ?? [])
    : [
        ...(currentRole ? [{ value: currentRole.id, label: currentRole.code }] : []),
        ...(roleOptions ?? []),
      ];

  // The server's own declaration of what a policy on this resource may say.
  // Everything the condition builder offers comes from here, which is what lets
  // that builder have no free-text expression box at all.
  const { result: metadataResult, query: metadataQuery } = useCustom<PolicyMetadata>({
    url: `${API_URL}/row_level_policies/metadata`,
    method: "get",
    config: { query: { resource } },
    queryOptions: { enabled: Boolean(resource) },
  });

  // Not `metadataResult?.data` on its own: refine answers a query that has not
  // run with a frozen empty object rather than undefined, and this query is
  // disabled until a resource is picked. See `customResult`.
  const metadata = customResult(metadataResult?.data, "fields");

  return (
    <Form {...form}>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Chính sách này là gì</CardTitle>
            <CardDescription>
              Phạm vi thuộc về một vai trò và mở rộng những gì vai trò đó truy
              cập được. Bộ lọc không thuộc về ai và thu hẹp những gì mọi người
              truy cập được — vì vậy không thể thoát khỏi nó bằng cách không giữ
              vai trò.
            </CardDescription>
          </CardHeader>
          <CardContent className="max-w-3xl space-y-6">
            <div className="grid gap-6 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="kind"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Loại</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={lockIdentity || lockKind}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="SCOPE">
                          Phạm vi — mở rộng cho một vai trò
                        </SelectItem>
                        <SelectItem value="FILTER">
                          Bộ lọc — thu hẹp cho mọi người
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      {lockIdentity
                        ? "Không thể thay đổi: việc đó sẽ biến đây thành một quy tắc khác áp dụng cho các dòng khác."
                        : lockKind
                          ? "Bộ lọc không gắn với vai trò nào, nên không thể tạo từ màn hình riêng của một vai trò."
                          : "Các phạm vi được hợp lại với nhau; các bộ lọc luôn được giao với nhau."}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="resource"
                rules={{ required: "Vui lòng chọn tài nguyên" }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tài nguyên</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value ?? ""}
                      disabled={lockIdentity}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn tài nguyên" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {resourceOptions.map((candidate) => (
                          <SelectItem key={candidate} value={candidate}>
                            {candidate}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Chỉ những tài nguyên đã khai báo quản lý phạm vi dữ liệu mới
                      xuất hiện ở đây.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="action"
                rules={{ required: "Vui lòng chọn hành động" }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hành động</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn hành động" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ACTIONS.map((candidate) => (
                          <SelectItem key={candidate} value={candidate}>
                            {actionLabel(candidate)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      {action === "write"
                        ? "Được kiểm tra hai lần: trên dòng ở trạng thái hiện tại, và trên trạng thái mà lần lưu sẽ để lại."
                        : "Được gộp vào mệnh đề WHERE của mọi truy vấn trên tài nguyên này."}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/*
                A filter has no role by design. Showing the picker disabled
                rather than hiding it is what makes that visible as a decision
                instead of looking like a field somebody forgot.
              */}
              <FormField
                control={form.control}
                name="role.id"
                rules={{
                  validate: (value) =>
                    kind === "FILTER" ||
                    value != null ||
                    "Phạm vi phải chỉ định vai trò mà nó mở rộng",
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vai trò</FormLabel>
                    {/*
                      Role ids are numbers on the wire but `Select` compares its
                      values as strings, so the conversion happens at this
                      boundary and nowhere else.
                    */}
                    <Select
                      onValueChange={(next) => field.onChange(Number(next))}
                      value={
                        field.value === null || field.value === undefined
                          ? ""
                          : String(field.value)
                      }
                      disabled={kind === "FILTER" || lockRole}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue
                            placeholder={
                              kind === "FILTER"
                                ? "Bộ lọc áp dụng cho mọi người"
                                : roleQuery.isLoading
                                  ? "Đang tải..."
                                  : "Chọn vai trò"
                            }
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {roleChoices.map((option) => (
                          <SelectItem
                            key={String(option.value)}
                            value={String(option.value)}
                          >
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {lockRole && (
                      <FormDescription>
                        Cố định: phạm vi này thuộc về vai trò bạn đang chỉnh sửa.
                        Muốn tạo phạm vi cho vai trò khác, hãy thao tác từ màn
                        hình riêng của vai trò đó.
                      </FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="name"
              rules={{
                required: "Vui lòng nhập tên",
                maxLength: { value: 160, message: "Tối đa 160 ký tự" },
              }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tên</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value ?? ""}
                      placeholder="Làm việc trong phòng ban của tôi"
                    />
                  </FormControl>
                  <FormDescription>
                    Tên gọi của quy tắc này trong nhật ký kiểm toán và trong phần
                    giải thích. Hãy nêu rõ quy tắc cho phép mọi người thấy gì.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-6 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="policyGroup"
                rules={{ maxLength: { value: 64, message: "Tối đa 64 ký tự" } }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nhóm</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value ?? ""}
                        placeholder="Theo phòng ban"
                      />
                    </FormControl>
                    <FormDescription>
                      Chỉ để hiển thị — dùng để nhóm các dòng trên màn hình này,
                      không có tác dụng nào khác.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="enabled"
                render={({ field }) => (
                  <FormItem className="flex flex-col gap-2">
                    <FormLabel>Đang bật</FormLabel>
                    <FormControl>
                      <Switch
                        checked={field.value ?? true}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormDescription>
                      {kind === "FILTER"
                        ? "Tắt một bộ lọc sẽ gỡ bỏ hạn chế đối với mọi người."
                        : "Tắt một phạm vi sẽ thu hẹp quyền truy cập của vai trò sở hữu nó."}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              rules={{ maxLength: { value: 500, message: "Tối đa 500 ký tự" } }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mô tả</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      value={field.value ?? ""}
                      rows={3}
                      placeholder="Lý do quy tắc này tồn tại, dành cho người đọc sau"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Những dòng khớp với chính sách</CardTitle>
            <CardDescription>
              Mọi lựa chọn bên dưới đều lấy từ những gì máy chủ cho phép đối với
              tài nguyên này. Ở đây không có ô nhập biểu thức tự do, và điều đó
              là có chủ ý: điều kiện mà màn hình này không cho bạn viết cũng là
              điều kiện mà API sẽ từ chối.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {metadata && (
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="text-muted-foreground">
                  Vai trò chưa có phạm vi trên tài nguyên này:
                </span>
                <Badge
                  variant={
                    metadata.defaultScope === "FULL" ? "secondary" : "outline"
                  }
                >
                  {metadata.defaultScope === "FULL"
                    ? "thấy tất cả"
                    : "không thấy gì"}
                </Badge>
              </div>
            )}

            {metadata && metadata.designTime.length > 0 && (
              <Alert>
                <AlertDescription className="flex flex-col gap-1">
                  <span className="font-medium">
                    Cũng đang có hiệu lực, được khai báo trong mã nguồn và không
                    thể chỉnh sửa tại đây:
                  </span>
                  {metadata.designTime.map((declared, index) => (
                    <span key={index} className="text-sm">
                      {KIND_LABELS[declared.kind] ?? declared.kind} ·{" "}
                      {actionLabel(declared.action)}
                      {declared.role ? ` · ${declared.role}` : ""} —{" "}
                      {declared.name}
                    </span>
                  ))}
                </AlertDescription>
              </Alert>
            )}

            <FormField
              control={form.control}
              name="scope"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <div>
                      <ScopeBuilder
                        metadata={metadata}
                        value={field.value}
                        onChange={field.onChange}
                        action={action}
                        disabled={metadataQuery.isLoading}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/*
          Only `write` leaves a new state behind, so only `write` has a second
          clause. Showing this card for `read` or `delete` would invite somebody
          to fill in a condition that is never consulted.
        */}
        {action === "write" && (
          <Card>
            <CardHeader>
              <CardTitle>Điều kiện kiểm tra khi ghi</CardTitle>
              <CardDescription>
                Điều kiện ở trên quyết định những bản ghi nào được chỉnh sửa.
                Điều kiện này quyết định bản ghi được phép có dạng như thế nào{" "}
                <b>sau</b> khi lưu.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="checkScope"
                render={({ field }) => (
                  <FormItem className="space-y-4">
                    <div className="flex items-start gap-3">
                      <FormControl>
                        <Switch
                          checked={field.value === null || field.value === undefined}
                          onCheckedChange={(sameAsAbove) =>
                            // Null and an empty tree are opposites here: null
                            // reuses the condition above, an empty tree allows
                            // any resulting state at all.
                            field.onChange(sameAsAbove ? null : EMPTY_SCOPE)
                          }
                        />
                      </FormControl>
                      <div className="space-y-1">
                        <FormLabel>Áp dụng cùng điều kiện cho bản ghi sau khi lưu</FormLabel>
                        <FormDescription>
                          Mặc định bật, và là lựa chọn đúng khi điều kiện ở trên
                          nói về việc bản ghi <b>thuộc về ai</b> — một phòng ban,
                          một danh mục, một chủ sở hữu. Nhờ đó không ai có thể
                          chuyển bản ghi sang nơi mình không nhìn thấy để giấu nó.
                        </FormDescription>
                      </div>
                    </div>

                    {field.value !== null && field.value !== undefined && (
                      <>
                        <Alert>
                          <AlertDescription>
                            Hãy tắt khi điều kiện ở trên nói về{" "}
                            <b>một trạng thái mà công việc làm thay đổi</b>.
                            &ldquo;Chỉ bản nháp mới được chỉnh sửa&rdquo; khi áp
                            dụng cho bản ghi sau khi lưu cũng có nghĩa là
                            &ldquo;và bản nháp không bao giờ được xuất bản&rdquo;,
                            tức là cấm đúng thao tác quan trọng nhất. Để trống
                            phần điều kiện bên dưới nếu muốn cho phép mọi trạng
                            thái sau khi lưu.
                          </AlertDescription>
                        </Alert>
                        <FormControl>
                          <div>
                            <ScopeBuilder
                              metadata={metadata}
                              value={field.value}
                              onChange={field.onChange}
                              action={action}
                              disabled={metadataQuery.isLoading}
                            />
                          </div>
                        </FormControl>
                      </>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </Form>
  );
}
