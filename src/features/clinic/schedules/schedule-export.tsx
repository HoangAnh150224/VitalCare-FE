import { useState } from "react";
import { useDataProvider } from "@refinedev/core";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/shared/ui/button";
import type { DoctorAvailability, WorkingHoursEntry } from "@/domains/schedule/types";
import type { ExamRoom } from "@/domains/exam-room/types";

export function ScheduleExport({ doctors }: { doctors: DoctorAvailability[] }) {
  const [busy, setBusy] = useState(false);
  const provider = useDataProvider();
  const exportFile = async () => {
    setBusy(true);
    try {
      const { createTableWorkbook } = await import("@/shared/components/data-table/excel-workbook");
      const rooms = doctors.some((d) => d.workingHours.some((s) => s.examRoomId != null))
        ? (await provider().getList<ExamRoom>({ resource: "exam_rooms", pagination: { mode: "off" } })).data : [];
      const records = doctors.flatMap((doctor) => {
        const sessions = [...doctor.workingHours].sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime));
        return (sessions.length ? sessions : [null]).map((session) => ({ doctor, session }));
      });
      const capacity = (session: WorkingHoursEntry | null) => {
        if (!session || session.visitMinutes <= 0) return "—";
        const minutes = (time: string) => { const [h, m] = time.split(":").map(Number); return h * 60 + m; };
        return Math.floor((minutes(session.endTime) - minutes(session.startTime)) / session.visitMinutes);
      };
      const book = createTableWorkbook(records, true, "Lịch làm việc bác sĩ", [
        { label: "Bác sĩ", width: 30, value: (r) => r.doctor.fullName },
        { label: "Chuyên khoa", width: 22, value: (r) => r.doctor.specialty || "—" },
        { label: "Chức danh", width: 28, value: (r) => r.doctor.professionalTitle || "—" },
        { label: "Thứ", width: 22, value: (r) => r.session ? ["", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy", "Chủ nhật"][r.session.dayOfWeek] : "Chưa thiết lập lịch" },
        { label: "Giờ bắt đầu", width: 16, value: (r) => r.session?.startTime.slice(0, 5) ?? "—" },
        { label: "Giờ kết thúc", width: 16, value: (r) => r.session?.endTime.slice(0, 5) ?? "—" },
        { label: "Phút mỗi lượt", width: 18, value: (r) => r.session?.visitMinutes ?? "—" },
        { label: "Số lượt / buổi", width: 18, value: (r) => capacity(r.session) },
        { label: "Phòng khám", width: 30, value: (r) => {
          const id = r.session?.examRoomId;
          const room = rooms.find((item) => item.id === id);
          return room ? `${room.code} · ${room.name}` : id != null ? `Phòng #${id}` : "Chưa phân phòng";
        } },
      ]);
      const sheet = book.worksheets[0];
      // One identity block per doctor, with one adjacent row per working session.
      let firstRow = 6;
      doctors.forEach((doctor, index) => {
        const rowCount = Math.max(1, doctor.workingHours.length);
        const lastRow = firstRow + rowCount - 1;
        sheet.getCell(firstRow, 1).value = index + 1;
        for (let column = 1; column <= 4; column++) {
          if (lastRow > firstRow) sheet.mergeCells(firstRow, column, lastRow, column);
          sheet.getCell(firstRow, column).alignment = {
            vertical: "middle", horizontal: column === 1 ? "center" : "left", wrapText: true, indent: 1,
          };
        }
        for (let row = firstRow; row <= lastRow; row++) {
          for (let column = 1; column <= 10; column++) {
            sheet.getCell(row, column).fill = {
              type: "pattern", pattern: "solid",
              fgColor: { argb: index % 2 === 0 ? "FFF0F8F7" : "FFFFFFFF" },
            };
          }
        }
        firstRow = lastRow + 1;
      });
      // Sorting individual session rows would split the merged doctor groups.
      sheet.autoFilter = undefined;
      sheet.getCell("A3").value = `Theo bộ lọc hiện tại • ${doctors.length} bác sĩ • ${doctors.reduce((sum, d) => sum + d.workingHours.length, 0)} buổi / tuần`;
      sheet.mergeCells(4, 1, 4, 10);
      sheet.getCell("A4").value = "Lịch lặp lại hằng tuần đã lưu; chưa bao gồm các khoảng chặn nghỉ riêng theo ngày. Giờ hiển thị dạng 24 giờ.";
      sheet.getCell("A4").alignment = { wrapText: true };
      sheet.getRow(4).height = 30;
      const buffer = await book.xlsx.writeBuffer();
      const url = URL.createObjectURL(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = "VitalCare-lich-lam-viec-bac-si.xlsx";
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch { toast.error("Không thể xuất lịch bác sĩ. Vui lòng thử lại."); }
    finally { setBusy(false); }
  };
  return <Button variant="outline" disabled={busy || doctors.length === 0} onClick={() => void exportFile()}><Download className="size-4" />{busy ? "Đang xuất..." : "Xuất Excel"}</Button>;
}
