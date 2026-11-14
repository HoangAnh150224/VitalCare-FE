import { useCan } from "@refinedev/core";
import { useTable } from "@refinedev/react-table";
import { createColumnHelper } from "@tanstack/react-table";
import { PlusIcon } from "lucide-react";
import React, { useState } from "react";
import { Link } from "react-router";

import {
  actionsColumnWidth,
  DataTable,
  RESIZABLE_COLUMN_DEFAULTS,
} from "@/shared/components/data-table/data-table";
import { ListView, ListViewHeader } from "@/shared/components/views/list-view";
import { DeleteButton } from "@/shared/components/buttons/delete";
import { EditButton } from "@/shared/components/buttons/edit";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import type { DoctorSchedule } from "@/domains/schedule/types";
import { formatLocalDate, formatLocalTime } from "@/shared/lib/format";
import { clinicToday } from "../appointments/clinic-day";
import { doctorLabel } from "../appointments/doctor-day";
import { useOwnClinicDoctors } from "./use-doctors";
import { WorkingHoursEditor } from "./working-hours-editor";
import { getAuthorities } from "@/shared/api/session";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { Card } from "@/shared/ui/card";

/**
 * A doctor's schedule (SRS 3.11.7): the week they work, repeating, and under
 * it the periods they have blocked.
 *
 * Everybody at the clinic reads it. A doctor changes their own; the clinic
 * administrator, any doctor's.
 */
