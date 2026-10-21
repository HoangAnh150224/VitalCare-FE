import { useCan, useCustomMutation, useInvalidate, useNotification } from "@refinedev/core";
import { CalendarClockIcon, CheckIcon, LogInIcon, UserXIcon, XIcon } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { Textarea } from "@/shared/ui/textarea";
import type { Appointment } from "@/domains/appointment/types";
import { formatQueueNumber } from "@/domains/appointment/types";
import { formatLocalDate } from "@/shared/lib/format";
import { clinicToday } from "./clinic-day";
import { DoctorDayHint, doctorLabel, useClinicDoctors } from "./doctor-day";

type Props = {
  appointment: Appointment;
  /**
   * Which side of the book this is: the front desk (`appointments`) checks
   * in, completes, reschedules, cancels and marks a no-show; a customer
   * (`my_appointments`) may reschedule and cancel their own.
   */
  resource: "appointments" | "my_appointments";
  size?: "sm" | "default";
  /** A list row: only the check-in, which the desk does with the person standing there. */
  compact?: boolean;
  /** Called after an action succeeds, with the updated appointment. */
  onDone?: (appointment: Appointment) => void;
};

type Action = "check-in" | "complete" | "cancel" | "no-show";

const DONE: Record<Action, string> = {
  "check-in": "Đã tiếp nhận",
  complete: "Đã hoàn tất lượt khám",
  cancel: "Đã huỷ đăng ký khám",
  "no-show": "Đã ghi nhận không đến",
};

/**
 * What can be done to one registered visit.
 *
 * Each button shows only when it would succeed: the right permission, the
 * right status, and — for check-in — today being its date in the clinic. A
 * button the API is certain to refuse is a button that teaches people to
 * ignore buttons.
 */
