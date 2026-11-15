import { useTable } from "@refinedev/react-table";
import { createColumnHelper, getFilteredRowModel } from "@tanstack/react-table";
import { Input } from "@/shared/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/shared/ui/select";
import { ShowButton } from "@/shared/components/buttons/show";
import { toast } from "sonner";
import React from "react";
import { useCan, useUpdate } from "@refinedev/core";
import { LockKeyhole, LockKeyholeOpen } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from "@/shared/ui/alert-dialog";

import { actionsColumnWidth, DataTable, RESIZABLE_COLUMN_DEFAULTS } from "@/shared/components/data-table/data-table";
import { ListView, ListViewHeader } from "@/shared/components/views/list-view";
import { EditButton } from "@/shared/components/buttons/edit";
import { Badge } from "@/shared/ui/badge";
import type { MedicalService } from "@/domains/billing/types";
import { SERVICE_CATEGORY_LABELS, SERVICE_STATUS_LABELS } from "@/domains/billing/types";
import { SERVICE_STATUS_VARIANTS } from "@/shared/lib/status-variants";
import { formatMoney } from "@/shared/lib/format";

/** The catalogue of services and their prices, one for every clinic (Report 1 FE-22, FE-23). */
export const MedicalServiceList = () => {
  const [search, setSearch] = React.useState("");
  const [category, setCategory] = React.useState("all");
  const [status, setStatus] = React.useState("all");
  const [exporting, setExporting] = React.useState(false);
  const columns = React.useMemo(() => {
    const col = createColumnHelper<MedicalService>();
    return [
      col.accessor("code", {
        id: "code",
        header: "Mã",
        enableSorting: false,
        cell: ({ getValue }) => <span className="font-mono font-medium">{getValue()}</span>,
      }),
      col.accessor("name", {
        id: "name",
        header: "Dịch vụ",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-medium">{row.original.name}</span>
            <span className="text-muted-foreground text-xs">{SERVICE_CATEGORY_LABELS[row.original.category]}</span>
          </div>
        ),
      }),
      col.accessor("price", {
        id: "price",
        header: "Giá",
        enableSorting: false,
        cell: ({ getValue }) => <span className="tabular-nums">{formatMoney(getValue())}</span>,
      }),
      col.accessor("turnaroundMinutes", {
        id: "turnaroundMinutes",
        header: "Trả kết quả sau",
        enableSorting: false,
        cell: ({ row }) =>
          row.original.category === "consultation" ? (
            <span className="text-muted-foreground">—</span>
          ) : (
            <span className="tabular-nums">{formatMinutes(row.original.turnaroundMinutes)}</span>
          ),
      }),
      col.accessor("status", {
        id: "status",
        header: "Trạng thái",
        enableSorting: false,
        cell: ({ getValue }) => (
          <Badge variant={SERVICE_STATUS_VARIANTS[getValue()]}>{SERVICE_STATUS_LABELS[getValue()]}</Badge>
        ),
      }),
      col.display({
        id: "actions",
        header: "Thao tác",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            <EditButton resource="medical_services" recordItemId={row.original.id} iconOnly size="icon-sm" />
            <ShowButton resource="medical_services" recordItemId={row.original.id} iconOnly size="icon-sm" />
            <ServiceStatusButton service={row.original} />
          </div>
        ),
        ...actionsColumnWidth(3),
      }),
    ];
  }, []);

  const table = useTable({
    columns,
    manualFiltering: false,
    getFilteredRowModel: getFilteredRowModel(),
    state: { globalFilter: { search, category, status } },
    globalFilterFn: (row, _column, filter) => {
      const service = row.original;
      const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase();
      return normalize(`${service.code} ${service.name} ${service.description ?? ""}`).includes(normalize(filter.search.trim())) &&
        (filter.category === "all" || service.category === filter.category) &&
        (filter.status === "all" || service.status === filter.status);
    },
    enableColumnResizing: true,
    columnResizeMode: "onChange",
    defaultColumn: RESIZABLE_COLUMN_DEFAULTS,
    initialState: { columnPinning: { right: ["actions"] } },
    // The catalogue is short and comes whole.
    refineCoreProps: { resource: "medical_services", pagination: { mode: "off" }, syncWithLocation: false },
  });

  const exportFile = async () => {
    setExporting(true);
    try {
      const { createTableWorkbook } = await import("@/shared/components/data-table/excel-workbook");
      const records = table.reactTable.getFilteredRowModel().rows.map((row) => row.original);
      const book = createTableWorkbook(records, true, "Danh sách dịch vụ y tế", [
        { label: "Mã dịch vụ", width: 20, value: (r) => r.code },
        { label: "Tên dịch vụ", width: 40, value: (r) => r.name },
        { label: "Nhóm", width: 26, value: (r) => SERVICE_CATEGORY_LABELS[r.category] },
        { label: "Giá (đồng)", width: 20, value: (r) => Number(r.price) },
        { label: "Trả kết quả sau", width: 24, value: (r) => r.category === "consultation" ? "—" : formatMinutes(r.turnaroundMinutes) },
        { label: "Trạng thái", width: 23, value: (r) => SERVICE_STATUS_LABELS[r.status] },
        { label: "Mô tả", width: 50, value: (r) => r.description ?? "—" },
      ]);
      book.worksheets[0].getColumn(5).numFmt = '#,##0';
      const buffer = await book.xlsx.writeBuffer();
      const url = URL.createObjectURL(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
      const link = document.createElement("a"); link.href = url; link.download = "VitalCare-dich-vu-y-te.xlsx"; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch { toast.error("Không thể xuất Excel. Vui lòng thử lại."); }
    finally { setExporting(false); }
  };

  return (
    <ListView>
      <ListViewHeader
        resource="medical_services"
        createLabel="Thêm dịch vụ"
        description="Dịch vụ y tế và giá, dùng chung cho mọi cơ sở. Bác sĩ chỉ định từ danh mục này trong lần khám."
      />
      <DataTable table={table} toolbar={<div className="flex flex-wrap items-center gap-3">
        <Input className="max-w-md" aria-label="Tìm dịch vụ" placeholder="Tìm theo mã, tên hoặc mô tả dịch vụ..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <Select value={category} onValueChange={setCategory}><SelectTrigger className="w-52" aria-label="Nhóm dịch vụ"><SelectValue /></SelectTrigger><SelectContent>
          <SelectItem value="all">Tất cả nhóm dịch vụ</SelectItem>
          {Object.entries(SERVICE_CATEGORY_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
        </SelectContent></Select>
        <Select value={status} onValueChange={setStatus}><SelectTrigger className="w-48" aria-label="Trạng thái"><SelectValue /></SelectTrigger><SelectContent>
          <SelectItem value="all">Tất cả trạng thái</SelectItem>
          {Object.entries(SERVICE_STATUS_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
        </SelectContent></Select>
        {(search || category !== "all" || status !== "all") && <Button variant="ghost" onClick={() => { setSearch(""); setCategory("all"); setStatus("all"); }}>Xóa bộ lọc</Button>}
        <Button variant="outline" disabled={exporting || table.reactTable.getFilteredRowModel().rows.length === 0} onClick={() => void exportFile()}>{exporting ? "Đang xuất..." : "Xuất Excel"}</Button>
      </div>} />
    </ListView>
  );
};

function ServiceStatusButton({ service }: { service: MedicalService }) {
  const [open, setOpen] = React.useState(false);
  const { data: permission } = useCan({ resource: "medical_services", action: "edit" });
  const { mutate, mutation } = useUpdate();
  const active = service.status === "active";
  const label = active ? "Tạm ngừng" : "Mở lại dịch vụ";
  if (!permission?.can) return null;
  return <>
    <Button variant="ghost" size="icon-sm" title={label} aria-label={`${label}: ${service.name}`} onClick={() => setOpen(true)}>
      {active ? <LockKeyhole className="size-4" /> : <LockKeyholeOpen className="size-4" />}
    </Button>
    <AlertDialog open={open} onOpenChange={(value) => !mutation.isPending && setOpen(value)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{label}</AlertDialogTitle>
          <AlertDialogDescription>
            {active ? `Tạm ngừng dịch vụ “${service.name}”? Dịch vụ sẽ không được chọn cho chỉ định mới. Chỉ định và hóa đơn cũ vẫn được giữ nguyên.` : `Mở lại dịch vụ “${service.name}” để tiếp tục sử dụng cho chỉ định mới?`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={mutation.isPending}>Hủy</AlertDialogCancel>
          <Button disabled={mutation.isPending} onClick={() => mutate({
            resource: "medical_services", id: service.id,
            values: { code: service.code, name: service.name, description: service.description, price: service.price, category: service.category, turnaroundMinutes: service.turnaroundMinutes, status: active ? "inactive" : "active" },
            successNotification: { type: "success", message: active ? "Đã tạm ngừng dịch vụ" : "Đã mở lại dịch vụ" },
            errorNotification: { type: "error", message: "Không cập nhật được trạng thái dịch vụ. Vui lòng thử lại." },
          }, { onSuccess: () => setOpen(false) })}>{mutation.isPending ? "Đang lưu..." : "Xác nhận"}</Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>;
}

function formatMinutes(minutes: number) {
  if (minutes < 60) return `${minutes} phút`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} giờ ${rest} phút` : `${hours} giờ`;
}
