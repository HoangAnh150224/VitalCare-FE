import { useCan, useCustomMutation, useInvalidate, useNotification } from "@refinedev/core";
import { LogInIcon, XIcon } from "lucide-react";

import { API_URL } from "@/shared/api/constants";
import { Button } from "@/shared/ui/button";
import type { Appointment } from "@/domains/appointment/types";
import { clinicToday } from "./clinic-day";

type Props = {
  appointment: Appointment;
  /**
   * Which side of the book this is: the front desk (`appointments`) may check
   * in and cancel; a customer (`my_appointments`) may only cancel their own.
   */
  resource: "appointments" | "my_appointments";
  size?: "sm" | "default";
  /** Called after a check-in or cancel succeeds, with the updated appointment. */
  onDone?: (appointment: Appointment) => void;
};

/**
 * Check-in and cancel, for one appointment.
 *
 * Each button shows only when it would succeed: the right permission, a
 * scheduled appointment, and — for check-in — today being its date in the
 * clinic. A button the API is certain to refuse is a button that teaches
 * people to ignore buttons.
 */
export function AppointmentActions({ appointment, resource, size = "default", onDone }: Props) {
  const { open } = useNotification();
  const invalidate = useInvalidate();
  const { mutate, mutation } = useCustomMutation<Appointment>();

  const { data: canCheckIn } = useCan({ resource: "appointments", action: "check_in" });
  const { data: canCancel } = useCan({ resource, action: "cancel" });

  const scheduled = appointment.status === "scheduled";
  const showCheckIn =
    resource === "appointments" &&
    scheduled &&
    (canCheckIn?.can ?? false) &&
    appointment.appointmentDate === clinicToday();
  const showCancel = scheduled && (canCancel?.can ?? false);

  if (!showCheckIn && !showCancel) {
    return null;
  }

  const run = (action: "check-in" | "cancel") => {
    mutate(
      {
        url: `${API_URL}/${resource}/${appointment.id}/${action}`,
        method: "post",
        values: {},
        // See ResetPasswordCard: without it Spring answers 415.
        config: { headers: { "Content-Type": "application/json" } },
        successNotification: false,
      },
      {
        onSuccess: ({ data }) => {
          invalidate({ resource, invalidates: ["detail", "list"], id: appointment.id });
          // A check-in can change the customer too.
          invalidate({ resource: "customers", invalidates: ["detail", "list"], id: appointment.customer.id });

          const becamePatient =
            action === "check-in" &&
            appointment.customer.status === "neutral" &&
            data?.customer?.status === "patient";
          open?.({
            type: "success",
            message: action === "check-in" ? "Đã check-in" : "Đã huỷ lịch hẹn",
            description: becamePatient
              ? `${appointment.customer.fullName} đã được kích hoạt thành bệnh nhân.`
              : undefined,
          });
          if (data) onDone?.(data);
        },
      }
    );
  };

  return (
    <div className="flex flex-wrap gap-2">
      {showCheckIn && (
        <Button size={size} onClick={() => run("check-in")} disabled={mutation.isPending}>
          <LogInIcon />
          Check-in
        </Button>
      )}
      {showCancel && (
        <Button
          size={size}
          variant="outline"
          onClick={() => run("cancel")}
          disabled={mutation.isPending}
        >
          <XIcon />
          Huỷ lịch
        </Button>
      )}
    </div>
  );
}
