import { useRef, useState } from "react";
import { useCan, useCustom, useList } from "@refinedev/core";
import { Scanner, type IDetectedBarcode } from "@yudiel/react-qr-scanner";
import { BanknoteIcon, CameraIcon, CameraOffIcon, CheckCircle2Icon, SearchIcon } from "lucide-react";
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
import { formatLocalDate, formatLocalTime, formatMoney } from "@/shared/lib/format";
import type { Invoice } from "@/domains/billing/types";
import { CounterPaymentDialog } from "../invoices/counter-payment";
import type { Appointment } from "@/domains/appointment/types";
import { APPOINTMENT_STATUS_LABELS, formatBookingCode } from "@/domains/appointment/types";
import { CUSTOMER_STATUS_LABELS } from "@/domains/customer/types";
import {
  APPOINTMENT_STATUS_VARIANTS,
  CUSTOMER_STATUS_VARIANTS,
} from "@/shared/lib/status-variants";
import { AppointmentActions } from "./appointment-actions";
import { clinicToday } from "./clinic-day";
import { DeskResolution } from "./desk-resolution";

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
  /** A visit picked from a search by phone, citizen id or name, when what was typed is not a code. */
  const [picked, setPicked] = useState<Appointment | null>(null);
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
    setPicked(null);
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
    setPicked(null);
    setCode("");
    setSubmitted("");
    inputRef.current?.focus();
  };

  return (
    <ListView>
      <ListViewHeader
        title="Tiếp nhận nhanh"
        canCreate={false}
        description="Quét hoặc nhập mã trên phiếu khám; không có phiếu thì nhập số điện thoại, CCCD hoặc họ tên. Máy quét cầm tay dùng được ngay tại ô nhập."
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
            <Label htmlFor="booking-code">Mã phiếu, số điện thoại hoặc CCCD</Label>
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
                {lastDone.status === "cancelled" ? "Đã huỷ lượt đăng ký khám của " : "Đã tiếp nhận "}
                <strong>{lastDone.customer.fullName}</strong> ({formatBookingCode(lastDone.bookingCode)})
                {lastDone.status !== "cancelled" && lastDone.customer.status === "patient"
                  ? " — hồ sơ bệnh nhân đang hoạt động."
                  : "."}
              </span>
              {/* Not paid yet (paying here): take the fee now, so they join the queue. */}
              {lastDone.status === "checked_in" && !lastDone.paidAt && (
                <CollectExamFee key={lastDone.id} appointmentId={lastDone.id} />
              )}
            </Card>
          )}

          {query.isFetching && submitted && (
            <p className="text-muted-foreground text-sm">Đang tra cứu…</p>
          )}

          {failure && !notFound && !query.isFetching && (
            <Card className="p-5">
              <p className="text-sm">Không tra cứu được lúc này. Vui lòng thử lại.</p>
            </Card>
          )}

          {/* Not a code: the same words as a phone number, a citizen id or a name. */}
          {notFound && !query.isFetching && !picked && <SearchMatches term={submitted} onPick={setPicked} />}

          {(picked ?? (failure ? undefined : appointment)) && !query.isFetching && (
            <AppointmentCard
              appointment={(picked ?? appointment)!}
              onDone={reset}
              onChanged={(changed) => {
                // A fix that keeps the visit (moved to today, right profile): show it as it is now.
                if (picked) setPicked(changed);
                else void query.refetch();
              }}
            />
          )}

          {!submitted && !lastDone && (
            <p className="text-muted-foreground rounded-md border border-dashed p-6 text-center text-sm">
              Nhập hoặc quét mã để xem thông tin lượt đăng ký khám.
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
  onChanged,
}: {
  appointment: Appointment;
  /** Checked in, cancelled, …: the screen clears for the next person. */
  onDone: (done: Appointment) => void;
  /** Fixed but not yet checked in (moved to today, given to the right profile): shown again as it is now. */
  onChanged: (changed: Appointment) => void;
}) {
  const today = clinicToday();
  const isToday = appointment.appointmentDate === today;
  const willActivate = appointment.status === "booked" && appointment.customer.status === "neutral";

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
          {/* Chose to pay here: collect the examination fee once they are checked in (UC-01 step 4). */}
          {!appointment.paidAt && appointment.deskPaymentChosenAt && <Badge variant="outline">Thu phí tại quầy</Badge>}
        </div>
      </div>

      <DetailList>
        <DetailRow label="Mã phiếu">
          <span className="font-mono">{formatBookingCode(appointment.bookingCode)}</span>
        </DetailRow>
        <DetailRow label="Thời gian">
          <span className="tabular-nums">
            {formatLocalDate(appointment.appointmentDate)}
            {appointment.startTime ? ` · ${formatLocalTime(appointment.startTime)}` : ""}
            {appointment.startTime && appointment.endTime ? ` – ${formatLocalTime(appointment.endTime)}` : ""}
          </span>
        </DetailRow>
        <DetailRow label="Phòng khám">{appointment.clinic.name}</DetailRow>
        <DetailRow label="Lý do">{appointment.reason ?? "—"}</DetailRow>
      </DetailList>

      {willActivate && isToday && (
        <p className="text-sm">
          Khách hàng chưa là bệnh nhân — tiếp nhận sẽ <strong>kích hoạt hồ sơ bệnh nhân</strong>.
        </p>
      )}

      {/* UC-02 B1: early, late, missed, cancelled, already in, or the wrong person. */}
      <DeskResolution appointment={appointment} onDone={onChanged} />

      <AppointmentActions appointment={appointment} resource="appointments" onDone={onDone} />
    </Card>
  );
}

