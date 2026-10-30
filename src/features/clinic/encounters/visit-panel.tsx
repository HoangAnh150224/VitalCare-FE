import { useCan, useCustom, useCustomMutation, useNotification } from "@refinedev/core";
import { CheckCircle2Icon, CircleDashedIcon, FlaskConicalIcon, UserRoundPlusIcon } from "lucide-react";
import { useState } from "react";

import { API_URL } from "@/shared/api/constants";
import { customResult } from "@/shared/hooks/use-custom-result";
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
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Label } from "@/shared/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Textarea } from "@/shared/ui/textarea";
import { DetailPanel } from "@/shared/components/views/record-detail";
import type { AppointmentStatus, VisitTask } from "@/domains/appointment/types";
import { APPOINTMENT_STATUS_LABELS } from "@/domains/appointment/types";
import type { Encounter } from "@/domains/encounter/types";
import { APPOINTMENT_STATUS_VARIANTS } from "@/shared/lib/status-variants";
import { clinicToday } from "../appointments/clinic-day";
import { DoctorDayHint, doctorLabel, useClinicDoctors } from "../appointments/doctor-day";

type VisitState = { appointmentId: number | null; status: AppointmentStatus | null; returned: boolean; tasks: VisitTask[] };

const TASK_STATUS: Record<string, string> = {
  ordered: "chưa làm",
  in_progress: "đang làm",
  result_ready: "có kết quả",
  reviewed: "đã xem",
  scheduled: "chưa tới",
  checked_in: "đang chờ",
  in_exam: "đang khám",
  awaiting_results: "đang làm chỉ định",
  completed: "đã khám xong",
  no_show: "không đến",
  cancelled: "đã huỷ",
};

/**
 * The visit behind an encounter, as the doctor works it: in the room, out
 * for services or another doctor, or back in line; what it went out for; and
 * the two ways out of the room that bring the patient back to this doctor.
 * Each asks before it acts: the room calls its next patient straight after.
 */
