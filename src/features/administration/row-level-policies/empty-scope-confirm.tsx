import { useState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui/alert-dialog";
import type { ScopeNode } from "@/domains/row-level-policy/types";
import type { PolicyFormValues } from "./policy-form";

/** `{ all: [] }` — no condition at all, which matches every row. */
function hasNoCondition(scope: ScopeNode | null | undefined): boolean {
  return !scope || ("all" in scope && scope.all.length === 0);
}

/**
 * Asks before creating a policy with no condition (KAN-64): an empty condition
 * is not "nothing yet", it is "every row of the resource".
 *
 * `guard` stands in for the submit handler; `dialog` is rendered once, anywhere.
 */
export function useEmptyScopeConfirm(submit: (values: PolicyFormValues) => void) {
  const [pending, setPending] = useState<PolicyFormValues | null>(null);

  function guard(values: PolicyFormValues) {
    if (hasNoCondition(values.scope)) setPending(values);
    else submit(values);
  }

  const dialog = (
    <AlertDialog
      open={pending !== null}
      onOpenChange={(open) => !open && setPending(null)}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Tạo chính sách không có điều kiện?</AlertDialogTitle>
          <AlertDialogDescription>
            Bạn chưa thêm điều kiện nào ở mục “Những dòng khớp với chính sách”.
            Không có điều kiện nghĩa là chính sách khớp với <b>mọi dòng</b> của
            tài nguyên này: một phạm vi sẽ cho vai trò thấy toàn bộ dữ liệu, một
            bộ lọc sẽ không loại bỏ dòng nào. Nếu đó không phải ý bạn, hãy quay
            lại và thêm điều kiện.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Quay lại thêm điều kiện</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              if (pending) submit(pending);
              setPending(null);
            }}
          >
            Vẫn tạo
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return { guard, dialog };
}
