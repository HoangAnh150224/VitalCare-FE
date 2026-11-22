import type { ReactNode } from "react";
import { QRCodeSVG } from "qrcode.react";

import {
  formatDateTime,
  formatLocalDate,
  formatLocalTime,
} from "@/shared/lib/format";
import type { Appointment } from "@/domains/appointment/types";
import {
  formatBookingCode,
  formatQueueNumber,
} from "@/domains/appointment/types";

const Row = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="flex justify-between gap-4 py-1">
    <dt className="shrink-0">{label}</dt>
    <dd className="min-w-0 text-right font-medium">{children || "—"}</dd>
  </div>
);

/**
 * The visit ticket as it goes to the printer: number, code, QR, who and with
 * whom. Not shown on screen — `.visit-ticket` in `styles/index.css` shows it
 * in print and takes the rest of the detail screen off the page. Colours are
 * fixed black on white so the theme cannot blank the values on paper.
 */
export function VisitTicket({ appointment }: { appointment: Appointment }) {
  const { customer, doctor, examRoom } = appointment;
  return (
    <div className="visit-ticket">
      <div className="mx-auto flex max-w-[90mm] flex-col items-center gap-3 text-center">
        <div>
          <div className="font-semibold">{appointment.clinic.name}</div>
          <div className="text-xl font-bold tracking-wide">PHIẾU KHÁM</div>
        </div>
        <div className="flex flex-col items-center gap-1">
          <span className="text-sm">Số khám</span>
          <span className="text-6xl leading-none font-semibold tabular-nums">
            {formatQueueNumber(appointment.queueNumber)}
          </span>
          <span className="font-mono text-lg tracking-widest">
            {formatBookingCode(appointment.bookingCode)}
          </span>
        </div>
        {appointment.bookingCode && (
          <QRCodeSVG value={appointment.bookingCode} size={176} level="M" />
        )}
        <dl className="w-full border-t border-black pt-2 text-left text-sm">
          <Row label="Họ và tên">{customer.fullName}</Row>
          <Row label="Số điện thoại">{customer.phone}</Row>
          <Row label="Mã khách hàng">{customer.customerCode}</Row>
          <Row label="Ngày khám">
            {formatLocalDate(appointment.appointmentDate)}
            {appointment.startTime
              ? ` · ${formatLocalTime(appointment.startTime)}`
              : ""}
          </Row>
          <Row label="Bác sĩ">{doctor?.fullName ?? "Xếp khi gọi vào phòng"}</Row>
          <Row label="Phòng">{examRoom && (examRoom.name ?? examRoom.code)}</Row>
          <Row label="Khám khoa">{appointment.department}</Row>
          <Row label="Lý do">{appointment.reason}</Row>
          {appointment.paidAt && (
            <Row label="Phí khám">
              Đã trả · {formatDateTime(appointment.paidAt)}
            </Row>
          )}
        </dl>
      </div>
    </div>
  );
}
