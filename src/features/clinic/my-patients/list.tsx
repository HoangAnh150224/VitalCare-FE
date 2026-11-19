import { useTable } from "@refinedev/react-table";
import { createColumnHelper, getFilteredRowModel, type FilterFn } from "@tanstack/react-table";
import { SearchIcon } from "lucide-react";
import React, { useEffect, useState } from "react";

import {
  actionsColumnWidth,
  DataTable,
  RESIZABLE_COLUMN_DEFAULTS,
} from "@/shared/components/data-table/data-table";
import { ListView, ListViewHeader } from "@/shared/components/views/list-view";
import { Link } from "react-router";
import { ShowButton } from "@/shared/components/buttons/show";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { formatDate } from "@/shared/lib/format";
import type { MyPatient } from "@/domains/assignment/types";
import { GENDER_OPTIONS } from "@/domains/customer/types";

/** "Nguyễn Văn Bình" is found by "nguyen van binh" too: accents dropped, case ignored. */
const fold = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();

type PatientFilter = { search: string; device: string; gender: string };
const NO_FILTER: PatientFilter = { search: "", device: "all", gender: "all" };

/**
 * The caseload comes whole, so it is searched and narrowed here: by name,
 * phone or patient code, whether a device is worn, and gender. Run once per
 * column by TanStack; it reads the row, so any column answering is all of them.
 */
const matchesPatient: FilterFn<MyPatient> = (row, _columnId, filter: PatientFilter) => {
  const patient = row.original;
  const term = fold(filter.search);
  if (term && ![patient.fullName, patient.phone ?? "", patient.customerCode].some((v) => fold(v).includes(term))) {
    return false;
  }
  if (filter.device === "wearing" && !patient.device) return false;
  if (filter.device === "none" && patient.device) return false;
  if (filter.gender !== "all" && patient.gender !== filter.gender) return false;
  return true;
};

/**
 * The patients the signed-in doctor or nurse is following. The API answers it
 * from the caller's own assignments, so there is nothing to filter by staff
 * and no way to see somebody else's caseload.
 *
 * An administrator viewing as a member of staff gets the same table from
 * `view_as`: `resource` points it there and `patientPath` links each row to
 * a read-only page. With no such page, `readOnly` drops the link instead, since
 * a patient's own page has actions an onlooker must not reach.
 * `showCareTeam` lists who follows each patient, for the view of every
 * caseload at once, and `employeeId` narrows that view to one person's.
 */
type MyPatientListProps = {
  resource?: string;
  patientPath?: (id: number) => string;
  readOnly?: boolean;
  showCareTeam?: boolean;
  employeeId?: number;
  title?: string;
  description?: string;
};

export const MyPatientList = ({
  resource,
  patientPath,
  readOnly = false,
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
      ...(readOnly && !patientPath
        ? []
        : [
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
          ]),
    ];
  }, [patientPath, readOnly, showCareTeam]);

  const table = useTable({
    columns,
    defaultColumn: RESIZABLE_COLUMN_DEFAULTS,
    // The API answers with the whole caseload at once; paging it here would
    // show page one's rows again on every page.
    // Filtered here, over the whole caseload (see matchesPatient), never sent to the API.
    getFilteredRowModel: getFilteredRowModel(),
    manualFiltering: false,
    globalFilterFn: matchesPatient,
    getColumnCanGlobalFilter: (column) => column.id === "fullName",
    refineCoreProps: {
      resource,
      syncWithLocation: !resource,
      pagination: { mode: "off" },
      filters: employeeId
        ? { permanent: [{ field: "employeeId", operator: "eq", value: employeeId }] }
        : undefined,
    },
  });

  const [filter, setFilter] = useState<PatientFilter>(NO_FILTER);
  const { setGlobalFilter } = table.reactTable;
  useEffect(() => setGlobalFilter(filter), [filter, setGlobalFilter]);
  const filtered = filter.search.trim() !== "" || filter.device !== "all" || filter.gender !== "all";
  const total = table.reactTable.getCoreRowModel().rows.length;
  const shown = table.reactTable.getFilteredRowModel().rows.length;

  return (
    <ListView>
      <ListViewHeader title={title} description={description} />
      <DataTable
        table={table}
        toolbar={
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full max-w-sm">
              <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
              <Input
                aria-label="Tìm bệnh nhân"
                placeholder="Tìm theo tên, số điện thoại, mã bệnh nhân..."
                className="pl-8"
                value={filter.search}
                onChange={(event) => setFilter((current) => ({ ...current, search: event.target.value }))}
              />
            </div>
            <Select value={filter.device} onValueChange={(device) => setFilter((current) => ({ ...current, device }))}>
              <SelectTrigger className="w-44" aria-label="Lọc thiết bị">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả thiết bị</SelectItem>
                <SelectItem value="wearing">Đang đeo thiết bị</SelectItem>
                <SelectItem value="none">Chưa đeo thiết bị</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filter.gender} onValueChange={(gender) => setFilter((current) => ({ ...current, gender }))}>
              <SelectTrigger className="w-36" aria-label="Lọc giới tính">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả giới tính</SelectItem>
                {GENDER_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {filtered && (
              <>
                <Button variant="ghost" size="sm" onClick={() => setFilter(NO_FILTER)}>
                  Xóa bộ lọc
                </Button>
                <span className="text-muted-foreground text-sm" role="status">
                  {shown} / {total} bệnh nhân
                </span>
              </>
            )}
          </div>
        }
      />
    </ListView>
  );
};
