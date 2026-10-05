import { useRef, useState } from "react";
import { useCustom } from "@refinedev/core";
import { Scanner, type IDetectedBarcode } from "@yudiel/react-qr-scanner";
import { CameraIcon, CameraOffIcon, CheckCircle2Icon, SearchIcon } from "lucide-react";
import { Link } from "react-router";

import { API_URL } from "@/shared/api/constants";
import { customResult } from "@/shared/hooks/use-custom-result";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { ListView, ListViewHeader } from "@/shared/components/views/list-view";
import { DetailList, DetailRow } from "@/shared/components/views/record-detail";
import { formatLocalDate, formatLocalTime } from "@/shared/lib/format";
import type { Appointment } from "@/domains/appointment/types";
import { APPOINTMENT_STATUS_LABELS, formatBookingCode } from "@/domains/appointment/types";
import { CUSTOMER_STATUS_LABELS } from "@/domains/customer/types";
import {
  APPOINTMENT_STATUS_VARIANTS,
  CUSTOMER_STATUS_VARIANTS,
} from "@/shared/lib/status-variants";
import { AppointmentActions } from "./appointment-actions";
import { clinicToday } from "./clinic-day";

/**
 * The front desk's check-in: scan or type the code from the slip, see who it
 * is, press Check-in.
 *
 * The code field keeps focus, so a handheld scanner — which types the code
 * and presses Enter — works without anybody touching the mouse. The camera
 * reads the QR off a phone screen for desks without one. After a check-in the
 * screen clears itself for the next person in the queue.
 */
export const QuickCheckIn = () => {
  const [code, setCode] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [camera, setCamera] = useState(false);
  const [lastDone, setLastDone] = useState<Appointment | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { result, query } = useCustom<Appointment>({
    url: `${API_URL}/appointments/lookup`,
    method: "get",
    config: { query: { code: submitted } },
    queryOptions: { enabled: Boolean(submitted), retry: false },
    // A code that matches nothing is answered on the card below, not with a toast.
    errorNotification: false,
  });
  const appointment = submitted ? customResult(result?.data, "bookingCode") : undefined;
  // Only a 404 means "no such code"; anything else is a failure to look, and
  // saying "not found" then would send somebody to re-read a slip that is fine.
  const failure = submitted && query.isError ? (query.error as { statusCode?: number } | null) : null;
  const notFound = failure?.statusCode === 404;
  const [cameraError, setCameraError] = useState<string | null>(null);

  const lookUp = (raw: string) => {
    const value = raw.trim();
    if (!value) return;
    setLastDone(null);
    setCode(value);
    if (value === submitted) {
      // Same code again — after an error, or a rescan of a card already on
      // screen: the query key has not changed, so ask again explicitly
      // rather than showing what was fetched before.
      void query.refetch();
    } else {
      setSubmitted(value);
    }
  };

  const onScan = (codes: IDetectedBarcode[]) => {
    const value = codes[0]?.rawValue;
    if (value) {
      setCamera(false);
      lookUp(value);
    }
  };

  const reset = (done: Appointment) => {
    setLastDone(done);
    setCode("");
    setSubmitted("");
    inputRef.current?.focus();
  };

  return (
    <ListView>
      <ListViewHeader
        title="Check-in nhanh"
        canCreate={false}
        description="Quét hoặc nhập mã trên phiếu khám của khách. Máy quét cầm tay dùng được ngay tại ô nhập mã."
      />

      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:items-start">
        <Card className="flex flex-col gap-4 p-5">
          <form
            className="flex flex-col gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              lookUp(code);
            }}
          >
            <Label htmlFor="booking-code">Mã lịch hẹn</Label>
            <div className="flex gap-2">
              <Input
                id="booking-code"
                ref={inputRef}
                autoFocus
                autoComplete="off"
                placeholder="VD: K7M2-9QXA"
                className="font-mono uppercase tracking-wider"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
              <Button type="submit" disabled={!code.trim() || query.isFetching}>
                <SearchIcon />
                Tra cứu
              </Button>
            </div>
          </form>

          <Button
            variant="outline"
            onClick={() => {
              setCameraError(null);
              setCamera((on) => !on);
            }}
          >
            {camera ? <CameraOffIcon /> : <CameraIcon />}
            {camera ? "Tắt camera" : "Quét bằng camera"}
          </Button>

          {camera && (
            <div className="overflow-hidden rounded-lg border">
              <Scanner
                onScan={onScan}
                onError={() => {
                  setCamera(false);
                  setCameraError(
                    "Không mở được camera. Hãy cho phép trình duyệt dùng camera, hoặc nhập mã ở ô phía trên."
                  );
                }}
                formats={["qr_code"]}
                sound={false}
              />
            </div>
          )}
          {cameraError && <p className="text-destructive text-sm">{cameraError}</p>}
        </Card>

        <div className="min-w-0">
          {lastDone && (
            <Card className="border-success/40 mb-4 flex flex-row items-center gap-3 p-4">
              <CheckCircle2Icon className="text-success size-5 shrink-0" />
              <span className="text-sm">
                {lastDone.status === "cancelled" ? "Đã huỷ lịch hẹn của " : "Đã check-in "}
                <strong>{lastDone.customer.fullName}</strong> ({formatBookingCode(lastDone.bookingCode)})
                {lastDone.status === "checked_in" && lastDone.customer.status === "patient"
                  ? " — hồ sơ bệnh nhân đang hoạt động."
                  : "."}
              </span>
            </Card>
          )}

          {query.isFetching && submitted && (
            <p className="text-muted-foreground text-sm">Đang tra cứu…</p>
          )}

          {failure && !query.isFetching && (
            <Card className="p-5">
              <p className="text-sm">
                {notFound ? (
                  <>
                    Không tìm thấy lịch hẹn với mã <span className="font-mono">{submitted}</span>. Kiểm
                    tra lại mã trên phiếu khám.
                  </>
                ) : (
                  "Không tra cứu được lúc này. Vui lòng thử lại."
                )}
              </p>
            </Card>
          )}

          {appointment && !failure && !query.isFetching && (
            <AppointmentCard appointment={appointment} onDone={reset} />
          )}

          {!submitted && !lastDone && (
            <p className="text-muted-foreground rounded-md border border-dashed p-6 text-center text-sm">
              Nhập hoặc quét mã để xem thông tin lịch hẹn.
            </p>
          )}
        </div>
      </div>
    </ListView>
  );
};

