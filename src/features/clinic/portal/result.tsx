import { useCustom, useOne, type HttpError } from "@refinedev/core";
import { ChevronLeftIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Link, useParams } from "react-router";

import { API_URL } from "@/shared/api/constants";
import { Skeleton } from "@/shared/ui/skeleton";
import { customResult } from "@/shared/hooks/use-custom-result";
import type { Appointment } from "@/domains/appointment/types";
import type { MyVisitResult, VisitVitals } from "@/domains/encounter/types";
import { bodyMassIndex, VITAL_FIELDS } from "@/domains/encounter/types";
import { MyInvoiceCard } from "../invoices/my-invoice-card";
import { OrderFiles, OrderStatusBadge } from "../service-orders/order-parts";
import { formatVisitDay } from "./visit";

/**
 * One concluded visit, as the patient reads it: what the doctor concluded and
 * told them to do first, then the measurements, the examination, the
 * services with their results and files, and the bill.
 */
export const PortalResult = () => {
  const { appointmentId } = useParams();
  const id = Number(appointmentId);
  const validId = Number.isInteger(id) && id > 0;

  // Not the caller's (or no such visit): said once, on the page, rather than as a toast as well.
  const { result: visit, query: visitQuery } = useOne<Appointment>({
    resource: "my_appointments",
    id,
    errorNotification: false,
    queryOptions: { enabled: validId, retry: false },
  });
  const { result, query } = useCustom<MyVisitResult, HttpError>({
    url: `${API_URL}/my_appointments/${id}/result`,
    method: "get",
    // 404 until the doctor concludes the visit: "no result yet", not an error to announce.
    errorNotification: false,
    queryOptions: { enabled: validId, retry: false },
  });
  const data = query.isError ? undefined : customResult(result?.data, "encounter");
  const encounter = data?.encounter;
  // Only a 404 means "no result yet"; anything else is a failure to look, and
  // saying "the doctor has not finished" then would be telling the patient something untrue.
  const status = (query.error as { statusCode?: number } | null)?.statusCode;
  const failed = query.isError && status !== 404;
  const missing = !validId || visitQuery.isError;
  const vitals = encounter?.vitals ?? null;
  const tiles = vitalTiles(vitals);

  return (
    <div className="screen-enter screen-enter-stagger mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link
          to="/my-results"
          className="text-muted-foreground hover:text-foreground -ms-1 inline-flex w-fit items-center gap-1 text-sm"
        >
          <ChevronLeftIcon className="size-4" />
          Kết quả khám
        </Link>
        <h1>{visit ? formatVisitDay(visit.appointmentDate) : "Kết quả khám"}</h1>
        {visit && (
          <p className="text-muted-foreground text-sm">
            {visit.customer.fullName} · {encounter?.clinician?.fullName ?? visit.doctor?.fullName ?? "—"} ·{" "}
            {visit.clinic.name}
          </p>
        )}
      </div>

      {missing ? (
        <Notice title="Không tìm thấy lượt khám này." text="Lượt khám không có trong tài khoản của bạn." />
      ) : query.isLoading ? (
        <Skeleton className="h-48 rounded-2xl" />
      ) : failed ? (
        <Notice
          title="Không tải được kết quả."
          text="Kiểm tra kết nối rồi thử lại."
          action={
            <button type="button" className="text-primary text-sm font-medium hover:underline" onClick={() => query.refetch()}>
              Thử lại
            </button>
          }
        />
      ) : !encounter || !data ? (
        <Notice title="Chưa có kết quả cho lượt khám này." text="Kết quả hiện ở đây khi bác sĩ hoàn tất lượt khám." />
      ) : (
        <>
          {/* What a patient opens this page for: the conclusion and what to do next. */}
          <section className="bg-primary/5 border-primary/20 flex flex-col gap-4 rounded-2xl border p-5 sm:p-6">
            <div>
              <h2 className="text-primary text-sm font-medium">Chẩn đoán</h2>
              <p className="font-display mt-1 text-xl leading-snug font-semibold whitespace-pre-line">
                {encounter.diagnosis ?? "—"}
              </p>
            </div>
            {encounter.followUp && (
              <div className="border-primary/15 border-t pt-4">
                <h2 className="text-primary text-sm font-medium">Lời dặn của bác sĩ</h2>
                <p className="mt-1 whitespace-pre-line">{encounter.followUp}</p>
              </div>
            )}
          </section>

          {tiles.length > 0 && (
            <Section title="Chỉ số khi khám">
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {tiles.map((tile) => (
                  <Tile key={tile.label} {...tile} />
                ))}
              </ul>
            </Section>
          )}

          <Section title="Thông tin khám">
            <dl className="bg-card divide-y divide-border rounded-2xl border border-border">
              <Row label="Lý do khám">{encounter.chiefComplaint}</Row>
              <Row label="Khám thấy">{encounter.examinationFindings}</Row>
              <Row label="Ghi chú của bác sĩ">{encounter.clinicalNote}</Row>
            </dl>
          </Section>

          {data.orders.length > 0 && (
            <Section title="Dịch vụ & kết quả">
              <ul className="flex flex-col gap-3">
                {data.orders.map((order) => (
                  <li key={order.id} className="bg-card flex flex-col gap-3 rounded-2xl border border-border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <span className="font-medium">{order.service.name}</span>
                      <OrderStatusBadge status={order.status} />
                    </div>
                    {order.resultText && <p className="text-sm whitespace-pre-line">{order.resultText}</p>}
                    <OrderFiles
                      order={order}
                      downloadPath={(fileId) => `my_appointments/${id}/result/files/${fileId}`}
                    />
                  </li>
                ))}
              </ul>
            </Section>
          )}

          <MyInvoiceCard appointmentId={id} />
        </>
      )}
    </div>
  );
};

