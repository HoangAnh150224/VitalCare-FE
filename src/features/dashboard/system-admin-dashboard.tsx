import { useCan, useList } from "@refinedev/core";
import {
  ArrowRightIcon,
  Building2Icon,
  RefreshCwIcon,
  ScrollTextIcon,
  ShieldCheckIcon,
  UsersRoundIcon,
  type LucideIcon,
} from "lucide-react";
import { Link } from "react-router";

import { AUDIT_ACTION_LABELS, type AuditEntry } from "@/domains/audit-log/types";
import type { Clinic } from "@/domains/clinic/types";
import type { Role } from "@/domains/role/types";
import type { User } from "@/domains/user/types";
import { formatDateTime } from "@/shared/lib/format";
import { humanizeResource } from "@/domains/permission/types";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { Skeleton } from "@/shared/ui/skeleton";

/** System-wide landing page for the System Administrator. */
export function SystemAdminDashboard() {
  const { data: usersAccess } = useCan({ resource: "users", action: "list" });
  const { data: clinicsAccess } = useCan({ resource: "clinics", action: "list" });
  const { data: rolesAccess } = useCan({ resource: "roles", action: "list" });
  const { data: auditAccess } = useCan({ resource: "audit_logs", action: "list" });

  const canReadUsers = usersAccess?.can ?? false;
  const canReadClinics = clinicsAccess?.can ?? false;
  const canReadRoles = rolesAccess?.can ?? false;
  const canReadAudit = auditAccess?.can ?? false;

  const users = useList<User>({
    resource: "users",
    pagination: { currentPage: 1, pageSize: 1 },
    queryOptions: { enabled: canReadUsers },
  });
  const clinics = useList<Clinic>({
    resource: "clinics",
    pagination: { mode: "off" },
    queryOptions: { enabled: canReadClinics },
  });
  const roles = useList<Role>({
    resource: "roles",
    pagination: { currentPage: 1, pageSize: 1 },
    queryOptions: { enabled: canReadRoles },
  });
  const audit = useList<AuditEntry>({
    resource: "audit_logs",
    pagination: { currentPage: 1, pageSize: 5 },
    sorters: [{ field: "occurredAt", order: "desc" }],
    queryOptions: { enabled: canReadAudit },
  });

  const metrics = [
    {
      label: "Tài khoản",
      description: "Tài khoản toàn hệ thống",
      value: users.result?.total ?? users.result?.data.length ?? 0,
      canRead: canReadUsers,
      isLoading: users.query.isLoading,
      isError: users.query.isError,
      retry: () => void users.query.refetch(),
      to: "/users",
      icon: UsersRoundIcon,
    },
    {
      label: "Cơ sở",
      description: "Cơ sở trong danh mục",
      value: clinics.result?.total ?? clinics.result?.data.length ?? 0,
      canRead: canReadClinics,
      isLoading: clinics.query.isLoading,
      isError: clinics.query.isError,
      retry: () => void clinics.query.refetch(),
      to: "/clinics",
      icon: Building2Icon,
    },
    {
      label: "Vai trò",
      description: "Vai trò đăng nhập và quản trị",
      value: roles.result?.total ?? roles.result?.data.length ?? 0,
      canRead: canReadRoles,
      isLoading: roles.query.isLoading,
      isError: roles.query.isError,
      retry: () => void roles.query.refetch(),
      to: "/roles",
      icon: ShieldCheckIcon,
    },
    {
      label: "Nhật ký hoạt động",
      description: "Bản ghi quản trị toàn hệ thống",
      value: audit.result?.total ?? audit.result?.data.length ?? 0,
      canRead: canReadAudit,
      isLoading: audit.query.isLoading,
      isError: audit.query.isError,
      retry: () => void audit.query.refetch(),
      to: "/audit-logs",
      icon: ScrollTextIcon,
    },
  ].filter((metric) => metric.canRead);

  return (
    <div className="screen-enter screen-enter-stagger flex flex-col gap-7">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Badge variant="info" className="mb-3 tracking-wide">
            QUẢN TRỊ HỆ THỐNG
          </Badge>
          <h1>Tổng quan hệ thống</h1>
          <p className="text-muted-foreground mt-2 max-w-2xl text-sm sm:text-base">
            Theo dõi tài khoản, cơ sở và hoạt động quản trị của VitalCare.
          </p>
        </div>
        <Badge variant="outline">Phạm vi toàn hệ thống</Badge>
      </header>

      <section aria-label="Chỉ số toàn hệ thống" className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </section>

      {canReadAudit && (
        <RecentActivity
          entries={audit.result?.data ?? []}
          isLoading={audit.query.isLoading}
          isError={audit.query.isError}
          retry={() => void audit.query.refetch()}
        />
      )}
    </div>
  );
}

