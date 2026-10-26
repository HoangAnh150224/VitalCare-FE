import { useCan, useInvalidate, useShow } from "@refinedev/core";
import { PlayIcon, SendIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router";

import { LoadingOverlay } from "@/shared/components/layout/loading-overlay";
import { ShowView, ShowViewHeader } from "@/shared/components/views/show-view";
import { DetailList, DetailPanel, DetailRow, EmptyValue } from "@/shared/components/views/record-detail";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { Textarea } from "@/shared/ui/textarea";
import type { ServiceOrder } from "@/domains/billing/types";
import { SERVICE_CATEGORY_LABELS } from "@/domains/billing/types";
import { formatDateTime, formatMoney } from "@/shared/lib/format";
import { AttachFileButton, OrderFiles, OrderStatusBadge, useOrderActions } from "./order-parts";

/**
 * One ordered service, from the side of whoever carries it out: start it,
 * write the result, attach the sheet or the image, hand it back to the doctor.
 * Correcting a result stays possible until the doctor has marked it read.
 */
export const ServiceOrderShow = () => {
  const { result: order, query } = useShow<ServiceOrder>({ resource: "service_orders" });
  const invalidate = useInvalidate();
  const { data: canWrite } = useCan({ resource: "service_orders", action: "edit" });
  const refresh = () => {
    void query.refetch();
    invalidate({ resource: "service_orders", invalidates: ["list"] });
  };
  const actions = useOrderActions(refresh);
  const [draft, setDraft] = useState("");
  // The draft starts from what is saved, and follows it when another save lands.
  useEffect(() => setDraft(order?.resultText ?? ""), [order?.resultText]);

  const writable = (canWrite?.can ?? false) && order?._can?.write !== false;
  const working = order?.status === "in_progress" || order?.status === "result_ready";
  const dirty = draft.trim() !== (order?.resultText ?? "");

  return (
    <ShowView>
      <ShowViewHeader resource="service_orders" title="Chỉ định dịch vụ" />

      <Card className="py-4">
        <LoadingOverlay loading={query.isLoading}>
          <div className="flex flex-wrap items-start gap-x-6 gap-y-3 px-6">
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold tracking-tight">{order?.service.name ?? "—"}</h2>
                {order && <OrderStatusBadge status={order.status} />}
              </div>
              <p className="text-muted-foreground text-sm">
                {order?.patient.fullName}
                <span className="ml-2 font-mono">{order?.patient.customerCode}</span>
              </p>
            </div>
            {writable && order?.status === "ordered" && (
              <Button onClick={() => actions.start(order.id)} disabled={actions.pending}>
                <PlayIcon />
                Bắt đầu thực hiện
              </Button>
            )}
          </div>
        </LoadingOverlay>
      </Card>

      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <DetailPanel title="Kết quả">
          <div className="flex flex-col gap-3 p-4">
            {order?.instruction && (
              <p className="text-sm">
                <span className="text-muted-foreground">Ghi chú của bác sĩ: </span>
                {order.instruction}
              </p>
            )}
            {writable && working ? (
              <>
                <Textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  rows={8}
                  maxLength={20000}
                  placeholder="Nhập kết quả: chỉ số, mô tả hình ảnh, kết luận của người thực hiện"
                  aria-label="Kết quả"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    onClick={() => order && actions.saveResult(order.id, draft.trim())}
                    disabled={!draft.trim() || !dirty || actions.pending}
                  >
                    <SendIcon />
                    {order?.status === "result_ready" ? "Lưu chỉnh sửa" : "Trả kết quả"}
                  </Button>
                  <AttachFileButton busy={actions.uploading} onPick={(file) => order && actions.upload(order.id, file)} />
                  <span className="text-muted-foreground text-xs">PDF, PNG hoặc JPEG, tối đa 10 MB.</span>
                </div>
              </>
            ) : order?.resultText ? (
              <p className="text-sm whitespace-pre-wrap">{order.resultText}</p>
            ) : (
              <p className="text-muted-foreground text-sm">
                {order?.status === "ordered"
                  ? "Bấm “Bắt đầu thực hiện” để nhập kết quả."
                  : order?.status === "cancelled"
                    ? `Đã huỷ: ${order.cancelReason ?? ""}`
                    : "Chưa có kết quả."}
              </p>
            )}
            {order && <OrderFiles order={order} />}
          </div>
        </DetailPanel>

        <DetailPanel title="Thông tin">
          <DetailList>
            <DetailRow label="Nhóm">{order ? SERVICE_CATEGORY_LABELS[order.service.category] : <EmptyValue />}</DetailRow>
            <DetailRow label="Giá">{formatMoney(order?.unitPrice)}</DetailRow>
            <DetailRow label="Chỉ định">
              {order ? `${order.orderedBy ?? "—"}, ${formatDateTime(order.orderedAt)}` : <EmptyValue />}
            </DetailRow>
            <DetailRow label="Dự kiến có kết quả">{formatDateTime(order?.expectedResultAt)}</DetailRow>
            <DetailRow label="Người thực hiện">
              {order?.performedBy ? `${order.performedBy}, ${formatDateTime(order.startedAt)}` : <EmptyValue />}
            </DetailRow>
            <DetailRow label="Có kết quả lúc">{formatDateTime(order?.resultAt)}</DetailRow>
            <DetailRow label="Bác sĩ đã xem">
              {order?.reviewedBy ? `${order.reviewedBy}, ${formatDateTime(order.reviewedAt)}` : <EmptyValue />}
            </DetailRow>
            <DetailRow label="Lần khám">
              {order ? (
                <Link to={`/clinical-encounters/show/${order.encounterId}`} className="hover:underline">
                  #{order.encounterId}
                </Link>
              ) : (
                <EmptyValue />
              )}
            </DetailRow>
          </DetailList>
        </DetailPanel>
      </div>
    </ShowView>
  );
};
