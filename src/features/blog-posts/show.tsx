import { useShow } from "@refinedev/core";

import { EditButton } from "@/shared/components/buttons/edit";
import { LoadingOverlay } from "@/shared/components/layout/loading-overlay";
import { RouteDialog } from "@/shared/components/views/route-dialog";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { DialogClose } from "@/shared/ui/dialog";
import { Separator } from "@/shared/ui/separator";
import { LOCALE } from "@/shared/lib/format";

/** Display text for each wire status; an unmapped one falls back to the raw string. */
const BLOG_STATUS_LABELS: Record<string, string> = {
  published: "Đã xuất bản",
  draft: "Bản nháp",
  rejected: "Bị từ chối",
};

export const BlogPostShow = () => {
  // The post arrives with its category nested, so there is no second request
  // to make here.
  const { result: record, query } = useShow({});
  const { isLoading } = query;

  return (
    <RouteDialog
      title={record?.title || "Bài viết"}
      description={
        <span className="flex items-center gap-3">
          <Badge
            variant={record?.status === "published" ? "default" : "secondary"}
          >
            {record?.status
              ? (BLOG_STATUS_LABELS[record.status] ?? record.status)
              : "-"}
          </Badge>
          <span>ID: {record?.id ?? "-"}</span>
        </span>
      }
      footer={
        <>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Đóng
            </Button>
          </DialogClose>
          <EditButton />
        </>
      }
    >
      <LoadingOverlay loading={isLoading}>
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-medium mb-2">Danh mục</h4>
            <p className="text-sm text-muted-foreground">
              {record?.category?.title || "-"}
            </p>
          </div>

          <Separator />

          <div>
            <h4 className="text-sm font-medium mb-2">Ngày tạo</h4>
            <p className="text-sm text-muted-foreground">
              {record?.createdAt
                ? new Date(record.createdAt).toLocaleDateString(LOCALE)
                : "-"}
            </p>
          </div>

          <Separator />

          <div>
            <h4 className="text-sm font-medium mb-4">Nội dung</h4>
            <div className="prose prose-sm max-w-none">
              {record?.content ? (
                <div dangerouslySetInnerHTML={{ __html: record.content }} />
              ) : (
                <p className="text-muted-foreground">Chưa có nội dung</p>
              )}
            </div>
          </div>
        </div>
      </LoadingOverlay>
    </RouteDialog>
  );
};
