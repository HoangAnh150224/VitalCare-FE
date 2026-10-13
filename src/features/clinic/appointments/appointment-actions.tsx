import { useCan, useCustomMutation, useInvalidate, useNotification } from "@refinedev/core";
import { CalendarClockIcon, LogInIcon, XIcon } from "lucide-react";
import { useState } from "react";

import { API_URL } from "@/shared/api/constants";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import type { Appointment } from "@/domains/appointment/types";
import { clinicToday } from "./clinic-day";
import { SlotPicker } from "./slot-picker";

type Props = {
  appointment: Appointment;
  /**
   * Which side of the book this is: the front desk (`appointments`) may check
   * in, reschedule and cancel; a customer (`my_appointments`) may reschedule
   * and cancel their own.
   */
  resource: "appointments" | "my_appointments";
  size?: "sm" | "default";
  /** Called after a check-in or cancel succeeds, with the updated appointment. */
  onDone?: (appointment: Appointment) => void;
};

/**
 * Check-in, reschedule and cancel, for one appointment.
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
  const [confirming, setConfirming] = useState(false);
  const [reason, setReason] = useState("");
  // The clinic cancelling a customer's visit has to say why; the API refuses
  // it otherwise. A customer cancelling their own only confirms.
  const reasonRequired = resource === "appointments";
  // Rescheduling: another day and slot of the same clinic.
  const [rescheduling, setRescheduling] = useState(false);
  const [newDate, setNewDate] = useState("");
  const [newStart, setNewStart] = useState("");
  const [lastBookableDate, setLastBookableDate] = useState<string | undefined>();

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

  // Same rule as cancel on both sides: still scheduled, and the API holds it
  // to two hours before the start (SRS BR-26).
  const sameSlot = newDate === appointment.appointmentDate && newStart === appointment.startTime;
  const reschedule = () => {
    mutate(
      {
        url: `${API_URL}/${resource}/${appointment.id}/reschedule`,
        method: "post",
        values: { appointmentDate: newDate, startTime: newStart },
        config: { headers: { "Content-Type": "application/json" } },
        successNotification: false,
      },
      {
        onSuccess: ({ data }) => {
          setRescheduling(false);
          invalidate({ resource, invalidates: ["detail", "list"], id: appointment.id });
          open?.({ type: "success", message: "Đã đổi lịch hẹn" });
          if (data) onDone?.(data);
        },
      }
    );
  };

  const run = (action: "check-in" | "cancel") => {
    mutate(
      {
        url: `${API_URL}/${resource}/${appointment.id}/${action}`,
        method: "post",
        values: action === "cancel" && reasonRequired ? { reason: reason.trim() } : {},
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
          onClick={() => {
            setNewDate(appointment.appointmentDate);
            setNewStart("");
            setRescheduling(true);
          }}
          disabled={mutation.isPending}
        >
          <CalendarClockIcon />
          Đổi lịch
        </Button>
      )}
      {showCancel && (
        <Button
          size={size}
          variant="outline"
          onClick={() => {
            setReason("");
            setConfirming(true);
          }}
          disabled={mutation.isPending}
        >
          <XIcon />
          Huỷ lịch
        </Button>
      )}

      <Dialog open={rescheduling} onOpenChange={setRescheduling}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Đổi lịch hẹn</DialogTitle>
            <DialogDescription>
              {appointment.customer.fullName} · đang hẹn {appointment.appointmentDate}{" "}
              {appointment.startTime.slice(0, 5)} tại {appointment.clinic.name}. Mã đặt lịch giữ nguyên.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <Input
              type="date"
              aria-label="Ngày khám mới"
              className="w-48"
              min={clinicToday()}
              max={lastBookableDate}
              value={newDate}
              onChange={(event) => {
                setNewDate(event.target.value);
                setNewStart("");
              }}
            />
            <SlotPicker
              clinicId={appointment.clinic.id}
              date={newDate}
              value={newStart}
              onChange={setNewStart}
              onWindow={setLastBookableDate}
            />
            {sameSlot && <p className="text-muted-foreground text-sm">Đây là khung giờ hiện tại của lịch hẹn.</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRescheduling(false)} disabled={mutation.isPending}>
              Đóng
            </Button>
            <Button onClick={reschedule} disabled={!newDate || !newStart || sameSlot || mutation.isPending}>
              {mutation.isPending ? "Đang lưu..." : "Xác nhận đổi lịch"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Huỷ lịch hẹn này?</AlertDialogTitle>
            <AlertDialogDescription>
              {appointment.customer.fullName} · {appointment.appointmentDate} {appointment.startTime.slice(0, 5)}.
              Lịch đã huỷ không khôi phục được.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {reasonRequired && (
            <Textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              maxLength={500}
              placeholder="Lý do huỷ (bắt buộc) — khách hàng sẽ thấy nội dung này"
              aria-label="Lý do huỷ"
            />
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Không huỷ</AlertDialogCancel>
            <AlertDialogAction
              disabled={reasonRequired && reason.trim() === ""}
              onClick={() => run("cancel")}
            >
              Xác nhận huỷ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