/**
 * Not a slip's code (UC-02 step 2): the visits whose patient has that phone
 * number, citizen id or name, today's first, for the desk to pick from.
 */
function SearchMatches({ term, onPick }: { term: string; onPick: (appointment: Appointment) => void }) {
  const { result, query } = useList<Appointment>({
    resource: "appointments",
    filters: [{ field: "q", operator: "eq", value: term }],
    pagination: { pageSize: 10 },
    errorNotification: false,
  });
  const today = clinicToday();
  const rows = [...(result?.data ?? [])].sort(
    (a, b) => Number(b.appointmentDate === today) - Number(a.appointmentDate === today)
  );

  if (query.isLoading) {
    return <p className="text-muted-foreground text-sm">Đang tìm theo số điện thoại, CCCD, họ tên…</p>;
  }
  if (rows.length === 0) {
    return (
      <Card className="p-5">
        <p className="text-sm">
          Không tìm thấy lượt đăng ký khám nào với <span className="font-mono">{term}</span> (mã phiếu, số điện
          thoại, CCCD hoặc họ tên). Có thể tiếp nhận như{" "}
          <Link to="/appointments/walk-in" className="text-link underline">
            khám trực tiếp
          </Link>
          .
        </p>
      </Card>
    );
  }
  return (
    <Card className="flex flex-col divide-y p-0">
      {rows.map((row) => (
        <button
          key={row.id}
          type="button"
          className="hover:bg-muted/50 flex flex-wrap items-center justify-between gap-2 p-4 text-left text-sm"
          onClick={() => onPick(row)}
        >
          <span>
            <strong>{row.customer.fullName}</strong> · {row.customer.phone} ·{" "}
            <span className="font-mono">{formatBookingCode(row.bookingCode)}</span>
          </span>
          <span className="flex items-center gap-2">
            <span className="tabular-nums">{formatLocalDate(row.appointmentDate)}</span>
            <Badge variant={APPOINTMENT_STATUS_VARIANTS[row.status] ?? "secondary"}>
              {APPOINTMENT_STATUS_LABELS[row.status]}
            </Badge>
          </span>
        </button>
      ))}
    </Card>
  );
}

/**
 * Right after checking in somebody who has not paid: the examination fee to
 * take at the counter, through the same dialog as the appointment page. Paid,
 * they join the queue (BF-02) and the button says so.
 */
function CollectExamFee({ appointmentId }: { appointmentId: number }) {
  const { data: canCollect } = useCan({ resource: "invoices", action: "edit" });
  const [paying, setPaying] = useState(false);
  // The visit's examination bill (issued here if it has none yet).
  const { result, query } = useCustom<Invoice>({
    url: `${API_URL}/invoices/exam`,
    method: "get",
    config: { query: { appointmentId } },
    errorNotification: false,
    queryOptions: { enabled: canCollect?.can ?? false },
  });
  const invoice = customResult(result?.data, "id");
  if (!canCollect?.can || !invoice) return null;
  if (invoice.status === "paid") {
    return <Badge variant="success" className="ms-auto">Đã thu phí khám · vào hàng chờ</Badge>;
  }
  return (
    <>
      <Button size="sm" className="ms-auto" onClick={() => setPaying(true)}>
        <BanknoteIcon />
        Thu phí khám {formatMoney(invoice.totalAmount)}
      </Button>
      <CounterPaymentDialog
        invoice={invoice}
        open={paying}
        onClose={() => {
          setPaying(false);
          void query.refetch();
        }}
      />
    </>
  );
}