const number = (value: number) => value.toLocaleString("vi-VN", { maximumFractionDigits: 1 });

/**
 * The visit's measurements as a patient reads them: blood pressure as one
 * "118/76", decimals with a comma, BMI worked out — and only what was taken.
 */
function vitalTiles(vitals: VisitVitals | null): { label: string; value: string; unit: string }[] {
  if (!vitals) return [];
  const field = (name: keyof VisitVitals) => VITAL_FIELDS.find((candidate) => candidate.name === name)!;
  const tile = (name: keyof VisitVitals, label = field(name).label) =>
    vitals[name] == null ? [] : [{ label, value: number(vitals[name]!), unit: field(name).unit }];
  const bloodPressure =
    vitals.systolicBp != null && vitals.diastolicBp != null
      ? [{ label: "Huyết áp", value: `${vitals.systolicBp}/${vitals.diastolicBp}`, unit: "mmHg" }]
      : [...tile("systolicBp"), ...tile("diastolicBp")];
  const bmi = bodyMassIndex(vitals);
  return [
    ...tile("temperature"),
    ...tile("pulse"),
    ...bloodPressure,
    ...tile("spo2"),
    ...tile("respiratoryRate"),
    ...tile("weightKg"),
    ...tile("heightCm"),
    ...(bmi == null ? [] : [{ label: "BMI", value: number(bmi), unit: "kg/m²" }]),
  ];
}

function Notice({ title, text, action }: { title: string; text: string; action?: ReactNode }) {
  return (
    <div className="bg-card flex flex-col items-start gap-1 rounded-2xl border border-dashed border-border p-5">
      <p className="font-medium">{title}</p>
      <p className="text-muted-foreground text-sm">{text}</p>
      {action}
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-display text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Tile({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <li className="bg-card flex flex-col gap-1 rounded-2xl border border-border p-4">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className="font-display text-2xl font-semibold tabular-nums">{value}</span>
      <span className="text-muted-foreground text-xs">{unit}</span>
    </li>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:gap-6">
      <dt className="text-muted-foreground shrink-0 text-sm sm:w-40">{label}</dt>
      <dd className="text-sm whitespace-pre-line">{children || "—"}</dd>
    </div>
  );
}
