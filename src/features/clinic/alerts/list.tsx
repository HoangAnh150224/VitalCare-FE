import { useTable } from "@refinedev/react-table";
import { createColumnHelper } from "@tanstack/react-table";
import React from "react";
import { Link } from "react-router";

import {
  actionsColumnWidth,
  DataTable,
  RESIZABLE_COLUMN_DEFAULTS,
} from "@/shared/components/data-table/data-table";
import { DataTableQuickFilter } from "@/shared/components/data-table/data-table-quick-filter";
import {
  DataTableAdvancedFilter,
  DataTableFilterChips,
  type AdvancedFilterField,
} from "@/shared/components/data-table/data-table-advanced-filter";
import {
  ListToolbar,
  ListView,
  ListViewHeader,
} from "@/shared/components/views/list-view";
import { ShowButton } from "@/shared/components/buttons/show";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { formatDateTime } from "@/shared/lib/format";
import {
  ALERT_STATUS_LABELS,
  ALERT_STATUS_OPTIONS,
  ALERT_STATUS_VARIANTS,
  METRIC_LABELS,
  METRIC_OPTIONS,
  SEVERITY_LABELS,
  SEVERITY_OPTIONS,
  SEVERITY_VARIANTS,
  valueWithUnit,
  type Alert,
} from "@/domains/alerts/types";

const FILTER_FIELDS: AdvancedFilterField[] = [
  {
    field: "status",
    label: "Trạng thái",
    type: "select",
    options: ALERT_STATUS_OPTIONS,
  },
  {
    field: "severity",
    label: "Mức độ",
    type: "select",
    options: SEVERITY_OPTIONS,
  },
  { field: "metric", label: "Chỉ số", type: "select", options: METRIC_OPTIONS },
  {
    field: "triggeredFrom",
    label: "Từ ngày",
    type: "text",
    placeholder: "YYYY-MM-DD",
  },
  {
    field: "triggeredTo",
    label: "Đến ngày",
    type: "text",
    placeholder: "YYYY-MM-DD",
  },
];

/**
 * Alerts List (FE-05): what the rules raised, the open ones first by default.
 * Filter by status, severity, measure and time; search by patient.
 */
export const AlertList = () => {
  const columns = React.useMemo(() => {
    const col = createColumnHelper<Alert>();
    return [
      col.accessor("triggeredAt", {
        id: "triggeredAt",
        header: "Phát sinh",
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="tabular-nums">
              {formatDateTime(row.original.triggeredAt)}
            </span>
            {row.original.occurrences > 1 && (
              <span className="text-muted-foreground text-xs">
                {row.original.occurrences} lần · gần nhất{" "}
                {formatDateTime(row.original.lastTriggeredAt)}
              </span>
            )}
          </div>
        ),
      }),
      col.display({
        id: "patient",
        header: "Bệnh nhân",
        cell: ({ row }) =>
          row.original.patient ? (
            <Link
              to={`/vital-signs/patient/${row.original.patient.id}`}
              className="font-medium hover:underline"
            >
              {row.original.patient.fullName}
            </Link>
          ) : (
            "—"
          ),
      }),
      col.accessor("metric", {
        id: "metric",
        header: "Chỉ số",
        cell: ({ row }) => (
          <Link
            to={`/alerts/show/${row.original.id}`}
            className="flex flex-col hover:underline"
          >
            <span className="font-medium">
              {METRIC_LABELS[row.original.metric]}{" "}
              {valueWithUnit(row.original.metric, row.original.lastValue)}
            </span>
            <span className="text-muted-foreground text-xs">
              {row.original.ruleName}
            </span>
          </Link>
        ),
      }),
      col.accessor("severity", {
        id: "severity",
        header: "Mức độ",
        cell: ({ getValue }) => (
          <Badge variant={SEVERITY_VARIANTS[getValue()]}>
            {SEVERITY_LABELS[getValue()]}
          </Badge>
        ),
      }),
      col.accessor("status", {
        id: "status",
        header: "Trạng thái",
        cell: ({ getValue }) => (
          <Badge variant={ALERT_STATUS_VARIANTS[getValue()]}>
            {ALERT_STATUS_LABELS[getValue()]}
          </Badge>
        ),
      }),
      col.display({
        id: "actions",
        header: "Thao tác",
        enableSorting: false,
        cell: ({ row }) => (
          <ShowButton
            resource="alerts"
            recordItemId={row.original.id}
            iconOnly
            size="icon-sm"
          />
        ),
        ...actionsColumnWidth(1),
      }),
    ];
  }, []);

  const table = useTable({
    columns,
    enableColumnResizing: true,
    columnResizeMode: "onChange",
    defaultColumn: RESIZABLE_COLUMN_DEFAULTS,
    initialState: { columnPinning: { right: ["actions"] } },
    refineCoreProps: {
      resource: "alerts",
      syncWithLocation: true,
      filters: {
        initial: [{ field: "status", operator: "eq", value: "active" }],
      },
      queryOptions: { refetchInterval: 30_000 },
    },
  });

  return (
    <ListView>
      <ListViewHeader
        resource="alerts"
        canCreate={false}
        description="Cảnh báo phát sinh từ sinh hiệu của bệnh nhân. Mặc định chỉ hiện cảnh báo chưa xử lý xong."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link to="/alerts/readings">Số đo bất thường</Link>
          </Button>
        }
      />
      <DataTable
        table={table}
        toolbar={
          <>
            <ListToolbar
              table={table}
              search={<DataTableQuickFilter table={table} placeholder="Tìm theo tên bệnh nhân hoặc nội dung cảnh báo..." />}
              filters={
                <DataTableAdvancedFilter table={table} fields={FILTER_FIELDS} />
              }
            />
            <DataTableFilterChips table={table} fields={FILTER_FIELDS} />
          </>
        }
      />
    </ListView>
  );
};
