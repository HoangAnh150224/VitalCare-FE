import { useCan, useList } from "@refinedev/core";
import { ExternalLinkIcon, FileTextIcon, FlaskConicalIcon, StethoscopeIcon } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Link } from "react-router";

import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { cn } from "@/shared/lib/utils";
import { formatDateTime } from "@/shared/lib/format";
import type { Encounter } from "@/domains/encounter/types";
import { ENCOUNTER_STATUS_LABELS, VITAL_FIELDS } from "@/domains/encounter/types";
import type { ServiceCategory, ServiceOrder } from "@/domains/billing/types";
import { isOrderOutstanding, SERVICE_CATEGORY_LABELS } from "@/domains/billing/types";
import { ENCOUNTER_STATUS_VARIANTS } from "@/shared/lib/status-variants";
import { OrderFiles, OrderStatusBadge } from "../service-orders/order-parts";
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

function Section({ icon, title, action, children }: { icon: ReactNode; title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="flex min-w-0 flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-primary flex items-center gap-2 text-sm font-semibold">
          {icon}
          {title}
        </h3>
        {action}
      </div>
      {children}
    </section>
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

/** One visit's results: the examination and conclusion, the services by category, the files. */
function VisitResult({ visit }: { visit: Encounter }) {
  const { data: canReadOrders } = useCan({ resource: "service_orders", action: "list" });
  const { orders, loading } = useEncounterOrders(visit.id, canReadOrders?.can ?? false);
  const done = orders.filter((o) => o.status !== "cancelled");
  const categories = [...new Set(done.map((o) => o.service.category))] as ServiceCategory[];
  const waiting = done.filter(isOrderOutstanding).length;
  const withFiles = done.filter((o) => o.files.length > 0);
  const vitals = visit.vitals
    ? VITAL_FIELDS.filter((f) => visit.vitals?.[f.name] != null)
        .map((f) => `${f.label} ${visit.vitals?.[f.name]} ${f.unit}`)
        .join(" · ")
    : "";

  return (
    <div className="flex min-w-0 flex-col gap-6 p-4">
      <Section
        icon={<StethoscopeIcon className="size-4" />}
        title="Kết quả khám bệnh"
        action={
          <Button asChild size="sm" variant="outline">
            <Link to={`/clinical-encounters/show/${visit.id}`}>
              <ExternalLinkIcon />
              {visit.status === "in_progress" ? "Mở lần khám để kết luận" : "Mở lần khám"}
            </Link>
          </Button>
        }
      >
        <div className="flex flex-wrap gap-x-8 gap-y-2 border-b pb-3 text-sm">
          <div>
            <p className="text-muted-foreground text-xs">Bác sĩ</p>
            <p className="font-medium">{visit.clinician?.fullName ?? "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Thời gian khám</p>
            <p className="font-medium">{formatDateTime(visit.startedAt)}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Trạng thái</p>
            <Badge variant={ENCOUNTER_STATUS_VARIANTS[visit.status] ?? "secondary"}>
              {ENCOUNTER_STATUS_LABELS[visit.status]}
            </Badge>
          </div>
        </div>
        <dl className="flex flex-col gap-2">
          <Field label="Lý do khám">{visit.chiefComplaint}</Field>
          {vitals && <Field label="Chỉ số sinh tồn">{vitals}</Field>}
          <Field label="Chẩn đoán sơ bộ">{visit.diagnosis}</Field>
          <Field label="Kết luận">{visit.finalConclusion}</Field>
          <Field label="Tư vấn điều trị">{visit.consultationNotes}</Field>
          <Field label="Theo dõi / tái khám">{visit.followUp}</Field>
        </dl>
      </Section>

      {canReadOrders?.can && (
        <Section
          icon={<FlaskConicalIcon className="size-4" />}
          title="Kết quả dịch vụ"
          action={waiting > 0 ? <Badge variant="warning">{waiting} chưa xong / chờ bác sĩ xem</Badge> : undefined}
        >
          {done.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              {loading ? "Đang tải..." : "Lần khám này không chỉ định dịch vụ nào."}
            </p>
          ) : (
            <Tabs defaultValue={categories[0]}>
              <TabsList className="max-w-full flex-wrap">
                {categories.map((c) => (
                  <TabsTrigger key={c} value={c}>
                    {SERVICE_CATEGORY_LABELS[c]}
                  </TabsTrigger>
                ))}
              </TabsList>
              {categories.map((c) => (
                <TabsContent key={c} value={c} className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Dịch vụ</TableHead>
                        <TableHead>Kết quả</TableHead>
                        <TableHead className="w-36">Trạng thái</TableHead>
                        <TableHead className="w-40">Có kết quả lúc</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {done
                        .filter((o) => o.service.category === c)
                        .map((order) => (
                          <ResultRow key={order.id} order={order} />
                        ))}
                    </TableBody>
                  </Table>
                </TabsContent>
              ))}
            </Tabs>
          )}
        </Section>
      )}

      {withFiles.length > 0 && (
        <Section icon={<FileTextIcon className="size-4" />} title="File kết quả">
          <ul className="flex flex-col gap-3">
            {withFiles.map((order) => (
              <li key={order.id} className="flex flex-col gap-2 rounded-lg border p-3">
                <span className="text-sm font-medium">Kết quả {order.service.name}</span>
                <OrderFiles order={order} />
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}

function ResultRow({ order }: { order: ServiceOrder }) {
  return (
    <TableRow className="align-top">
      <TableCell className="font-medium whitespace-normal">{order.service.name}</TableCell>
      <TableCell className="min-w-56 whitespace-pre-wrap">
        {order.resultText ?? <span className="text-muted-foreground">Chưa có kết quả</span>}
      </TableCell>
      <TableCell>
        <OrderStatusBadge status={order.status} />
      </TableCell>
      <TableCell className="text-muted-foreground text-xs tabular-nums">
        {order.resultAt ? formatDateTime(order.resultAt) : "—"}
      </TableCell>
    </TableRow>
  );
}
