import { useShow } from "@refinedev/core";
import { useNavigate } from "react-router";
import { ArrowLeftIcon } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { EditButton } from "@/shared/components/buttons/edit";
import { formatMoney } from "@/shared/lib/format";
import { SERVICE_CATEGORY_LABELS, SERVICE_STATUS_LABELS, type MedicalService } from "@/domains/billing/types";

export function MedicalServiceShow() {
  const navigate = useNavigate();
  const { query } = useShow<MedicalService>({ resource: "medical_services" });
  const service = query.data?.data;
  return <div className="flex flex-col gap-5">
    <div className="flex items-center gap-3">
      <Button variant="ghost" size="icon" aria-label="Quay lại danh sách" title="Quay lại danh sách" onClick={() => navigate("/medical-services")}><ArrowLeftIcon /></Button>
      <h1 className="flex-1 text-3xl font-bold">Chi tiết dịch vụ y tế</h1>
      {service && <EditButton resource="medical_services" recordItemId={service.id} />}
    </div>
    <Card className="p-6">
      {query.isLoading ? <p role="status">Đang tải dịch vụ...</p> : query.isError || !service ? <p role="alert">Không tìm thấy dịch vụ hoặc không thể tải dữ liệu. Vui lòng thử lại.</p> : <dl className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[
          ["Mã dịch vụ", service.code], ["Tên dịch vụ", service.name],
          ["Nhóm", SERVICE_CATEGORY_LABELS[service.category]], ["Giá", formatMoney(service.price)],
          ["Trạng thái", SERVICE_STATUS_LABELS[service.status]],
          ["Thời gian trả kết quả", service.category === "consultation" ? "Không áp dụng" : `${service.turnaroundMinutes} phút`],
        ].map(([label, value]) => <div key={label}><dt className="mb-2 text-sm text-muted-foreground">{label}</dt><dd className="break-words font-medium">{value}</dd></div>)}
        <div className="sm:col-span-2 lg:col-span-3"><dt className="mb-2 text-sm text-muted-foreground">Mô tả</dt><dd className="whitespace-pre-wrap break-words">{service.description || "Chưa có mô tả"}</dd></div>
      </dl>}
    </Card>
  </div>;
}
