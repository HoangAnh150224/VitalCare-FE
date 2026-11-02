import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRightIcon } from "lucide-react";
import { useEffect } from "react";
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
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { formatDateTime } from "@/shared/lib/format";
import type { Notification } from "@/shared/hooks/use-notifications";

type NotificationDetail = Notification & {
  type: string | null;
  status: string | null;
  sentAt: string | null;
  alertId: number | null;
};

const LEVEL_LABELS: Record<Notification["level"], string> = {
  INFO: "Thông tin",
  SUCCESS: "Thành công",
  WARNING: "Cần chú ý",
  ERROR: "Khẩn",
};

const LEVEL_VARIANTS = {
  INFO: "info",
  SUCCESS: "success",
  WARNING: "warning",
  ERROR: "destructive",
} as const;

const TYPE_LABELS: Record<string, string> = {
  appointment: "Lịch khám",
  payment: "Thanh toán",
  result: "Kết quả",
  chat: "Tin nhắn",
  alert: "Cảnh báo sức khỏe",
  device: "Thiết bị",
};

/**
 * Notification Details (FE-13): what it says, what it is about, when it was
 * sent and read. Opening it marks it read; its link leads on to the record.
 */
export const NotificationShow = () => {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const {
    data: notification,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["notifications", "detail", id],
    queryFn: () =>
      kyInstance.get(`notifications/${id}`).json<NotificationDetail>(),
    enabled: Boolean(id),
  });

  // Opened is read: the bell and the list follow.
  useEffect(() => {
    if (notification && !notification.read) {
      void kyInstance
        .post(`notifications/${notification.id}/read`)
        .then(() =>
          queryClient.invalidateQueries({ queryKey: ["notifications"] })
        )
        .catch(() => undefined);
    }
  }, [notification, queryClient]);

  return (
    <ShowView>
      <ShowViewHeader
        resource="notifications"
        title="Chi tiết thông báo"
        canEdit={false}
      />
      <Card className="gap-3 px-6 py-5">
        {isError ? (
          <p className="text-muted-foreground text-sm">
            Không tìm thấy thông báo này.
          </p>
        ) : isLoading || !notification ? (
          <p className="text-muted-foreground text-sm">Đang tải…</p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={LEVEL_VARIANTS[notification.level]}>
                {LEVEL_LABELS[notification.level]}
              </Badge>
              {notification.type && (
                <Badge variant="secondary">
                  {TYPE_LABELS[notification.type] ?? notification.type}
                </Badge>
              )}
            </div>
            <h2 className="text-xl font-semibold">{notification.title}</h2>
            {notification.body && (
              <p className="whitespace-pre-wrap">{notification.body}</p>
            )}
            {notification.link && (
              <Button asChild className="self-start">
                <Link to={notification.link}>
                  Xem chi tiết
                  <ArrowRightIcon />
                </Link>
              </Button>
            )}
          </>
        )}
      </Card>
      <DetailPanel title="Gửi và đọc">
        <DetailList>
          <DetailRow label="Tạo lúc">
            {formatDateTime(notification?.createdAt)}
          </DetailRow>
          <DetailRow label="Trạng thái gửi">
            {notification?.status === "SENT" ? (
              `Đã gửi · ${formatDateTime(notification.sentAt)}`
            ) : (
              <EmptyValue />
            )}
          </DetailRow>
          <DetailRow label="Đã đọc">
            {notification?.readAt ? (
              formatDateTime(notification.readAt)
            ) : (
              <EmptyValue>Chưa đọc</EmptyValue>
            )}
          </DetailRow>
        </DetailList>
      </DetailPanel>
    </ShowView>
  );
};
