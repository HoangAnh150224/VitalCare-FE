import { useCan, useList } from "@refinedev/core";
import { CheckIcon, ChevronDownIcon, FileTextIcon, FlaskConicalIcon, ScanLineIcon, StethoscopeIcon } from "lucide-react";
import { useState, type ReactNode } from "react";

import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { cn } from "@/shared/lib/utils";
import { formatDateTime } from "@/shared/lib/format";
import type { Encounter } from "@/domains/encounter/types";
import { ENCOUNTER_STATUS_LABELS, VITAL_FIELDS } from "@/domains/encounter/types";
import type { ServiceOrder } from "@/domains/billing/types";
import { isOrderOutstanding, SERVICE_CATEGORY_LABELS } from "@/domains/billing/types";
import { parseResult } from "@/domains/billing/result-text";
import { ENCOUNTER_STATUS_VARIANTS } from "@/shared/lib/status-variants";
import { OrderFiles, OrderStatusBadge, useOrderActions } from "../service-orders/order-parts";
import { ConsultationPanel } from "../results/consultation-panel";
import { useEncounterOrders } from "../service-orders/encounter-orders-panel";

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * A patient's health record as a doctor reads it: every visit on a timeline by
 * year, and for the one picked, what the doctor found and concluded, the
 * services' results by category, and the result files. Concluding happens on
 * the visit's own page, one click away.
 */
export function HealthRecord({ customerId }: { customerId: number }) {
  const { data: canRead } = useCan({ resource: "clinical_encounters", action: "list" });
  const { result, query } = useList<Encounter>({
    resource: "clinical_encounters",
    filters: [{ field: "customer.id", operator: "eq", value: customerId }],
    pagination: { pageSize: 100 },
    queryOptions: { enabled: canRead?.can ?? false },
  });
  const visits = [...(result?.data ?? [])].sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  const [pickedId, setPickedId] = useState<number | null>(null);
  const picked = visits.find((v) => v.id === pickedId) ?? visits[0];

  if (!canRead?.can) return null;

  const years = [...new Set(visits.map((v) => new Date(v.startedAt).getFullYear()))];

  return (
    <Card className="gap-0 overflow-hidden p-0">
      <div className="border-b px-4 py-3">
        <h2 className="text-sm font-semibold tracking-wide uppercase">Hồ sơ sức khoẻ</h2>
        <p className="text-muted-foreground text-xs">Kết quả từng lần khám: chọn một ngày khám để xem.</p>
      </div>
      {visits.length === 0 ? (
        <p className="text-muted-foreground px-4 py-6 text-sm">
          {query.isLoading ? "Đang tải..." : "Chưa có lần khám nào."}
        </p>
      ) : (
        <div className="grid min-w-0 lg:grid-cols-[17rem_minmax(0,1fr)]">
          {/* The timeline: newest first, grouped by year. */}
          <nav
            aria-label="Các lần khám"
            className="bg-surface-subtle/50 max-h-[40rem] overflow-y-auto border-b p-4 lg:border-r lg:border-b-0"
          >
            {years.map((year) => (
              <section key={year} className="border-border relative mb-4 border-l-2 pl-4 last:mb-0">
                <span className="bg-muted-foreground absolute top-2 -left-[5px] size-2 rounded-full" />
                <h3 className="text-primary mb-2 text-sm font-semibold">Năm {year}</h3>
                <ul className="flex flex-col gap-2">
                  {visits
                    .filter((v) => new Date(v.startedAt).getFullYear() === year)
                    .map((visit) => {
                      const at = new Date(visit.startedAt);
                      const active = visit.id === picked?.id;
                      return (
                        <li key={visit.id}>
                          <button
                            type="button"
                            onClick={() => setPickedId(visit.id)}
                            aria-current={active ? "true" : undefined}
                            className={cn(
                              "bg-background flex w-full items-stretch gap-3 rounded-lg border p-2 text-left transition-colors",
                              active ? "border-primary ring-primary/30 ring-2" : "hover:bg-accent/40"
                            )}
                          >
                            <span className="flex w-14 shrink-0 flex-col items-center justify-center border-r pr-2">
                              <span className="text-primary text-2xl leading-none font-bold tabular-nums">
                                {pad(at.getDate())}
                              </span>
                              <span className="text-muted-foreground text-xs tabular-nums">
                                {pad(at.getMonth() + 1)}/{at.getFullYear()}
                              </span>
                            </span>
                            <span className="flex min-w-0 flex-1 flex-col gap-1">
                              <span className="line-clamp-1 text-sm font-medium">
                                {visit.chiefComplaint || "Lần khám"}
                              </span>
                              <span className="text-muted-foreground line-clamp-1 text-xs">
                                {visit.clinician?.fullName ?? "—"}
                              </span>
                              <Badge
                                variant={ENCOUNTER_STATUS_VARIANTS[visit.status] ?? "secondary"}
                                className="w-fit"
                              >
                                {ENCOUNTER_STATUS_LABELS[visit.status]}
                              </Badge>
                            </span>
                          </button>
                        </li>
                      );
                    })}
                </ul>
              </section>
            ))}
          </nav>

          {picked && <VisitResult key={picked.id} visit={picked} />}
        </div>
      )}
    </Card>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 text-sm sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-3">
      <dt className="text-muted-foreground font-medium">{label}</dt>
      <dd className="whitespace-pre-wrap">{children || <span className="text-muted-foreground">—</span>}</dd>
    </div>
  );
}

