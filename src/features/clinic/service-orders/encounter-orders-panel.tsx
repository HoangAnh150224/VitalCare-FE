import { useCan, useCustom, useCustomMutation, useList, useNotification } from "@refinedev/core";
import { CheckIcon, PlusIcon, XIcon } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";

import { API_URL } from "@/shared/api/constants";
import { DetailPanel } from "@/shared/components/views/record-detail";
import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Label } from "@/shared/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Textarea } from "@/shared/ui/textarea";
import type { MedicalService, ServiceOrder } from "@/domains/billing/types";
import { isOrderOutstanding, SERVICE_CATEGORY_LABELS } from "@/domains/billing/types";
import { formatDateTime, formatMoney } from "@/shared/lib/format";
import { CancelOrderDialog, OrderFiles, OrderStatusBadge, useOrderActions } from "./order-parts";

/**
 * An encounter's orders. The encounter page and its panel ask with the same
 * key, so they share one request: the page needs the count to know whether
 * the visit can be concluded.
 */
export function useEncounterOrders(encounterId: number | undefined, enabled = true) {
  const { result, query } = useCustom<ServiceOrder[]>({
    url: `${API_URL}/clinical_encounters/${encounterId}/service_orders`,
    method: "get",
    queryOptions: { enabled: enabled && encounterId != null },
  });
  const orders = Array.isArray(result?.data) ? result.data : [];
  return { orders, outstanding: orders.filter(isOrderOutstanding).length, refetch: query.refetch, loading: query.isLoading };
}

/**
 * The services a doctor ordered in this visit, with their results (Report 1
 * FE-22): ordering, reading the result, marking it read, cancelling.
 * Carrying out an order happens on its own page, from the worklist.
 */
export function EncounterOrdersPanel({ encounterId, open: encounterOpen }: { encounterId: number; open: boolean }) {
  const { data: canWrite } = useCan({ resource: "service_orders", action: "create" });
  const { orders, refetch, loading } = useEncounterOrders(encounterId);
  const actions = useOrderActions(() => void refetch());
  const [ordering, setOrdering] = useState(false);
  const [cancelling, setCancelling] = useState<ServiceOrder | null>(null);
  const writable = (canWrite?.can ?? false) && encounterOpen;

  return (
    <DetailPanel
      title="Chỉ định dịch vụ"
      action={
        writable && (
          <Button size="sm" variant="outline" onClick={() => setOrdering(true)}>
            <PlusIcon />
            Chỉ định
          </Button>
        )
      }
    >
      {orders.length === 0 ? (
        <p className="text-muted-foreground px-4 py-6 text-sm">
          {loading ? "Đang tải..." : encounterOpen ? "Chưa chỉ định dịch vụ nào trong lần khám này." : "Không có dịch vụ nào."}
        </p>
      ) : (
        <ul className="divide-y">
          {orders.map((order) => (
            <li key={order.id} className="flex flex-col gap-2 px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <Link to={`/service-orders/show/${order.id}`} className="font-medium hover:underline">
                  {order.service.name}
                </Link>
                <OrderStatusBadge status={order.status} />
                <span className="text-muted-foreground ms-auto text-sm tabular-nums">{formatMoney(order.unitPrice)}</span>
              </div>
              {order.instruction && <p className="text-muted-foreground text-sm">Ghi chú: {order.instruction}</p>}
              {(order.status === "ordered" || order.status === "in_progress") && (
                <p className="text-muted-foreground text-xs">Dự kiến có kết quả {formatDateTime(order.expectedResultAt)}</p>
              )}
              {order.resultText && (
                <p className="bg-surface-subtle rounded-md px-3 py-2 text-sm whitespace-pre-wrap">{order.resultText}</p>
              )}
              <OrderFiles order={order} />
              {order.cancelReason && <p className="text-muted-foreground text-xs">Lý do huỷ: {order.cancelReason}</p>}
              {writable && (order.status === "result_ready" || order.status === "ordered" || order.status === "in_progress") && (
                <div className="flex flex-wrap gap-2">
                  {order.status === "result_ready" && (
                    <Button size="sm" onClick={() => actions.review(order.id)} disabled={actions.pending}>
                      <CheckIcon />
                      Đã xem kết quả
                    </Button>
                  )}
                  {order.status !== "result_ready" && (
                    <Button size="sm" variant="ghost" onClick={() => setCancelling(order)} disabled={actions.pending}>
                      <XIcon />
                      Huỷ
                    </Button>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <OrderDialog
        encounterId={encounterId}
        open={ordering}
        onClose={() => setOrdering(false)}
        onOrdered={() => {
          setOrdering(false);
          void refetch();
        }}
      />
      <CancelOrderDialog
        order={cancelling}
        onClose={() => setCancelling(null)}
        onConfirm={async (reason) => {
          const order = cancelling;
          setCancelling(null);
          if (order) await actions.cancel(order.id, reason);
        }}
      />
    </DetailPanel>
  );
}

/** Picking a service from the catalogue; the examination fee itself is not ordered, it is on every bill. */
function OrderDialog({
  encounterId,
  open,
  onClose,
  onOrdered,
}: {
  encounterId: number;
  open: boolean;
  onClose: () => void;
  onOrdered: () => void;
}) {
  const { result } = useList<MedicalService>({
    resource: "medical_services",
    pagination: { mode: "off" },
    queryOptions: { enabled: open },
  });
  const services = (result?.data ?? []).filter((s) => s.status === "active" && s.category !== "consultation");
  const [serviceId, setServiceId] = useState("");
  const [instruction, setInstruction] = useState("");
  const { mutate, mutation } = useCustomMutation();
  const { open: notify } = useNotification();
  const chosen = services.find((s) => String(s.id) === serviceId);

  const reset = () => {
    setServiceId("");
    setInstruction("");
  };

  const submit = () =>
    mutate(
      {
        url: `${API_URL}/clinical_encounters/${encounterId}/service_orders`,
        method: "post",
        values: { serviceId: Number(serviceId), instruction: instruction.trim() || null },
        config: { headers: { "Content-Type": "application/json" } },
        successNotification: false,
      },
      {
        onSuccess: () => {
          notify?.({ type: "success", message: `Đã chỉ định ${chosen?.name ?? "dịch vụ"}` });
          reset();
          onOrdered();
        },
      },
    );

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          reset();
          onClose();
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Chỉ định dịch vụ</DialogTitle>
          <DialogDescription>Người thực hiện sẽ thấy chỉ định trong danh sách việc của cơ sở.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="order-service">Dịch vụ</Label>
            <Select value={serviceId} onValueChange={setServiceId}>
              <SelectTrigger id="order-service" className="w-full">
                <SelectValue placeholder="Chọn dịch vụ" />
              </SelectTrigger>
              <SelectContent>
                {services.map((service) => (
                  <SelectItem key={service.id} value={String(service.id)}>
                    {service.name} · {formatMoney(service.price)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {chosen && (
              <p className="text-muted-foreground text-xs">
                {SERVICE_CATEGORY_LABELS[chosen.category]}, có kết quả sau khoảng {chosen.turnaroundMinutes} phút.
              </p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="order-instruction">Ghi chú cho người thực hiện</Label>
            <Textarea
              id="order-instruction"
              value={instruction}
              onChange={(event) => setInstruction(event.target.value)}
              rows={3}
              maxLength={1000}
              placeholder="Không bắt buộc"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Đóng
          </Button>
          <Button onClick={submit} disabled={!serviceId || mutation.isPending}>
            {mutation.isPending ? "Đang chỉ định..." : "Chỉ định"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
