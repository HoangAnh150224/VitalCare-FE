import { useState } from "react";
import {
  useCustomMutation,
  useGetIdentity,
  useLogout,
  useNotification,
} from "@refinedev/core";
import { LogOutIcon } from "lucide-react";

import { API_URL } from "@/shared/api/constants";
import {
  getAuthorities,
  saveSession,
  type Identity,
  type TokenPair,
} from "@/shared/api/session";
import { Breadcrumb } from "@/shared/components/layout/breadcrumb";
import { useShellVariant } from "@/shared/components/layout/shell-variant";
import { Avatar, AvatarFallback } from "@/shared/ui/avatar";
import { Button } from "@/shared/ui/button";
import { Label } from "@/shared/ui/label";
import { Badge } from "@/shared/ui/badge";
import { InputPassword } from "@/shared/components/form/input-password";
import { Separator } from "@/shared/ui/separator";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import { cn } from "@/shared/lib/utils";
import { initials } from "@/shared/lib/format";

/**
 * The signed-in user's own account.
 *
 * Not a Refine resource: there is no list of "my accounts" and no id in the
 * URL. It reads the identity from the auth provider and posts to
 * `/auth/change-password`, which is the one password endpoint that does not
 * need a permission — every account may change its own.
 */
export const Profile = () => {
  const { data: identity } = useGetIdentity<Identity>();
  // Roles and permissions are not part of the identity: they come from
  // `/auth/permissions`, which `authProvider.check` has already fetched and
  // cached by the time any route inside the shell renders.
  const authorities = getAuthorities();
  const { open } = useNotification();
  const { mutate, mutation } = useCustomMutation<TokenPair>();
  const { mutate: logout, isPending: isLoggingOut } = useLogout();
  // A customer has no use for role names and permission codes: in the portal
  // the account is a name, a number and a way to sign out (SRS 3.2.4).
  const portal = useShellVariant() === "portal";

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const mismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;
  const canSubmit =
    currentPassword.length > 0 && newPassword.length >= 8 && !mismatch;

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canSubmit) return;

    mutate(
      {
        url: `${API_URL}/auth/change-password`,
        method: "post",
        values: { currentPassword, newPassword },
        // The rest provider sends a custom-call body as a plain string, so
        // without this the request arrives with no content type and Spring
        // answers 415 before the handler is reached.
        config: { headers: { "Content-Type": "application/json" } },
        successNotification: false,
      },
      {
        onSuccess: ({ data }) => {
          // The server ends every other session and hands back a fresh pair for
          // this one. Storing it is what keeps the person who just changed
          // their password from being signed out by their own action.
          if (data?.accessToken) {
            saveSession(data);
          }
          setCurrentPassword("");
          setNewPassword("");
          setConfirmPassword("");
          open?.({
            type: "success",
            message: "Đã đổi mật khẩu",
            description: "Các phiên đăng nhập khác của bạn đã bị đăng xuất.",
          });
        },
      }
    );
  };

  return (
    <div className={cn("flex flex-col gap-4", "screen-enter screen-enter-stagger")}>
      <Breadcrumb />

      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">{portal ? "Tài khoản" : "Tài khoản của bạn"}</h1>
        {!portal && (
          <p className="text-muted-foreground text-sm">
            Thông tin của tài khoản bạn đang đăng nhập.
          </p>
        )}
      </div>

      <div className={cn("grid gap-6", portal ? "max-w-2xl" : "max-w-4xl lg:grid-cols-2")}>
        {portal ? (
          <Card className="flex-row items-center gap-4 p-5">
            <Avatar className="size-14">
              <AvatarFallback className="bg-primary/10 text-primary font-display text-lg font-semibold">
                {initials(identity?.fullName ?? "")}
              </AvatarFallback>
            </Avatar>
            <div className="flex min-w-0 flex-col">
              <span className="font-display truncate text-lg font-semibold">{identity?.fullName ?? "—"}</span>
              <span className="text-muted-foreground text-sm tabular-nums">{identity?.phone ?? "—"}</span>
              {identity?.email && <span className="text-muted-foreground truncate text-sm">{identity.email}</span>}
            </div>
          </Card>
        ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Hồ sơ cá nhân</CardTitle>
            <CardDescription>
              Hãy nhờ quản trị viên nếu bạn muốn thay đổi các thông tin này.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                Họ và tên
              </span>
              <span className="text-sm">{identity?.fullName ?? "—"}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                Số điện thoại
              </span>
              <span className="text-sm font-mono">{identity?.phone ?? "—"}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                Email
              </span>
              <span className="text-sm">{identity?.email ?? "—"}</span>
            </div>

            <Separator />

            <div className="flex flex-col gap-2">
              <span className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                Vai trò
              </span>
              <div className="flex flex-wrap gap-1">
                {authorities?.roles.length ? (
                  authorities.roles.map((role) => (
                    <Badge key={role} variant="outline">
                      {role}
                    </Badge>
                  ))
                ) : (
                  <span className="text-muted-foreground text-sm">Không có</span>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                Quyền ({authorities?.permissions.length ?? 0})
              </span>
              <div className="flex flex-wrap gap-1">
                {authorities?.permissions.map((permission) => (
                  <Badge
                    key={permission}
                    variant="secondary"
                    className="font-mono text-[11px]"
                  >
                    {permission}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Đổi mật khẩu</CardTitle>
            <CardDescription>
              Các phiên đăng nhập khác sẽ bị đăng xuất; phiên này vẫn được giữ.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="current-password">Mật khẩu hiện tại</Label>
                <InputPassword
                  id="current-password"
                  autoComplete="current-password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="new-password">Mật khẩu mới</Label>
                <InputPassword
                  id="new-password"
                  autoComplete="new-password"
                  placeholder="Tối thiểu 8 ký tự"
                  minLength={8}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="confirm-password">Nhập lại mật khẩu mới</Label>
                <InputPassword
                  id="confirm-password"
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                {mismatch && (
                  <p className="text-destructive text-sm">
                    Hai mật khẩu không khớp nhau.
                  </p>
                )}
              </div>

              <div>
                <Button type="submit" disabled={!canSubmit || mutation.isPending}>
                  {mutation.isPending ? "Đang đổi..." : "Đổi mật khẩu"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {portal && (
          <Button
            variant="outline"
            className="text-destructive hover:text-destructive h-11 rounded-xl"
            onClick={() => logout()}
          >
            <LogOutIcon />
            {isLoggingOut ? "Đang đăng xuất…" : "Đăng xuất"}
          </Button>
        )}
      </div>
    </div>
  );
};
