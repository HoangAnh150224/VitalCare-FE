import { useState } from "react";
import { useCustomMutation, useNotification } from "@refinedev/core";
import { KeyRoundIcon } from "lucide-react";

import { API_URL } from "@/shared/api/constants";
import { Button } from "@/shared/ui/button";
import { Label } from "@/shared/ui/label";
import { InputPassword } from "@/shared/components/form/input-password";
import { DetailPanel } from "@/shared/components/views/record-detail";
import { PASSWORD_RANGE_MESSAGE, passwordInRange } from "@/shared/lib/password";

/**
 * Setting a user's password on their behalf.
 *
 * Kept out of the edit form on purpose. Saving a profile and revoking somebody's
 * sessions are different intentions, and folding the second into the first
 * would make a corrected surname sign that person out of their laptop.
 *
 * `useCustomMutation` rather than `useUpdate`, because the endpoint is
 * `POST /users/{id}/password` and returns the user rather than a patched
 * record — outside the shape the data provider's `update` speaks.
 */
export function ResetPasswordCard({ userId }: { userId: number | string }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const tooLong = password.length >= 8 && !passwordInRange(password);
  // Typed twice, as on the profile page: nobody sees it again to catch a typo.
  const mismatch = confirm.length > 0 && password !== confirm;
  const { open } = useNotification();
  const { mutate, mutation } = useCustomMutation();

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    mutate(
      {
        url: `${API_URL}/users/${userId}/password`,
        method: "post",
        values: { password },
        // The rest provider serialises a custom-call body itself and sends it
        // as a plain string, so without this the request arrives with no
        // content type and Spring answers 415 before the handler is reached.
        config: { headers: { "Content-Type": "application/json" } },
        // The provider's own success toast would say "Successfully created",
        // which is not what happened.
        successNotification: false,
      },
      {
        onSuccess: () => {
          setPassword("");
          setConfirm("");
          open?.({
            type: "success",
            message: "Đã cập nhật mật khẩu",
            description:
              "Mọi phiên đang mở của tài khoản này đã bị đăng xuất.",
          });
        },
      }
    );
  };

  return (
    // The same panel the facts beside it sit in, so the aside reads as one
    // column of related things rather than two cards that happen to be stacked.
    <DetailPanel
      title="Đặt lại mật khẩu"
      action={<KeyRoundIcon className="text-muted-foreground size-4" />}
      bodyClassName="p-4"
    >
      {/*
        Its own `<form>`, and that is load-bearing: it sits beside the account
        form, not inside it, so Enter here sets a password and never saves a
        half-finished profile.
      */}
      <form onSubmit={submit} className="flex flex-col gap-4">
        <p className="text-muted-foreground text-sm">
          Quản trị viên không biết mật khẩu cũ của người dùng nên không cần
          nhập. Đặt mật khẩu mới sẽ đăng xuất mọi phiên đang mở của tài khoản
          này.
        </p>
        <div className="flex flex-col gap-2">
          <Label htmlFor="new-password">Mật khẩu mới <span className="text-destructive" aria-hidden="true">*</span></Label>
          <InputPassword
            id="new-password"
            autoComplete="new-password"
            placeholder="Từ 8 đến 72 ký tự"
            minLength={8}
            required
            aria-invalid={tooLong || undefined}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {tooLong && (
            <p className="text-destructive text-sm">
              Mật khẩu mới chưa phù hợp. {PASSWORD_RANGE_MESSAGE}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="confirm-new-password">Nhập lại mật khẩu mới <span className="text-destructive" aria-hidden="true">*</span></Label>
          <InputPassword
            id="confirm-new-password"
            placeholder="Nhập lại mật khẩu mới"
            autoComplete="new-password"
            required
            aria-invalid={mismatch || undefined}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
          {mismatch && (
            <p className="text-destructive text-sm">Hai mật khẩu không khớp nhau.</p>
          )}
        </div>
        <Button
          type="submit"
          variant="secondary"
          className="w-full"
          disabled={mutation.isPending || !passwordInRange(password) || password !== confirm}
        >
          {mutation.isPending ? "Đang cập nhật..." : "Đặt mật khẩu"}
        </Button>
      </form>
    </DetailPanel>
  );
}
