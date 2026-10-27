import { useCustom, useOne, type HttpError } from "@refinedev/core";
import {
  ActivityIcon,
  ChevronLeftIcon,
  CloudOffIcon,
  DropletsIcon,
  FileHeartIcon,
  FlaskConicalIcon,
  GaugeIcon,
  HeartPulseIcon,
  RulerIcon,
  SearchXIcon,
  StethoscopeIcon,
  ThermometerIcon,
  WeightIcon,
  WindIcon,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { Link, useParams } from "react-router";

import { API_URL } from "@/shared/api/constants";
import { Button } from "@/shared/ui/button";
import { Skeleton } from "@/shared/ui/skeleton";
import { customResult } from "@/shared/hooks/use-custom-result";
import type { Appointment } from "@/domains/appointment/types";
import type { MyVisitResult, VisitVitals } from "@/domains/encounter/types";
import { bodyMassIndex, VITAL_FIELDS } from "@/domains/encounter/types";
import { MyInvoiceCard } from "../invoices/my-invoice-card";
import { OrderFiles, OrderStatusBadge } from "../service-orders/order-parts";
import { EmptyState, IconChip, PortalSection, type Tone } from "./parts";
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
        <EmptyState icon={SearchXIcon} title="Không tìm thấy lượt khám này" text="Lượt khám không có trong tài khoản của bạn." />
      ) : query.isLoading ? (
        <Skeleton className="h-48 rounded-[28px]" />
      ) : failed ? (
        <EmptyState
          icon={CloudOffIcon}
          title="Không tải được kết quả"
          text="Kiểm tra kết nối rồi thử lại."
          action={
            <Button variant="outline" className="rounded-full" onClick={() => query.refetch()}>
              Thử lại
            </Button>
          }
        />
      ) : !encounter || !data ? (
        <EmptyState
          icon={FileHeartIcon}
          title="Chưa có kết quả cho lượt khám này"
          text="Kết quả hiện ở đây khi bác sĩ hoàn tất lượt khám."
        />
      ) : (
        <>
          {/* What a patient opens this page for: the conclusion and what to do next. */}
          <section className="portal-hero relative flex flex-col gap-5 overflow-hidden rounded-[28px] p-6 sm:p-8">
            <StethoscopeIcon
              aria-hidden
              strokeWidth={1.25}
              className="pointer-events-none absolute -right-6 -bottom-8 size-44 text-white/10"
            />
            <div className="relative">
              <h2 className="text-sm font-medium text-white/85">Chẩn đoán</h2>
              <p className="font-display mt-1 text-2xl leading-snug font-extrabold whitespace-pre-line sm:text-3xl">
                {encounter.diagnosis ?? "—"}
              </p>
            </div>
            {encounter.followUp && (
              <div className="relative rounded-2xl bg-white/12 p-4 sm:p-5">
                <h2 className="text-sm font-semibold">Lời dặn của bác sĩ</h2>
                <p className="mt-1.5 leading-relaxed whitespace-pre-line text-white/90">{encounter.followUp}</p>
              </div>
            )}
          </section>

          {tiles.length > 0 && (
            <PortalSection title="Chỉ số khi khám">
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {tiles.map((tile) => (
                  <Tile key={tile.label} {...tile} />
                ))}
              </ul>
            </PortalSection>
          )}

          <PortalSection title="Thông tin khám">
            <dl className="card-soft divide-y divide-border/70">
              <Row label="Lý do khám">{encounter.chiefComplaint}</Row>
              <Row label="Khám thấy">{encounter.examinationFindings}</Row>
              <Row label="Ghi chú của bác sĩ">{encounter.clinicalNote}</Row>
            </dl>
          </PortalSection>

          {data.orders.length > 0 && (
            <PortalSection title="Dịch vụ & kết quả">
              <ul className="flex flex-col gap-3">
                {data.orders.map((order) => (
                  <li key={order.id} className="card-soft flex gap-4 p-4 sm:p-5">
                    <IconChip icon={FlaskConicalIcon} tone="sky" />
                    <div className="flex min-w-0 flex-1 flex-col gap-2">
                      <div className="flex items-start justify-between gap-3">
                        <span className="font-semibold">{order.service.name}</span>
                        <OrderStatusBadge status={order.status} />
                      </div>
                      {order.resultText && (
                        <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-line">
                          {order.resultText}
                        </p>
                      )}
                      <OrderFiles
                        order={order}
                        downloadPath={(fileId) => `my_appointments/${id}/result/files/${fileId}`}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </PortalSection>
          )}

          <MyInvoiceCard appointmentId={id} className="max-w-none" />
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
type VitalTile = { label: string; value: string; unit: string; icon: LucideIcon; tone: Tone };

/** Each measurement's icon, coloured by what it is about: heat and heart, breath, body. */
const VITAL_LOOKS: Record<keyof VisitVitals, { icon: LucideIcon; tone: Tone }> = {
  temperature: { icon: ThermometerIcon, tone: "rose" },
  pulse: { icon: HeartPulseIcon, tone: "rose" },
  systolicBp: { icon: ActivityIcon, tone: "teal" },
  diastolicBp: { icon: ActivityIcon, tone: "teal" },
  spo2: { icon: DropletsIcon, tone: "sky" },
  respiratoryRate: { icon: WindIcon, tone: "sky" },
  weightKg: { icon: WeightIcon, tone: "gold" },
  heightCm: { icon: RulerIcon, tone: "gold" },
};

function vitalTiles(vitals: VisitVitals | null): VitalTile[] {
  if (!vitals) return [];
  const field = (name: keyof VisitVitals) => VITAL_FIELDS.find((candidate) => candidate.name === name)!;
  const tile = (name: keyof VisitVitals, label = field(name).label) =>
    vitals[name] == null ? [] : [{ label, value: number(vitals[name]!), unit: field(name).unit, ...VITAL_LOOKS[name] }];
  const bloodPressure =
    vitals.systolicBp != null && vitals.diastolicBp != null
      ? [{ label: "Huyết áp", value: `${vitals.systolicBp}/${vitals.diastolicBp}`, unit: "mmHg", ...VITAL_LOOKS.systolicBp }]
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
    ...(bmi == null ? [] : [{ label: "BMI", value: number(bmi), unit: "kg/m²", icon: GaugeIcon, tone: "green" as const }]),
  ];
}

function Tile({ label, value, unit, icon, tone }: VitalTile) {
  return (
    <li className="card-soft flex flex-col gap-3 p-4">
      <IconChip icon={icon} tone={tone} className="size-9 rounded-xl" />
      <div className="flex flex-col">
        <span className="text-muted-foreground text-xs font-medium">{label}</span>
        <span className="flex items-baseline gap-1">
          <span className="font-display text-2xl font-extrabold tabular-nums">{value}</span>
          <span className="text-muted-foreground text-xs">{unit}</span>
        </span>
      </div>
    </li>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 px-5 py-4 sm:flex-row sm:gap-6">
      <dt className="text-muted-foreground shrink-0 text-sm sm:w-40">{label}</dt>
      <dd className="text-sm whitespace-pre-line">{children || "—"}</dd>
    </div>
  );
}
