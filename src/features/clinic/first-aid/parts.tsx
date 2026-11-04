import { useCustomMutation, useNotification } from "@refinedev/core";

import { API_URL } from "@/shared/api/constants";
import { Badge } from "@/shared/ui/badge";
import type {
  FirstAidArticle,
  FirstAidStatus,
} from "@/domains/first-aid/types";
import { FIRST_AID_STATUS_LABELS } from "@/domains/first-aid/types";
import { billingErrorNotification } from "@/domains/billing/messages";
import { FIRST_AID_STATUS_VARIANTS } from "@/shared/lib/status-variants";

export const FirstAidStatusBadge = ({ status }: { status: FirstAidStatus }) => (
  <Badge variant={FIRST_AID_STATUS_VARIANTS[status]}>
    {FIRST_AID_STATUS_LABELS[status]}
  </Badge>
);

/** "v3", the way the wireframes write a revision. */
export const revisionLabel = (revision: number) => `v${revision}`;

type Step = "submit" | "approve" | "reject" | "publish" | "archive";

const DONE: Record<Step, string> = {
  submit: "Đã gửi duyệt",
  approve: "Đã phê duyệt",
  reject: "Đã trả về cho người viết",
  publish: "Đã xuất bản, bệnh nhân đã xem được",
  archive: "Đã lưu trữ, nội dung không còn hiển thị công khai",
};

/**
 * The steps of an article's life, each a POST on
 * `/first_aid_articles/{id}/{step}`. `onChanged` gets the article back as the
 * API now has it.
 */
export function useFirstAidSteps(
  onChanged: (article: FirstAidArticle) => void
) {
  const { mutate, mutation } = useCustomMutation<FirstAidArticle>();
  const { open } = useNotification();

  const run = (id: number, step: Step, note?: string) =>
    new Promise<boolean>((resolve) =>
      mutate(
        {
          url: `${API_URL}/first_aid_articles/${id}/${step}`,
          method: "post",
          values: { note: note?.trim() || null },
          config: { headers: { "Content-Type": "application/json" } },
          successNotification: false,
          errorNotification: billingErrorNotification,
        },
        {
          onSuccess: ({ data }) => {
            onChanged(data);
            open?.({ type: "success", message: DONE[step] });
            resolve(true);
          },
          onError: () => resolve(false),
        }
      )
    );

  return { run, pending: mutation.isPending };
}