export function AppointmentActions({ appointment, resource, size = "default", compact = false, onDone }: Props) {
  const { open } = useNotification();
  const invalidate = useInvalidate();
  const { mutate, mutation } = useCustomMutation<Appointment>();
  // The two acts that cannot be undone ask first.
  const [confirming, setConfirming] = useState<"cancel" | "no-show" | null>(null);
  const [reason, setReason] = useState("");
  // The clinic cancelling a customer's visit has to say why; the API refuses
  // it otherwise. A customer cancelling their own only confirms.
  const desk = resource === "appointments";
  // Rescheduling: another doctor of the same clinic, another day, or both.
  const [rescheduling, setRescheduling] = useState(false);
  const [newDoctor, setNewDoctor] = useState("");
  const [newDate, setNewDate] = useState("");

  const { data: canCheckIn } = useCan({ resource: "appointments", action: "check_in" });
  // "cancel" stands for the write permission on either side of the book.
  const { data: canWrite } = useCan({ resource, action: "cancel" });

  const today = clinicToday();
  const scheduled = appointment.status === "scheduled";
  const writable = canWrite?.can ?? false;
  const showCheckIn = desk && scheduled && (canCheckIn?.can ?? false) && appointment.appointmentDate === today;
  const showComplete =
    !compact && desk && writable && (appointment.status === "checked_in" || appointment.status === "in_exam");
  const showChange = !compact && scheduled && writable;
  const showNoShow = showChange && desk && appointment.appointmentDate <= today;

  const { doctors } = useClinicDoctors(rescheduling ? appointment.clinic.id : undefined, newDate);
  const doctor = doctors.find((candidate) => String(candidate.id) === newDoctor);
  const samePlace =
    newDate === appointment.appointmentDate && newDoctor === String(appointment.doctor?.id ?? "");

  if (!showCheckIn && !showComplete && !showChange) {
    return null;
  }

  const finish = (message: string, data: Appointment | undefined, description?: string) => {
    invalidate({ resource, invalidates: ["detail", "list"], id: appointment.id });
    open?.({ type: "success", message, description });
    if (data) onDone?.(data);
  };

  const run = (action: Action) => {
    mutate(
      {
        url: `${API_URL}/${resource}/${appointment.id}/${action}`,
        method: "post",
        values: action === "cancel" && desk ? { reason: reason.trim() } : {},
        // See ResetPasswordCard: without it Spring answers 415.
        config: { headers: { "Content-Type": "application/json" } },
        successNotification: false,
      },
      {
        onSuccess: ({ data }) => {
          // A check-in can change the customer too.
          invalidate({ resource: "customers", invalidates: ["detail", "list"], id: appointment.customer.id });
          const becamePatient =
            action === "check-in" &&
            appointment.customer.status === "neutral" &&
            data?.customer?.status === "patient";
          finish(
            DONE[action],
            data,
            becamePatient ? `${appointment.customer.fullName} đã được kích hoạt thành bệnh nhân.` : undefined
          );
        },
      }
    );
  };

  // Same rule as cancel on both sides: still registered, and the API holds it
  // to two hours before the visit is expected (SRS BR-26).
  const reschedule = () => {
    mutate(
      {
        url: `${API_URL}/${resource}/${appointment.id}/reschedule`,
        method: "post",
        values: { employeeId: Number(newDoctor), appointmentDate: newDate },
        config: { headers: { "Content-Type": "application/json" } },
        successNotification: false,
      },
      {
        onSuccess: ({ data }) => {
          setRescheduling(false);
          finish(
            "Đã đổi đăng ký khám",
            data,
            data?.queueNumber != null ? `Số khám mới: ${formatQueueNumber(data.queueNumber)}.` : undefined
          );
        },
      }
    );
  };

  const busy = mutation.isPending;
  const visit = `${appointment.customer.fullName} · ${formatLocalDate(appointment.appointmentDate)} · số ${formatQueueNumber(appointment.queueNumber)}`;

  return (
    <div className="flex flex-wrap gap-2">
      {showCheckIn && (
        <Button size={size} onClick={() => run("check-in")} disabled={busy}>
          <LogInIcon />
          Tiếp nhận
        </Button>
      )}
      {showComplete && (
        <Button size={size} onClick={() => run("complete")} disabled={busy}>
          <CheckIcon />
          Hoàn tất
        </Button>
      )}
      {showChange && (
        <Button
          size={size}
          variant="outline"
          onClick={() => {
            setNewDoctor(String(appointment.doctor?.id ?? ""));
            setNewDate(appointment.appointmentDate);
            setRescheduling(true);
          }}
          disabled={busy}
        >
          <CalendarClockIcon />
          Đổi ngày khám
        </Button>
      )}
      {showNoShow && (
        <Button size={size} variant="outline" onClick={() => setConfirming("no-show")} disabled={busy}>
          <UserXIcon />
          Không đến
        </Button>
      )}
      {showChange && (
        <Button
          size={size}
          variant="outline"
          onClick={() => {
            setReason("");
            setConfirming("cancel");
          }}
          disabled={busy}
        >
          <XIcon />
          Huỷ
        </Button>
      )}

      <Dialog open={rescheduling} onOpenChange={setRescheduling}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Đổi đăng ký khám</DialogTitle>
            <DialogDescription>
              {visit}
              {appointment.doctor ? ` với ${appointment.doctor.fullName}` : ""}. Đổi bác sĩ hoặc ngày sẽ được cấp
              số khám mới; mã phiếu giữ nguyên.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_11rem]">
              <Select value={newDoctor} onValueChange={setNewDoctor}>
                <SelectTrigger className="w-full" aria-label="Bác sĩ">
                  <SelectValue placeholder="Chọn bác sĩ" />
                </SelectTrigger>
                <SelectContent>
                  {doctors.map((option) => (
                    <SelectItem key={option.id} value={String(option.id)}>
                      {doctorLabel(option)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="date"
                aria-label="Ngày khám mới"
                min={today}
                value={newDate}
                onChange={(event) => setNewDate(event.target.value)}
              />
            </div>
            {samePlace ? (
              <p className="text-muted-foreground text-sm">Đây là bác sĩ và ngày hiện tại của lượt đăng ký này.</p>
            ) : (
              <DoctorDayHint doctor={doctor} date={newDate} />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRescheduling(false)} disabled={busy}>
              Đóng
            </Button>
            <Button onClick={reschedule} disabled={samePlace || !doctor?.day?.bookable || busy}>
              {busy ? "Đang lưu..." : "Xác nhận đổi"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirming !== null} onOpenChange={(next) => !next && setConfirming(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirming === "no-show" ? "Ghi nhận bệnh nhân không đến?" : "Huỷ đăng ký khám này?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {visit}.{" "}
              {confirming === "no-show"
                ? "Lượt đăng ký sẽ đóng lại; bệnh nhân muốn khám phải đăng ký mới."
                : "Đăng ký đã huỷ không khôi phục được, số khám không cấp lại."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {confirming === "cancel" && desk && (
            <Textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              maxLength={500}
              placeholder="Lý do huỷ (bắt buộc) — bệnh nhân sẽ thấy nội dung này"
              aria-label="Lý do huỷ"
            />
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Không</AlertDialogCancel>
            <AlertDialogAction
              disabled={confirming === "cancel" && desk && reason.trim() === ""}
              onClick={() => confirming && run(confirming)}
            >
              {confirming === "no-show" ? "Xác nhận không đến" : "Xác nhận huỷ"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
