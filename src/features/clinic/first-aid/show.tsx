import { useInvalidate, useShow } from "@refinedev/core";
import {
  ArchiveIcon,
  CheckIcon,
  HistoryIcon,
  PencilIcon,
  SendIcon,
  UndoIcon,
  UploadIcon,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";

import { LoadingOverlay } from "@/shared/components/layout/loading-overlay";
import { ShowView, ShowViewHeader } from "@/shared/components/views/show-view";
import {
  DetailList,
  DetailPanel,
  DetailRow,
  EmptyValue,
} from "@/shared/components/views/record-detail";
import {
  EmergencyWarning,
  GuidanceBody,
} from "@/shared/components/first-aid/guidance";
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
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import type { FirstAidArticle } from "@/domains/first-aid/types";
import { FIRST_AID_CATEGORY_LABELS } from "@/domains/first-aid/types";
import { formatDateTime } from "@/shared/lib/format";
import { FirstAidStatusBadge, revisionLabel, useFirstAidSteps } from "./parts";

type Confirm = "publish" | "archive" | null;

/**
 * SRS 3.17.6 / 3.17.8: an article and what may be done to it now. The buttons
 * are the ones the API listed in `actions`; a reviewer's note goes with an
 * approval and is required to send an article back.
 */
export const FirstAidShow = () => {
  const { result: article, query } = useShow<FirstAidArticle>({
    resource: "first_aid_articles",
  });
  const invalidate = useInvalidate();
  const steps = useFirstAidSteps(() => {
    void query.refetch();
    invalidate({ resource: "first_aid_articles", invalidates: ["list"] });
    setNote("");
  });
  const [note, setNote] = useState("");
  const [confirm, setConfirm] = useState<Confirm>(null);
  const can = (action: FirstAidArticle["actions"][number]) =>
    article?.actions.includes(action) ?? false;
  const deciding = can("approve") || can("reject");

  return (
    <ShowView>
      <ShowViewHeader
        resource="first_aid_articles"
        title="Chi tiết nội dung sơ cứu"
        canEdit={false}
      />

      <Card className="py-4">
        <LoadingOverlay loading={query.isLoading}>
          <div className="flex flex-wrap items-start gap-x-6 gap-y-3 px-6">
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold tracking-tight">
                  {article?.title ?? "—"}
                </h2>
                {article && <FirstAidStatusBadge status={article.status} />}
                {article && (
                  <span className="text-muted-foreground text-sm">
                    {revisionLabel(article.revision)}
                  </span>
                )}
              </div>
              <p className="text-muted-foreground text-sm">
                {article?.summary}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {can("submit") && (
                <Button
                  onClick={() => article && steps.run(article.id, "submit")}
                  disabled={steps.pending}
                >
                  <SendIcon />
                  Gửi duyệt
                </Button>
              )}
              {can("publish") && (
                <Button
                  onClick={() => setConfirm("publish")}
                  disabled={steps.pending}
                >
                  <UploadIcon />
                  Xuất bản
                </Button>
              )}
              {can("edit") && (
                <Button asChild variant="outline">
                  <Link to={`/first-aid-articles/edit/${article?.id}`}>
                    <PencilIcon />
                    Sửa nội dung
                  </Link>
                </Button>
              )}
              {article && (
                <Button asChild variant="outline">
                  <Link to={`/first-aid-articles/history/${article.id}`}>
                    <HistoryIcon />
                    Lịch sử phiên bản
                  </Link>
                </Button>
              )}
              {can("archive") && (
                <Button
                  variant="ghost"
                  onClick={() => setConfirm("archive")}
                  disabled={steps.pending}
                >
                  <ArchiveIcon />
                  Lưu trữ
                </Button>
              )}
            </div>
          </div>
        </LoadingOverlay>
      </Card>

      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <DetailPanel title="Xem trước nội dung">
          <div className="flex flex-col gap-4 p-5">
            {article && <EmergencyWarning text={article.emergencyWarning} />}
            {article && <GuidanceBody body={article.body} />}
          </div>
        </DetailPanel>

        <div className="flex flex-col gap-4">
          {deciding && article && (
            <DetailPanel title="Quyết định duyệt">
              <div className="flex flex-col gap-3 p-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="review-note">Nhận xét</Label>
                  <Textarea
                    id="review-note"
                    rows={3}
                    maxLength={1000}
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder="Thêm nhận xét / Lý do từ chối"
                  />
                  <p className="text-muted-foreground text-xs">
                    Bắt buộc khi từ chối. Chỉ xuất bản được sau khi phê duyệt.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() => steps.run(article.id, "approve", note)}
                    disabled={steps.pending}
                  >
                    <CheckIcon />
                    Phê duyệt
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => steps.run(article.id, "reject", note)}
                    disabled={steps.pending || !note.trim()}
                  >
                    <UndoIcon />
                    Từ chối
                  </Button>
                </div>
              </div>
            </DetailPanel>
          )}
          {article?.status === "pending_review" && !deciding && (
            <p className="text-muted-foreground rounded-xl border p-4 text-sm">
              Đang chờ người khác duyệt. Người viết không tự duyệt bài của mình.
            </p>
          )}
          <DetailPanel title="Thông tin nội dung">
            <DetailList>
              <DetailRow label="Danh mục">
                {article ? (
                  FIRST_AID_CATEGORY_LABELS[article.category]
                ) : (
                  <EmptyValue />
                )}
              </DetailRow>
              <DetailRow label="Tác giả">
                {article?.authorName ?? <EmptyValue />}
              </DetailRow>
              <DetailRow label="Người duyệt">
                {article?.reviewerName ?? <EmptyValue />}
              </DetailRow>
              {article?.reviewNote && (
                <DetailRow label="Nhận xét duyệt">
                  {article.reviewNote}
                </DetailRow>
              )}
              <DetailRow label="Bệnh nhân đang xem">
                {article?.publishedRevision ? (
                  `${revisionLabel(
                    article.publishedRevision
                  )}, từ ${formatDateTime(article.publishedAt)}`
                ) : (
                  <EmptyValue>Chưa xuất bản</EmptyValue>
                )}
              </DetailRow>
              <DetailRow label="Cập nhật gần nhất">
                {formatDateTime(article?.updatedAt)}
              </DetailRow>
            </DetailList>
          </DetailPanel>
        </div>
      </div>

      <AlertDialog
        open={confirm !== null}
        onOpenChange={(open) => !open && setConfirm(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm === "publish"
                ? "Xuất bản nội dung này?"
                : "Lưu trữ nội dung này?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm === "publish"
                ? `Bệnh nhân và người chăm sóc sẽ thấy ${
                    article ? revisionLabel(article.revision) : ""
                  } ngay, thay cho bản đang hiển thị (nếu có).`
                : "Bài sẽ không còn hiển thị trên trang sơ cứu. Lịch sử phiên bản vẫn được giữ."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Không</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (article && confirm)
                  void steps.run(article.id, confirm, note);
                setConfirm(null);
              }}
            >
              {confirm === "publish" ? "Xuất bản" : "Lưu trữ"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ShowView>
  );
};
