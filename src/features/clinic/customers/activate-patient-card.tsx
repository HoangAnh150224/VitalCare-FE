import { useCan, useCustomMutation, useInvalidate, useNotification } from "@refinedev/core";
import { HeartPulseIcon } from "lucide-react";

import { API_URL } from "@/shared/api/constants";
import { Button } from "@/shared/ui/button";
import { DetailPanel } from "@/shared/components/views/record-detail";
import type { Customer } from "@/domains/customer/types";

/**
 * Making a neutral customer a patient without a check-in.
 *
 * For the path the business flow calls "patient activation by authorised
 * staff" — somebody being taken on outside an appointment. The usual path is a
 * check-in, which does this on its own.
 *
 * Renders nothing for a patient (there is nothing left to do, and the API
 * would refuse) or for an account without `customers:activate`.
 */
export function ActivatePatientCard({ customer }: { customer: Customer }) {
  const { open } = useNotification();
  const invalidate = useInvalidate();
  const { mutate, mutation } = useCustomMutation();
  const { data: access } = useCan({ resource: "customers", action: "activate" });

  if (customer.status !== "neutral" || !access?.can) {
    return null;
  }

  const activate = () => {
    mutate(
      {
        url: `${API_URL}/customers/${customer.id}/activate`,
        method: "post",
        values: {},
        // See ResetPasswordCard: without it Spring answers 415.
        config: { headers: { "Content-Type": "application/json" } },
        successNotification: false,
      },
      {
        onSuccess: () => {
          invalidate({ resource: "customers", invalidates: ["detail", "list"], id: customer.id });
          open?.({
            type: "success",
            message: "Đã kích hoạt hồ sơ bệnh nhân",
            description: `${customer.fullName} giờ là bệnh nhân của phòng khám.`,
          });
        },
      }
    );
  };

  return (
    <DetailPanel
      title="Kích hoạt bệnh nhân"
      action={<HeartPulseIcon className="text-muted-foreground size-4" />}
      bodyClassName="p-4"
    >
      <div className="flex flex-col gap-4">
        <p className="text-muted-foreground text-sm">
          Khách hàng này chưa là bệnh nhân. Thông thường hồ sơ được kích hoạt
          tự động khi check-in lịch hẹn; chỉ kích hoạt tay khi tiếp nhận bệnh
          nhân ngoài lịch hẹn. Thao tác được ghi lại kèm tên người thực hiện.
        </p>
        <Button onClick={activate} disabled={mutation.isPending} className="w-full">
          {mutation.isPending ? "Đang kích hoạt..." : "Kích hoạt hồ sơ bệnh nhân"}
        </Button>
      </div>
    </DetailPanel>
  );
}