export function VisitPanel({ encounter }: { encounter: Encounter }) {
  const { open } = useNotification();
  const { data: canWrite } = useCan({ resource: "clinical_encounters", action: "edit" });
  const { result, query } = useCustom<VisitState>({
    url: `${API_URL}/clinical_encounters/${encounter.id}/visit`,
    method: "get",
    errorNotification: false,
    queryOptions: { enabled: Boolean(encounter.appointmentId), refetchInterval: 10_000 },
  });
  const state = customResult(result?.data, "tasks");
  const { mutate, mutation } = useCustomMutation<VisitState>();
  const [asking, setAsking] = useState<"send-out" | "refer" | null>(null);
  const [doctorId, setDoctorId] = useState("");
  const [reason, setReason] = useState("");
  const today = clinicToday();
  const { doctors } = useClinicDoctors(asking === "refer" ? encounter.clinicId ?? undefined : undefined, today);
  const others = doctors.filter((doctor) => doctor.id !== encounter.clinician?.id);
  const chosen = others.find((doctor) => String(doctor.id) === doctorId);

  if (!encounter.appointmentId || !state || !state.status) return null;

  const openServices = state.tasks.filter((task) => task.kind === "service" && !task.done);
  const inRoom = state.status === "in_exam";
  const acts = inRoom && encounter.status === "in_progress" && (canWrite?.can ?? false) && encounter._can?.write !== false;

  const run = (path: "send-out" | "refer", values: object, message: string) =>
    mutate(
      {
        url: `${API_URL}/clinical_encounters/${encounter.id}/${path}`,
        method: "post",
        values,
        config: { headers: { "Content-Type": "application/json" } },
        successNotification: false,
      },
      {
        onSuccess: () => {
          open?.({ type: "success", message });
          setAsking(null);
          void query.refetch();
        },
      }
    );

  return (
    <DetailPanel title="Lượt khám">
      <div className="flex flex-col gap-4 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={APPOINTMENT_STATUS_VARIANTS[state.status] ?? "secondary"}>
            {APPOINTMENT_STATUS_LABELS[state.status] ?? state.status}
          </Badge>
          {state.returned && <Badge variant="info">Quay lại đọc kết quả</Badge>}
          <span className="text-muted-foreground text-sm">
            {state.status === "awaiting_results"
              ? "Bệnh nhân đang đi làm chỉ định. Xong sẽ tự quay lại hàng chờ của bác sĩ, được gọi trước."
              : state.returned
                ? "Đã làm xong, đang chờ được gọi lại vào phòng."
                : null}
          </span>
        </div>

        {state.tasks.length > 0 && (
          <ul className="flex flex-col gap-1.5">
            {state.tasks.map((task, index) => (
              <li key={`${task.kind}-${index}`} className="flex items-center gap-2 text-sm">
                {task.done ? (
                  <CheckCircle2Icon className="text-success-text size-4 shrink-0" />
                ) : (
                  <CircleDashedIcon className="text-muted-foreground size-4 shrink-0" />
                )}
                <span className="font-medium">{task.kind === "referral" ? `Khám thêm: ${task.name}` : task.name}</span>
                <span className="text-muted-foreground">· {TASK_STATUS[task.status] ?? task.status}</span>
              </li>
            ))}
          </ul>
        )}

        {acts && (
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" disabled={openServices.length === 0 || mutation.isPending} onClick={() => setAsking("send-out")}>
              <FlaskConicalIcon />
              Cho đi làm chỉ định
            </Button>
            <Button
              variant="outline"
              disabled={mutation.isPending}
              onClick={() => {
                setDoctorId("");
                setReason("");
                setAsking("refer");
              }}
            >
              <UserRoundPlusIcon />
              Chuyển khám bác sĩ khác
            </Button>
            {openServices.length === 0 && (
              <span className="text-muted-foreground text-xs">Chỉ định dịch vụ trước để cho bệnh nhân đi làm.</span>
            )}
          </div>
        )}
      </div>

      <AlertDialog open={asking === "send-out"} onOpenChange={(next) => !next && setAsking(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cho {encounter.patient.fullName} đi làm chỉ định?</AlertDialogTitle>
            <AlertDialogDescription>
              Phòng sẽ gọi người tiếp theo. Bệnh nhân tự quay lại hàng chờ của bạn, được gọi trước, khi đủ kết quả.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <ul className="bg-muted/50 flex flex-col gap-1 rounded-lg p-3 text-sm">
            {openServices.map((task, index) => (
              <li key={index} className="font-medium">
                {task.name}
              </li>
            ))}
          </ul>
          <AlertDialogFooter>
            <AlertDialogCancel>Không</AlertDialogCancel>
            <AlertDialogAction onClick={() => run("send-out", {}, "Bệnh nhân đã đi làm chỉ định")}>
              Cho đi làm chỉ định
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={asking === "refer"} onOpenChange={(next) => !next && setAsking(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Chuyển {encounter.patient.fullName} khám bác sĩ khác?</AlertDialogTitle>
            <AlertDialogDescription>
              Bệnh nhân được xếp đầu hàng chờ của bác sĩ đó hôm nay. Khám xong sẽ tự quay lại hàng chờ của bạn.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="refer-doctor">Bác sĩ</Label>
              <Select value={doctorId} onValueChange={setDoctorId}>
                <SelectTrigger id="refer-doctor" className="w-full" aria-label="Bác sĩ">
                  <SelectValue placeholder="Chọn bác sĩ" />
                </SelectTrigger>
                <SelectContent>
                  {others.map((doctor) => (
                    <SelectItem key={doctor.id} value={String(doctor.id)}>
                      {doctorLabel(doctor)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <DoctorDayHint doctor={chosen} date={today} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="refer-reason">Lý do chuyển khám</Label>
              <Textarea
                id="refer-reason"
                rows={2}
                maxLength={255}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Ví dụ: Khám tai mũi họng, nghi viêm xoang"
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Không</AlertDialogCancel>
            <AlertDialogAction
              disabled={!chosen?.day?.bookable || reason.trim() === "" || mutation.isPending}
              onClick={(event) => {
                event.preventDefault();
                run("refer", { employeeId: Number(doctorId), reason: reason.trim() }, `Đã chuyển khám ${chosen?.fullName ?? ""}`);
              }}
            >
              Chuyển khám
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DetailPanel>
  );
}
