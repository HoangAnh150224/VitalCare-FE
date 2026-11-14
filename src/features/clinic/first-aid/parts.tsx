import { useCustomMutation, useNotification, useInvalidate } from "@refinedev/core";
import { PauseIcon, PlayIcon } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/shared/ui/alert-dialog";

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

export function FirstAidAvailabilityButton({ article }: { article: FirstAidArticle }) {
  const invalidate = useInvalidate();
  const steps = useFirstAidSteps(() => {
    void invalidate({ resource: "first_aid_articles", invalidates: ["list", "detail"] });
  });
  const action = article.actions.includes("pause") ? "pause" : article.actions.includes("resume") ? "resume" : null;
  if (!action) return null;
  const label = action === "pause" ? "Tạm ngưng" : "Mở lại";
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon-sm" title={label} aria-label={label} disabled={steps.pending}>
          {action === "pause" ? <PauseIcon /> : <PlayIcon />}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{label} nội dung này?</AlertDialogTitle>
          <AlertDialogDescription>
            {action === "pause" ? "Ẩn bài khỏi trang sơ cứu của bệnh nhân. Bạn có thể mở lại và giữ nguyên phiên bản." : "Hiển thị lại bài cho bệnh nhân, giữ nguyên nội dung và phiên bản đã xuất bản."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Hủy</AlertDialogCancel>
          <AlertDialogAction onClick={() => void steps.run(article.id, action)}>{label}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

type Step = "submit" | "approve" | "reject" | "publish" | "archive" | "pause" | "resume";

const DONE: Record<Step, string> = {
  pause: "Đã tạm ngưng nội dung",
  resume: "Đã mở lại nội dung",
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
