import { useCustomMutation, useInvalidate, useList, useNotification } from "@refinedev/core";
import { CalendarCheckIcon, RefreshCwIcon, UserCogIcon } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";

import { API_URL } from "@/shared/api/constants";
import { formatDateTime, formatLocalDate } from "@/shared/lib/format";
import { Button } from "@/shared/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import type { Appointment } from "@/domains/appointment/types";
import { APPOINTMENT_STATUS_LABELS } from "@/domains/appointment/types";
import type { Customer } from "@/domains/customer/types";
import { clinicToday } from "./clinic-day";

const JSON_HEADERS = { headers: { "Content-Type": "application/json" } };

/**
 * UC-02 B1: what the desk does with a visit that cannot be checked in as it
 * is — the outcomes are "fixed" (moved to today, or given to the right
 * profile), "convert to walk-in", or "refuse" (the Huỷ button beside it, or
 * simply sending the patient away). A visit that can be checked in today shows
 * only the wrong-examinee fix.
 */
export function DeskResolution({
  appointment,
  onDone,
}: {
  appointment: Appointment;
  onDone: (appointment: Appointment) => void;
}) {
  const today = clinicToday();
  const navigate = useNavigate();
  const { open } = useNotification();
  const invalidate = useInvalidate();
  const { mutate, mutation } = useCustomMutation<Appointment>();
  const busy = mutation.isPending;

  const { status, appointmentDate } = appointment;
  const early = status === "booked" && appointmentDate > today;
  const over =
    status === "no_show" || status === "cancelled" || (status === "booked" && appointmentDate < today);
  const bookedToday = status === "booked" && appointmentDate === today;
  const alreadyIn =
    status === "checked_in" ||
    status === "ready_for_examination" ||
    status === "in_exam" ||
    status === "awaiting_results";

  const done = (message: string, data: Appointment | undefined) => {
    invalidate({ resource: "appointments", invalidates: ["list", "detail"], id: appointment.id });
    open?.({ type: "success", message });
    if (data) onDone(data);
  };

  // Early: the same visit moved to today, if today still has a place (BR-01); the API says when it has not.
  const moveToToday = () =>
    mutate(
      {
        url: `${API_URL}/appointments/${appointment.id}/reschedule`,
        method: "post",
        values: { appointmentDate: today },
        config: JSON_HEADERS,
        successNotification: false,
      },
      { onSuccess: ({ data }) => done("Đã đổi lượt khám sang hôm nay", data) }
    );

  // Late, missed or cancelled: a walk-in today; a fee paid online moves to it. Then the fee, on its page.
  const convert = () =>
    mutate(
      {
        url: `${API_URL}/appointments/${appointment.id}/walk-in`,
        method: "post",
        values: {},
        config: JSON_HEADERS,
        successNotification: false,
      },
      {
        onSuccess: ({ data }) => {
          invalidate({ resource: "appointments", invalidates: ["list"] });
          open?.({ type: "success", message: "Đã chuyển sang khám trực tiếp hôm nay" });
          if (data?.id) navigate(`/appointments/show/${data.id}`);
        },
      }
    );

  if (alreadyIn) {
    return (
      <p className="bg-muted/50 rounded-md p-3 text-sm">
        Lượt này đã được tiếp nhận
        {appointment.checkedInAt ? ` lúc ${formatDateTime(appointment.checkedInAt)}` : ""} · hiện:{" "}
        <strong>{APPOINTMENT_STATUS_LABELS[status]}</strong>. Không cần tiếp nhận lại.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {early && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border p-3 text-sm">
          <span>Bệnh nhân đến sớm hơn ngày hẹn ({formatLocalDate(appointmentDate)}).</span>
          <Button size="sm" variant="outline" onClick={moveToToday} disabled={busy}>
            <CalendarCheckIcon />
            Đổi sang hôm nay
          </Button>
          <span className="text-muted-foreground">Hôm nay hết lượt thì giữ lịch cũ và hẹn bệnh nhân quay lại.</span>
        </div>
      )}
      {over && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border p-3 text-sm">
          <span>
            {status === "cancelled"
              ? "Lượt này đã bị huỷ."
              : status === "no_show"
                ? "Lượt này đã ghi nhận không đến."
                : `Lượt này đã qua ngày hẹn (${formatLocalDate(appointmentDate)}).`}{" "}
            {appointment.paidAt && status !== "cancelled"
              ? "Phí khám đã trả sẽ được chuyển sang lượt mới."
              : appointment.paidAt
                ? "Phí khám của lượt đã huỷ chờ hoàn tiền, lượt mới thu phí như bình thường."
                : ""}
          </span>
          <Button size="sm" onClick={convert} disabled={busy}>
            <RefreshCwIcon />
            Chuyển sang khám trực tiếp
          </Button>
        </div>
      )}
      {bookedToday && <ChangeExaminee appointment={appointment} onDone={done} />}
    </div>
  );
}

/** Wrong person, same account: the visit given to the profile actually at the desk. */
function ChangeExaminee({
  appointment,
  onDone,
}: {
  appointment: Appointment;
  onDone: (message: string, data: Appointment | undefined) => void;
}) {
  const [choosing, setChoosing] = useState(false);
  const [picked, setPicked] = useState("");
  const { mutate, mutation } = useCustomMutation<Appointment>();
  const { result } = useList<Customer>({
    resource: "customers",
    filters: [{ field: "sameAccountAs", operator: "eq", value: appointment.customer.id }],
    pagination: { mode: "off" },
    queryOptions: { enabled: choosing },
  });
  const others = (result?.data ?? []).filter((profile) => profile.id !== appointment.customer.id);

  if (!choosing) {
    return (
      <Button size="sm" variant="ghost" className="w-fit" onClick={() => setChoosing(true)}>
        <UserCogIcon />
        Sai người khám?
      </Button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border p-3 text-sm">
      {others.length === 0 ? (
        <span>
          Tài khoản này không có hồ sơ nào khác. Người tới khám không thuộc tài khoản này thì tiếp nhận như khám
          trực tiếp.
        </span>
      ) : (
        <>
          <span>Người tới khám là:</span>
          <Select value={picked} onValueChange={setPicked}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Chọn hồ sơ trong tài khoản" />
            </SelectTrigger>
            <SelectContent>
              {others.map((profile) => (
                <SelectItem key={profile.id} value={String(profile.id)}>
                  {profile.fullName}
                  {profile.dateOfBirth ? ` · ${formatLocalDate(profile.dateOfBirth)}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            disabled={!picked || mutation.isPending}
            onClick={() =>
              mutate(
                {
                  url: `${API_URL}/appointments/${appointment.id}/examinee`,
                  method: "post",
                  values: { customerId: Number(picked) },
                  config: JSON_HEADERS,
                  successNotification: false,
                },
                { onSuccess: ({ data }) => onDone("Đã đổi người khám", data) }
              )
            }
          >
            Đổi người khám
          </Button>
        </>
      )}
    </div>
  );
}