export const DoctorScheduleList = () => {
  const { doctors, isLoading, isError, refetch } = useOwnClinicDoctors();
  const chooseDoctorFirst = getAuthorities()?.roles.includes("CLINIC_ADMIN") ?? false;
  const [search, setSearch] = useState("");
  const { data: canWrite } = useCan({ resource: "doctor_schedules", action: "edit" });
  const [chosen, setChosen] = useState("");
  const [from, setFrom] = useState(clinicToday());

  // Clinic administrators choose a doctor first; doctors open their own schedule.
  const selectedId = chosen || (chooseDoctorFirst ? "" : String((doctors.find((doctor) => doctor.manageable) ?? doctors[0])?.id ?? ""));
  const doctor = doctors.find((candidate) => String(candidate.id) === selectedId);
  const term = search.trim().toLocaleLowerCase("vi-VN");
  const visibleDoctors = doctors.filter((item) => doctorLabel(item).toLocaleLowerCase("vi-VN").includes(term));

  const columns = React.useMemo(() => {
    const columnHelper = createColumnHelper<DoctorSchedule>();
    return [
      columnHelper.accessor("workDate", {
        id: "workDate",
        header: "Ngày",
        enableSorting: true,
        cell: ({ getValue }) => <span className="text-sm tabular-nums">{formatLocalDate(getValue())}</span>,
      }),
      columnHelper.display({
        id: "time",
        header: "Khoảng thời gian",
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-sm tabular-nums">
            {formatLocalTime(row.original.startTime)} – {formatLocalTime(row.original.endTime)}
          </span>
        ),
      }),
      columnHelper.accessor("note", {
        id: "note",
        header: "Lý do",
        enableSorting: false,
        cell: ({ getValue }) => <span className="text-sm">{getValue() ?? "Không khả dụng"}</span>,
      }),
      columnHelper.display({
        id: "actions",
        header: "Thao tác",
        enableSorting: false,
        cell: ({ row }) =>
          row.original._can?.write === false ? null : (
            <div className="flex items-center gap-1">
              <EditButton resource="doctor_schedules" recordItemId={row.original.id} iconOnly size="icon-sm" />
              <DeleteButton resource="doctor_schedules" recordItemId={row.original.id} iconOnly size="icon-sm" />
            </div>
          ),
        ...actionsColumnWidth(2),
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
      resource: "doctor_schedules",
      syncWithLocation: false,
      queryOptions: { enabled: Boolean(selectedId) },
      filters: {
        permanent: [
          { field: "employee.id", operator: "eq", value: selectedId },
          { field: "workDate", operator: "gte", value: from },
        ],
      },
    },
  });

  return (
    <ListView>
      <ListViewHeader
        resource="doctor_schedules"
        title={doctor ? `Lịch làm việc · ${doctor.fullName}` : "Lịch làm việc bác sĩ"}
        canCreate={false}
        description={chooseDoctorFirst && !doctor ? "Chọn bác sĩ trong cơ sở để xem và quản lý lịch làm việc." : "Giờ làm việc lặp lại hằng tuần và các khoảng thời gian không nhận khám của bác sĩ được chọn."}
        actions={
          (!chooseDoctorFirst || doctor) && (
          <div className="flex flex-wrap gap-2">
          {chooseDoctorFirst && <Button variant="outline" onClick={() => setChosen("")}>Danh sách bác sĩ</Button>}
          <Select value={selectedId} onValueChange={setChosen}>
            <SelectTrigger className="w-72" aria-label="Bác sĩ">
              <SelectValue placeholder="Chọn bác sĩ" />
            </SelectTrigger>
            <SelectContent>
              {doctors.map((option) => (
                <SelectItem key={option.id} value={String(option.id)}>
                  {doctorLabel(option)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          </div>
          )
        }
      />

      {isLoading ? <p role="status">Đang tải danh sách bác sĩ...</p> : isError ? (
        <div role="alert">Không tải được danh sách bác sĩ. <Button variant="outline" onClick={refetch}>Thử lại</Button></div>
      ) : chooseDoctorFirst && !doctor ? (
        <Card className="overflow-hidden p-0">
          <div className="p-4">
            <Input aria-label="Tìm bác sĩ" placeholder="Tìm theo tên hoặc chuyên khoa bác sĩ..." value={search} onChange={(event) => setSearch(event.target.value)} className="max-w-lg" />
          </div>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Bác sĩ</TableHead><TableHead>Chuyên khoa</TableHead><TableHead>Chức danh</TableHead><TableHead>Lịch hằng tuần</TableHead><TableHead>Thao tác</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {visibleDoctors.map((item) => <TableRow key={item.id}>
                <TableCell className="font-medium">{item.fullName}</TableCell>
                <TableCell>{item.specialty || "—"}</TableCell>
                <TableCell>{item.professionalTitle || "—"}</TableCell>
                <TableCell>{item.workingHours.length ? `${item.workingHours.length} buổi / tuần` : "Chưa thiết lập"}</TableCell>
                <TableCell><Button variant="outline" size="sm" onClick={() => setChosen(String(item.id))}>Xem lịch làm việc<span className="sr-only"> của {item.fullName}</span></Button></TableCell>
              </TableRow>)}
              {visibleDoctors.length === 0 && <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">{doctors.length ? "Không tìm thấy bác sĩ phù hợp." : "Cơ sở chưa có bác sĩ nào đang làm việc."}</TableCell></TableRow>}
            </TableBody>
          </Table>
        </Card>
      ) : doctor ? (
        <>
          <WorkingHoursEditor
            // A fresh editor per doctor: one doctor's unsaved rows must not follow to the next.
            key={doctor.id}
            doctor={doctor}
            editable={(canWrite?.can ?? false) && doctor.manageable === true}
            onSaved={refetch}
          />
          <DataTable
            table={table}
            toolbar={
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">Chặn khoảng thời gian</span>
                  <Input
                    type="date"
                    aria-label="Từ ngày"
                    title="Từ ngày"
                    className="w-40"
                    value={from}
                    // Never empty: clearing it goes back to today.
                    onChange={(event) => setFrom(event.target.value || clinicToday())}
                  />
                </div>
                {/* Not the header's Create: that one would not know which doctor. */}
                {(canWrite?.can ?? false) && doctor.manageable === true && (
                  <Button asChild size="sm" variant="outline">
                    <Link to={`/doctor-schedules/create?doctorId=${doctor.id}`}>
                      <PlusIcon />
                      Chặn khoảng thời gian
                    </Link>
                  </Button>
                )}
              </div>
            }
          />
        </>
      ) : (
        <p className="text-muted-foreground text-sm">Cơ sở chưa có bác sĩ nào đang làm việc.</p>
      )}
    </ListView>
  );
};
