import { useTable } from "@refinedev/react-table";
import { createColumnHelper } from "@tanstack/react-table";
import React from "react";
import { Link } from "react-router";

import {
  actionsColumnWidth,
  DataTable,
  RESIZABLE_COLUMN_DEFAULTS,
} from "@/shared/components/data-table/data-table";
import { ListView, ListViewHeader } from "@/shared/components/views/list-view";
import { ShowButton } from "@/shared/components/buttons/show";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { formatDate } from "@/shared/lib/format";
import type { MyPatient } from "@/domains/assignment/types";

/**
 * The patients the signed-in doctor or nurse is following. The API answers it
 * from the caller's own assignments, so there is nothing to filter by staff
 * and no way to see somebody else's caseload.
 *
 * An administrator viewing as a member of staff gets the same table from
 * `view_as`: `resource` points it there and `patientPath` links each row.
 * `showCareTeam` lists who follows each patient, for the view of every
 * caseload at once, and `employeeId` narrows that view to one person's.
 */
type MyPatientListProps = {
  resource?: string;
  patientPath?: (id: number) => string;
  showCareTeam?: boolean;
  employeeId?: number;
  title?: string;
  description?: string;
};

export const MyPatientList = ({
  resource,
  patientPath,
  showCareTeam = false,
  employeeId,
  title,
  description = "Bệnh nhân bạn đang được phân công theo dõi.",
}: MyPatientListProps = {}) => {
  const columns = React.useMemo(() => {
    const columnHelper = createColumnHelper<MyPatient>();
    return [
      columnHelper.accessor("fullName", {
        id: "fullName",
        header: "Bệnh nhân",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-medium">{row.original.fullName}</span>
            <span className="text-muted-foreground font-mono text-xs">
              {row.original.phone} · {row.original.customerCode}
            </span>
          </div>
        ),
      }),
      columnHelper.display({
        id: "device",
        header: "Thiết bị",
        enableSorting: false,
        cell: ({ row }) =>
          row.original.device ? (
            <Badge variant="info">{row.original.device.deviceCode}</Badge>
          ) : (
            <span className="text-muted-foreground text-sm">Chưa đeo</span>
          ),
      }),
      ...(showCareTeam
        ? [
            columnHelper.display({
              id: "careTeam",
              header: "Người phụ trách",
              enableSorting: false,
              cell: ({ row }) => (
                <div className="flex flex-wrap gap-1">
                  {(row.original.careTeam ?? []).map((member) => (
                    <Badge key={member.id} variant="outline">
                      {member.fullName}
                    </Badge>
                  ))}
                </div>
              ),
            }),
          ]
        : []),
      columnHelper.accessor("followingSince", {
        id: "followingSince",
        header: "Theo dõi từ",
        enableSorting: false,
        cell: ({ getValue }) => <span className="text-sm">{formatDate(getValue())}</span>,
      }),
      columnHelper.display({
        id: "actions",
        header: "Thao tác",
        enableSorting: false,
        cell: ({ row }) =>
          patientPath ? (
            <Button asChild size="sm" variant="outline">
              <Link to={patientPath(row.original.id)}>Xem</Link>
            </Button>
          ) : (
            <ShowButton recordItemId={row.original.id} iconOnly size="icon-sm" />
          ),
        ...actionsColumnWidth(1),
      }),
    ];
  }, [patientPath, showCareTeam]);

  const table = useTable({
    columns,
    defaultColumn: RESIZABLE_COLUMN_DEFAULTS,
    // The API answers with the whole caseload at once; paging it here would
    // show page one's rows again on every page.
    refineCoreProps: {
      resource,
      syncWithLocation: !resource,
      pagination: { mode: "off" },
      filters: employeeId
        ? { permanent: [{ field: "employeeId", operator: "eq", value: employeeId }] }
        : undefined,
    },
  });

  return (
    <ListView>
      <ListViewHeader title={title} description={description} />
      <DataTable table={table} />
    </ListView>
  );
};