function MetricCard({
  label,
  description,
  value,
  isLoading,
  isError,
  retry,
  to,
  icon: Icon,
}: {
  label: string;
  description: string;
  value: number;
  isLoading: boolean;
  isError: boolean;
  retry: () => void;
  to: string;
  icon: LucideIcon;
}) {
  return (
    <Card className="h-full gap-4 p-5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        <span className="flex size-10 items-center justify-center rounded-xl bg-accent text-primary [&_svg]:size-5">
          <Icon aria-hidden />
        </span>
      </div>
      {isLoading ? (
        <Skeleton className="h-9 w-20" />
      ) : isError ? (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Chưa tải được số liệu</span>
          <Button type="button" variant="ghost" size="sm" onClick={retry}>
            <RefreshCwIcon />
            Thử lại
          </Button>
        </div>
      ) : (
        <>
          <span className="text-3xl font-semibold tabular-nums tracking-tight">
            {value.toLocaleString("vi-VN")}
          </span>
          <span className="text-muted-foreground text-xs">{description}</span>
          <Link
            to={to}
            className="mt-auto inline-flex w-fit items-center gap-1 text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Quản lý <ArrowRightIcon aria-hidden className="size-4" />
          </Link>
        </>
      )}
    </Card>
  );
}

function RecentActivity({
  entries,
  isLoading,
  isError,
  retry,
}: {
  entries: AuditEntry[];
  isLoading: boolean;
  isError: boolean;
  retry: () => void;
}) {
  return (
    <section aria-labelledby="recent-activity-title" className="flex min-w-0 flex-col gap-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 id="recent-activity-title" className="text-lg font-semibold tracking-tight">
            Hoạt động gần đây
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Năm thao tác mới nhất được ghi nhận
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to="/audit-logs">Mở nhật ký</Link>
        </Button>
      </div>

      <Card className="min-h-64 gap-0 overflow-hidden p-0">
        {isLoading ? (
          <div className="flex flex-col gap-4 p-5" aria-label="Đang tải nhật ký hoạt động">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="flex items-center gap-3">
                <Skeleton className="size-10 shrink-0 rounded-full" />
                <div className="flex flex-1 flex-col gap-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="flex min-h-64 flex-col items-center justify-center gap-2 px-5 text-center">
            <p className="text-sm font-medium">Không tải được nhật ký hoạt động.</p>
            <Button type="button" variant="outline" size="sm" onClick={retry}>
              <RefreshCwIcon />
              Thử lại
            </Button>
          </div>
        ) : entries.length === 0 ? (
          <div className="flex min-h-64 flex-col items-center justify-center gap-2 px-5 text-center">
            <span className="flex size-11 items-center justify-center rounded-full bg-accent text-muted-foreground">
              <ScrollTextIcon aria-hidden className="size-5" />
            </span>
            <p className="mt-1 text-sm font-medium">Chưa có hoạt động nào</p>
            <p className="text-muted-foreground text-sm">
              Các thao tác được ghi nhận sẽ xuất hiện tại đây.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {entries.map((entry) => (
              <li key={entry.id}>
                <Link
                  to={`/audit-logs/show/${entry.id}`}
                  className="flex items-center gap-3 px-5 py-4 transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-primary [&_svg]:size-4">
                    <ScrollTextIcon aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-sm font-medium">
                        {entry.actorName ?? (entry.actorId ? `Tài khoản #${entry.actorId}` : "Hệ thống")}
                      </span>
                      <Badge variant="secondary">
                        {AUDIT_ACTION_LABELS[entry.action] ?? entry.action}
                      </Badge>
                    </span>
                    <span className="text-muted-foreground mt-1 block truncate text-xs">
                      {humanizeResource(entry.entityType)}
                      {entry.entityId != null ? ` · #${entry.entityId}` : ""}
                      {` · ${formatDateTime(entry.occurredAt)}`}
                    </span>
                  </span>
                  <ArrowRightIcon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </section>
  );
}
