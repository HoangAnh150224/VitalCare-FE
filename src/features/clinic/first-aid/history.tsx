import { useCustom } from "@refinedev/core";
import { ArrowRightIcon, ChevronDownIcon } from "lucide-react";
import { Fragment, useState } from "react";
import { Link, useParams } from "react-router";

import { API_URL } from "@/shared/api/constants";
import { ShowView, ShowViewHeader } from "@/shared/components/views/show-view";
import { DetailPanel } from "@/shared/components/views/record-detail";
import {
  EmergencyWarning,
  GuidanceBody,
} from "@/shared/components/first-aid/guidance";
import { Button } from "@/shared/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
import type { FirstAidStep } from "@/domains/first-aid/types";
import { FIRST_AID_STATUS_LABELS } from "@/domains/first-aid/types";
import { formatDateTime } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";
import { revisionLabel } from "./parts";

/**
 * SRS 3.17.9: every step an article went through, newest first, each with the
 * content it left — nothing overwritten (BR-31). A row opens to show that
 * content.
 */
export const FirstAidHistory = () => {
  const { id } = useParams();
  const { result, query } = useCustom<FirstAidStep[]>({
    url: `${API_URL}/first_aid_articles/${id}/history`,
    method: "get",
    queryOptions: { enabled: Boolean(id) },
  });
  // An array, or the empty object useCustom answers before there is data.
  const steps: FirstAidStep[] = Array.isArray(result?.data) ? result.data : [];
  const [openId, setOpenId] = useState<number | null>(null);

  return (
    <ShowView>
      <ShowViewHeader
        resource="first_aid_articles"
        title="Lịch sử phiên bản"
        canEdit={false}
      />
      <DetailPanel
        title={
          steps[0] ? `${steps[0].title} · ${steps.length} bước` : "Lịch sử"
        }
        action={
          <Button asChild size="sm">
            <Link to={`/first-aid-articles/show/${id}`}>Nội dung hiện tại</Link>
          </Button>
        }
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Phiên bản</TableHead>
              <TableHead>Thay đổi trạng thái</TableHead>
              <TableHead>Người thực hiện</TableHead>
              <TableHead>Thời điểm</TableHead>
              <TableHead>Ghi chú</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {query.isLoading && (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground">
                  Đang tải…
                </TableCell>
              </TableRow>
            )}
            {steps.map((step) => (
              <Fragment key={step.id}>
                <TableRow
                  className="cursor-pointer"
                  onClick={() => setOpenId(openId === step.id ? null : step.id)}
                >
                  <TableCell className="font-medium tabular-nums">
                    {revisionLabel(step.revision)}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1.5">
                      {step.fromStatus
                        ? FIRST_AID_STATUS_LABELS[step.fromStatus]
                        : "Tạo mới"}
                      <ArrowRightIcon className="text-muted-foreground size-3.5" />
                      {FIRST_AID_STATUS_LABELS[step.toStatus]}
                    </span>
                  </TableCell>
                  <TableCell>{step.actorName ?? "Hệ thống"}</TableCell>
                  <TableCell className="tabular-nums">
                    {formatDateTime(step.at)}
                  </TableCell>
                  <TableCell className="max-w-64 whitespace-normal">
                    {step.note ?? "—"}
                  </TableCell>
                  <TableCell>
                    <ChevronDownIcon
                      className={cn(
                        "size-4 transition-transform",
                        openId === step.id && "rotate-180"
                      )}
                    />
                  </TableCell>
                </TableRow>
                {openId === step.id && (
                  <TableRow className="hover:bg-transparent">
                    <TableCell
                      colSpan={6}
                      className="bg-muted/30 whitespace-normal"
                    >
                      <div className="flex max-w-3xl flex-col gap-3 py-2">
                        <p className="text-lg font-semibold">{step.title}</p>
                        <p className="text-muted-foreground text-sm">
                          {step.summary}
                        </p>
                        <EmergencyWarning text={step.emergencyWarning} />
                        <GuidanceBody body={step.body} />
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            ))}
          </TableBody>
        </Table>
      </DetailPanel>
    </ShowView>
  );
};