/**
 * One visit's results, laid out as a hospital's patient record reads, a tab
 * per part so the doctor reads one at a time: the examination and its
 * conclusion (preliminary diagnosis at the visit; the diagnosis and advice once
 * the results were read), the lab results as tables of indicators — a tab per
 * test —, the imaging and function tests each with its description and
 * conclusion, and every result file.
 */
function VisitResult({ visit }: { visit: Encounter }) {
  const { data: canReadOrders } = useCan({ resource: "service_orders", action: "list" });
  const { orders, loading, refetch } = useEncounterOrders(visit.id, canReadOrders?.can ?? false);
  // The doctor reads each result here and marks it read; then concludes, here too.
  const { data: canReview } = useCan({ resource: "service_orders", action: "create" });
  const { data: canConclude } = useCan({ resource: "clinical_encounters", action: "conclude" });
  const actions = useOrderActions(() => void refetch());
  const review = (canReview?.can ?? false) && visit.status === "in_progress" ? (id: number) => actions.review(id) : undefined;
  const done = orders.filter((o) => o.status !== "cancelled");
  const labs = done.filter((o) => o.service.category === "lab");
  const studies = done.filter((o) => o.service.category !== "lab");
  const waiting = done.filter(isOrderOutstanding).length;
  const toRead = done.filter((o) => o.status === "result_ready").length;
  // Every result is in and read: the conclusion written now ends the visit.
  const finishing =
    visit.status === "in_progress" && done.length > 0 && waiting === 0 && (canConclude?.can ?? false);
  const withFiles = done.filter((o) => o.files.length > 0);
  const fileCount = withFiles.reduce((sum, o) => sum + o.files.length, 0);
  const vitals = visit.vitals
    ? VITAL_FIELDS.filter((f) => visit.vitals?.[f.name] != null)
        .map((f) => `${f.label} ${visit.vitals?.[f.name]} ${f.unit}`)
        .join(" · ")
    : "";

  const tabs = [
    { value: "exam", label: "Khám bệnh", count: null as number | null },
    ...(canReadOrders?.can && labs.length > 0 ? [{ value: "lab", label: "Xét nghiệm", count: labs.length }] : []),
    ...(canReadOrders?.can && studies.length > 0
      ? [{ value: "study", label: "CĐHA & thăm dò chức năng", count: studies.length }]
      : []),
    ...(canReadOrders?.can ? [{ value: "files", label: "File kết quả", count: fileCount }] : []),
  ];

  return (
    <div className="flex min-w-0 flex-col gap-3 p-4">
      <div className="flex flex-wrap items-center gap-x-8 gap-y-2 rounded-lg border px-4 py-3 text-sm">
        <Meta label="Bác sĩ">{visit.clinician?.fullName ?? "—"}</Meta>
        <Meta label="Thời gian khám">{formatDateTime(visit.startedAt)}</Meta>
        <Meta label="Trạng thái">
          <Badge variant={ENCOUNTER_STATUS_VARIANTS[visit.status] ?? "secondary"}>
            {ENCOUNTER_STATUS_LABELS[visit.status]}
          </Badge>
        </Meta>
        {waiting > 0 && <Badge variant="warning">{waiting} dịch vụ chưa xong / chờ bác sĩ xem</Badge>}
        {review && toRead > 0 && <Badge variant="info">{toRead} kết quả mới chờ bác sĩ xem</Badge>}
      </div>

      <Tabs defaultValue="exam" className="min-w-0">
        <TabsList className="max-w-full flex-wrap">
          {tabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
              {tab.count != null && <span className="text-muted-foreground ms-1 text-xs tabular-nums">({tab.count})</span>}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="exam">
          <Block icon={<StethoscopeIcon className="size-4" />} title="Kết quả khám bệnh">
            <Divider>Khám lâm sàng</Divider>
            <dl className="flex flex-col gap-2">
              <Field label="Lý do khám">{visit.chiefComplaint}</Field>
              {visit.examinationFindings && <Field label="Khám thấy">{visit.examinationFindings}</Field>}
              {vitals && <Field label="Chỉ số sinh tồn">{vitals}</Field>}
            </dl>
            <Divider>Kết luận</Divider>
            <dl className="flex flex-col gap-2">
              <Field label="Chẩn đoán sơ bộ">{visit.diagnosis}</Field>
            </dl>
            {finishing ? (
              <ConsultationPanel key={`${visit.id}-finishing`} encounter={visit} finishing />
            ) : (
            <dl className="flex flex-col gap-2">
              <Field label="Chẩn đoán bệnh">
                {visit.finalConclusion ??
                  (waiting > 0 ? (
                    <span className="text-muted-foreground">Chờ kết quả dịch vụ ({waiting} chưa xong)</span>
                  ) : null)}
              </Field>
              <Field label="Tư vấn điều trị">{visit.consultationNotes}</Field>
              <Field label="Lời dặn">{visit.followUp}</Field>
            </dl>
            )}
            {visit.status === "in_progress" && waiting > 0 && (
              <p className="text-muted-foreground text-sm">
                Xem kết quả ở các tab dịch vụ và bấm “Đã xem kết quả”; xem hết thì ghi chẩn đoán bệnh tại đây để kết thúc lần khám.
              </p>
            )}
          </Block>
        </TabsContent>

        {labs.length > 0 && (
          <TabsContent value="lab">
            <Block icon={<FlaskConicalIcon className="size-4" />} title="Kết quả xét nghiệm">
              <Tabs defaultValue={String(labs[0].id)}>
                <TabsList className="max-w-full flex-wrap">
                  {labs.map((order) => (
                    <TabsTrigger key={order.id} value={String(order.id)}>
                      {order.service.name}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {labs.map((order) => (
                  <TabsContent key={order.id} value={String(order.id)} className="flex flex-col gap-3">
                    <OrderResult order={order} onReview={review} pending={actions.pending} />
                  </TabsContent>
                ))}
              </Tabs>
            </Block>
          </TabsContent>
        )}

        {studies.length > 0 && (
          <TabsContent value="study">
            <Block icon={<ScanLineIcon className="size-4" />} title="Kết quả chẩn đoán hình ảnh và thăm dò chức năng">
              <div className="flex flex-col divide-y">
                {studies.map((order) => (
                  <article key={order.id} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-primary text-sm font-semibold uppercase">{order.service.name}</h4>
                      <OrderStatusBadge status={order.status} />
                      <span className="text-muted-foreground text-xs">
                        {SERVICE_CATEGORY_LABELS[order.service.category]}
                      </span>
                    </div>
                    <OrderResult order={order} onReview={review} pending={actions.pending} />
                  </article>
                ))}
              </div>
            </Block>
          </TabsContent>
        )}

        <TabsContent value="files">
          <Block icon={<FileTextIcon className="size-4" />} title="File kết quả">
            {withFiles.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                {loading ? "Đang tải..." : "Chưa có file kết quả."}
              </p>
            ) : (
              <ul className="grid gap-2 sm:grid-cols-2">
                {withFiles.map((order) => (
                  <li key={order.id} className="flex flex-col gap-2 rounded-lg border p-3">
                    <span className="flex items-center gap-2 text-sm font-medium">
                      <FileTextIcon className="text-destructive size-4 shrink-0" />
                      {order.service.name}
                    </span>
                    <OrderFiles order={order} />
                  </li>
                ))}
              </ul>
            )}
          </Block>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/** A collapsible block, open to begin with, as the record's sections are. */
function Block({ icon, title, action, children }: { icon: ReactNode; title: string; action?: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <section className="bg-background min-w-0 overflow-hidden rounded-lg border">
      <div className="bg-surface-subtle flex items-center justify-between gap-2 border-b px-4 py-2.5">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          className="text-primary flex min-w-0 flex-1 items-center gap-2 text-left text-sm font-semibold"
        >
          {icon}
          <span className="truncate">{title}</span>
          <ChevronDownIcon className={cn("ms-auto size-4 shrink-0 transition-transform", open && "rotate-180")} />
        </button>
        {action}
      </div>
      {open && <div className="flex min-w-0 flex-col gap-3 p-4">{children}</div>}
    </section>
  );
}

function Meta({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className="font-medium">{children}</span>
    </div>
  );
}

function Divider({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-3 pt-1">
      <span className="text-sm font-semibold">{children}</span>
      <span className="bg-border h-px flex-1" />
    </div>
  );
}

/** A service's result in its parts: the files, description, the indicators' table, the conclusion. */
function OrderResult({
  order,
  onReview,
  pending = false,
}: {
  order: ServiceOrder;
  /** The doctor's, while the visit is open: marks this result read. */
  onReview?: (id: number) => void;
  pending?: boolean;
}) {
  if (!order.resultText) {
    return (
      <p className="text-muted-foreground text-sm">
        {order.status === "ordered" || order.status === "in_progress" ? "Chưa có kết quả." : "—"}
      </p>
    );
  }
  const { description, indicators, conclusion } = parseResult(order.resultText);
  return (
    <div className="flex min-w-0 flex-col gap-3">
      {order.files.length > 0 && <OrderFiles order={order} />}
      {description.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className="text-sm font-semibold">Mô tả</span>
          <p className="text-sm whitespace-pre-wrap">{description.join("\n")}</p>
        </div>
      )}
      {indicators.length > 0 && (
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tên chỉ số</TableHead>
                <TableHead className="w-28 text-center">Kết quả</TableHead>
                <TableHead className="w-24 text-center">Đơn vị</TableHead>
                <TableHead className="w-40 text-center">Giá trị tham chiếu</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {indicators.map((row, at) => (
                <TableRow key={at} className="even:bg-surface-subtle/60">
                  <TableCell className="whitespace-normal">{row.name}</TableCell>
                  <TableCell className={cn("text-center tabular-nums", row.flag && "text-destructive font-semibold")}>
                    {row.value}
                    {row.flag === "high" ? " ↑" : row.flag === "low" ? " ↓" : ""}
                  </TableCell>
                  <TableCell className="text-center">{row.unit || "—"}</TableCell>
                  <TableCell className="text-muted-foreground text-center tabular-nums">
                    {row.reference ? `( ${row.reference} )` : ""}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      {conclusion && (
        <div className="flex flex-col gap-1">
          <Divider>
            <span className="text-primary uppercase">Kết luận</span>
          </Divider>
          <p className="text-sm font-semibold">{conclusion}</p>
        </div>
      )}
      <p className="text-muted-foreground text-xs">
        {order.performedBy ? `Thực hiện: ${order.performedBy}` : ""}
        {order.resultAt ? ` · Có kết quả ${formatDateTime(order.resultAt)}` : ""}
        {order.reviewedBy ? " · Bác sĩ đã xem" : ""}
      </p>
      {onReview && order.status === "result_ready" && (
        <Button size="sm" className="w-fit" onClick={() => onReview(order.id)} disabled={pending}>
          <CheckIcon />
          Đã xem kết quả
        </Button>
      )}
    </div>
  );
}
