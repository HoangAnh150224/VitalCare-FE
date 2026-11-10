import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router";

import { kyInstance } from "@/shared/api/data";
import { ShowView, ShowViewHeader } from "@/shared/components/views/show-view";
import {
  DetailList,
  DetailPanel,
  DetailRow,
  EmptyValue,
} from "@/shared/components/views/record-detail";
import { Badge } from "@/shared/ui/badge";
import { formatDateTime } from "@/shared/lib/format";
import { SYNC_SOURCE_LABELS } from "@/domains/device/sync";
import {
  SESSION_STATUS_LABELS,
  type VitalDetail,
} from "@/domains/vitals/types";

/** Measurement Details (FE-04): one reading, where it came from and which sitting it was part of. */
export const VitalSignShow = () => {
  const { id } = useParams();
  const { data: v, isError } = useQuery({
    queryKey: ["vital_signs", "detail", id],
    queryFn: () => kyInstance.get(`vital_signs/${id}`).json<VitalDetail>(),
    enabled: Boolean(id),
  });

  return (
    <ShowView>
      <ShowViewHeader
        resource="vital_signs"
        title="Chi tiết số đo"
        canEdit={false}
      />
      {isError ? (
        <p className="text-muted-foreground text-sm">
          Không tìm thấy số đo này.
        </p>
      ) : (
        <div className="grid min-w-0 gap-4 lg:grid-cols-2">
          <DetailPanel title="Số đo">
            <DetailList>
              <DetailRow label="Thời điểm đo">
                {formatDateTime(v?.measuredAt)}
              </DetailRow>
              <DetailRow label="Nhịp tim">
                {v?.heartRate != null ? `${v.heartRate} bpm` : <EmptyValue />}
              </DetailRow>
              <DetailRow label="SpO₂">
                {v?.spo2 != null ? `${Number(v.spo2)}%` : <EmptyValue />}
              </DetailRow>
              <DetailRow label="Nhiệt độ da">
                {v?.skinTemperature != null ? (
                  `${Number(v.skinTemperature).toFixed(2)} °C`
                ) : (
                  <EmptyValue />
                )}
              </DetailRow>
              <DetailRow label="Nhiệt độ cơ thể (ước tính)">
                {v?.bodyTemperature != null ? (
                  `${Number(v.bodyTemperature).toFixed(2)} °C`
                ) : (
                  <EmptyValue />
                )}
              </DetailRow>
              <DetailRow label="Hợp lệ">
                {v ? (
                  v.validationStatus === "VALID" ? (
                    <Badge variant="success">Hợp lệ</Badge>
                  ) : (
                    <span className="flex flex-col gap-1">
                      <Badge variant="destructive" className="self-start">
                        Không hợp lệ
                      </Badge>
                      <span className="text-muted-foreground text-xs">
                        {v.validationError}
                      </span>
                    </span>
                  )
                ) : (
                  <EmptyValue />
                )}
              </DetailRow>
            </DetailList>
          </DetailPanel>
          <DetailPanel title="Nguồn">
            <DetailList>
              <DetailRow label="Bệnh nhân">
                {v?.customerId ? (
                  <Link
                    to={`/vital-signs/patient/${v.customerId}`}
                    className="hover:underline"
                  >
                    {v.customerName}
                  </Link>
                ) : (
                  <EmptyValue />
                )}
              </DetailRow>
              <DetailRow label="Thiết bị">
                {v?.deviceId ? (
                  <Link
                    to={`/devices/show/${v.deviceId}`}
                    className="font-mono hover:underline"
                  >
                    {v.deviceCode}
                  </Link>
                ) : (
                  <EmptyValue />
                )}
              </DetailRow>
              <DetailRow label="Gửi qua">
                {v ? SYNC_SOURCE_LABELS[v.source] ?? v.source : <EmptyValue />}
              </DetailRow>
              <DetailRow label="Nhận lúc">
                {formatDateTime(v?.receivedAt)}
              </DetailRow>
              <DetailRow label="Mã bản ghi">
                {v?.clientRecordId ? (
                  <span className="font-mono text-xs break-all">
                    {v.clientRecordId}
                  </span>
                ) : (
                  <EmptyValue />
                )}
              </DetailRow>
              <DetailRow label="Phiên đo">
                {v?.sessionId ? (
                  `${
                    v.sessionStatus
                      ? SESSION_STATUS_LABELS[v.sessionStatus]
                      : ""
                  } · ${formatDateTime(v.sessionStartedAt)}${
                    v.sessionEndedAt
                      ? ` → ${formatDateTime(v.sessionEndedAt)}`
                      : ""
                  }`
                ) : (
                  <EmptyValue>Không thuộc phiên đo</EmptyValue>
                )}
              </DetailRow>
            </DetailList>
          </DetailPanel>
        </div>
      )}
    </ShowView>
  );
};
