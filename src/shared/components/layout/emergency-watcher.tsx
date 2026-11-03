import { useMutation } from "@tanstack/react-query";
import { SirenIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router";

import { kyInstance } from "@/shared/api/data";
import { NOTIFICATIONS, subscribe } from "@/shared/api/live";
import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";

type Pushed = {
  type?: string | null;
  title: string;
  body?: string | null;
  link?: string | null;
  createdAt?: string;
};

/** The escalation delay the server applies (app.escalation.delay); shown as a countdown. */
const DELAY_S = 30;

/**
 * BF-06 Popup Alert for a caregiver: an emergency notification opens a dialog
 * at once, counting down to the call the server will place, with "Tôi đã biết"
 * to acknowledge it there and then.
 */
export function EmergencyWatcher() {
  const [notice, setNotice] = useState<{
    id: number;
    title: string;
    body: string;
    at: number;
  } | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [done, setDone] = useState(false);

  useEffect(
    () =>
      subscribe(NOTIFICATIONS, (raw) => {
        const n = raw as Pushed;
        const id = Number(n.link?.match(/^\/emergency\/(\d+)/)?.[1]);
        if (n.type === "emergency" && id) {
          setDone(false);
          setNotice({
            id,
            title: n.title,
            body: n.body ?? "",
            at: n.createdAt ? Date.parse(n.createdAt) : Date.now(),
          });
        }
      }),
    []
  );
  useEffect(() => {
    if (!notice) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [notice]);
  const ack = useMutation({
    mutationFn: (id: number) =>
      kyInstance.post(`emergency_alerts/${id}/acknowledge`).json(),
    onSuccess: () => setDone(true),
  });

  if (!notice) return null;
  const left = Math.max(0, DELAY_S - Math.floor((now - notice.at) / 1000));
  return (
    <Dialog open onOpenChange={(open) => !open && setNotice(null)}>
      <DialogContent
        className="border-destructive"
        data-testid="emergency-popup"
      >
        <DialogHeader>
          <DialogTitle className="text-destructive flex items-center gap-2">
            <SirenIcon className="size-5" />
            {notice.title}
          </DialogTitle>
          <DialogDescription>{notice.body}</DialogDescription>
        </DialogHeader>
        {done ? (
          <p className="text-sm font-medium">
            Đã xác nhận. Hãy liên hệ người bệnh ngay.
          </p>
        ) : (
          <p className="text-sm" data-testid="emergency-countdown">
            {left > 0
              ? `Hệ thống sẽ gọi số khẩn cấp sau ${left} giây nếu bạn chưa xác nhận.`
              : "Đã quá thời gian: hệ thống đang gọi số khẩn cấp."}
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" asChild>
            <Link
              to={`/emergency/${notice.id}`}
              onClick={() => setNotice(null)}
            >
              Xem chi tiết
            </Link>
          </Button>
          {!done && (
            <Button
              variant="destructive"
              onClick={() => ack.mutate(notice.id)}
              disabled={ack.isPending}
            >
              Tôi đã biết
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