function AppointmentCard({
  appointment,
  onDone,
}: {
  appointment: Appointment;
  onDone: (done: Appointment) => void;
}) {
  const today = clinicToday();
  const isToday = appointment.appointmentDate === today;
  const willActivate = appointment.status === "scheduled" && appointment.customer.status === "neutral";

  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-col">
          <Link
            to={`/customers/show/${appointment.customer.id}`}
            className="text-lg font-semibold hover:underline"
          >
            {appointment.customer.fullName}
          </Link>
          <span className="text-muted-foreground font-mono text-xs">
            {appointment.customer.phone} · {appointment.customer.customerCode}
          </span>
        </div>
        <div className="flex gap-2">
          <Badge variant={CUSTOMER_STATUS_VARIANTS[appointment.customer.status] ?? "secondary"}>
            {CUSTOMER_STATUS_LABELS[appointment.customer.status]}
          </Badge>
          <Badge variant={APPOINTMENT_STATUS_VARIANTS[appointment.status] ?? "secondary"}>
            {APPOINTMENT_STATUS_LABELS[appointment.status]}
          </Badge>
        </div>
      </div>

      <DetailList>
        <DetailRow label="Mã lịch hẹn">
          <span className="font-mono">{formatBookingCode(appointment.bookingCode)}</span>
        </DetailRow>
        <DetailRow label="Thời gian">
          <span className="tabular-nums">
            {formatLocalDate(appointment.appointmentDate)} · {formatLocalTime(appointment.startTime)}
            {appointment.endTime ? ` – ${formatLocalTime(appointment.endTime)}` : ""}
          </span>
        </DetailRow>
        <DetailRow label="Phòng khám">{appointment.clinic.name}</DetailRow>
        <DetailRow label="Lý do">{appointment.reason ?? "—"}</DetailRow>
      </DetailList>

      {appointment.status === "scheduled" && !isToday && (
        <p className="text-warning text-sm">
          Lịch hẹn này vào ngày {formatLocalDate(appointment.appointmentDate)}, chỉ check-in được
          vào đúng ngày hẹn.
        </p>
      )}
      {willActivate && isToday && (
        <p className="text-sm">
          Khách hàng chưa là bệnh nhân — check-in sẽ <strong>kích hoạt hồ sơ bệnh nhân</strong>.
        </p>
      )}

      <AppointmentActions appointment={appointment} resource="appointments" onDone={onDone} />
    </Card>
  );
}
