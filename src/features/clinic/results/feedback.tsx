import { useCan, useNotification } from "@refinedev/core";
import { Link, useNavigate, useParams } from "react-router";
import { Label } from "@/shared/ui/label";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { StarIcon } from "lucide-react";
import { useState } from "react";

import { kyInstance } from "@/shared/api/data";
import { ListView, ListViewHeader } from "@/shared/components/views/list-view";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import { cn } from "@/shared/lib/utils";
import { formatDateTime, formatLocalDate } from "@/shared/lib/format";
import { resultsErrorText, type PatientFeedback } from "@/domains/results/types";
import { refusal, send } from "./send";
import { useSearchOnEnter } from "@/shared/hooks/use-search-on-enter";

export function Stars({
  value,
  onChange,
  size = "size-5",
}: {
  value: number;
  onChange?: (v: number) => void;
  size?: string;
}) {
  return (
    <div className="flex gap-0.5" role={onChange ? "radiogroup" : undefined} aria-label={`${value} trên 5 sao`}>
      {[1, 2, 3, 4, 5].map((n) => {
        const star = (
          <StarIcon
            aria-hidden
            className={cn(size, n <= value ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40")}
          />
        );
        return onChange ? (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={n === value}
            aria-label={`${n} sao`}
            onClick={() => onChange(n)}
          >
            {star}
          </button>
        ) : (
          <span key={n}>{star}</span>
        );
      })}
    </div>
  );
}

/** FE-07 on a completed visit in the portal: the patient's rating and comment, given once and editable. */
export function MyFeedbackCard({ appointmentId }: { appointmentId: number }) {
  const queryClient = useQueryClient();
  const { open: notify } = useNotification();
  const { data } = useQuery({
    queryKey: ["my_feedback"],
    queryFn: () => kyInstance.get("my_feedback").json<PatientFeedback[]>(),
  });
  const mine = (data ?? []).find((f) => f.appointmentId === appointmentId);
  const [editing, setEditing] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const save = useMutation({
    mutationFn: () =>
      mine
        ? send("put", `my_feedback/${mine.id}`, { rating, comment })
        : send("post", "my_feedback", { appointmentId, rating, comment }),
    onSuccess: () => {
      setEditing(false);
      setError(null);
      notify?.({ type: "success", message: "Cảm ơn bạn đã góp ý" });
      void queryClient.invalidateQueries({ queryKey: ["my_feedback"] });
    },
    onError: (e) => setError(resultsErrorText(refusal(e))),
  });
  const startEdit = () => {
    setRating(mine?.rating ?? 0);
    setComment(mine?.comment ?? "");
    setEditing(true);
  };
  const form = editing || !mine;

  return (
    <section className="card-soft flex flex-col gap-3 p-5" data-testid="my-feedback">
      <h2 className="text-base font-semibold">Góp ý về lượt khám</h2>
      {form ? (
        <>
          <Stars value={rating} onChange={setRating} size="size-7" />
          <Textarea
            aria-label="Nhận xét"
            placeholder="Bạn thấy lượt khám thế nào?"
            value={comment}
            maxLength={2000}
            onChange={(e) => setComment(e.target.value)}
          />
          {error && (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <Button className="rounded-full" disabled={rating === 0 || save.isPending} onClick={() => save.mutate()}>
              {mine ? "Lưu góp ý" : "Gửi góp ý"}
            </Button>
            {mine && (
              <Button variant="outline" className="rounded-full" onClick={() => setEditing(false)}>
                Huỷ
              </Button>
            )}
          </div>
        </>
      ) : (
        <>
          <Stars value={mine.rating} />
          {mine.comment && <p className="text-muted-foreground text-sm whitespace-pre-line">{mine.comment}</p>}
          <Button variant="outline" size="sm" className="w-fit rounded-full" onClick={startEdit}>
            Sửa góp ý
          </Button>
        </>
      )}
      {mine?.reply && <div className="rounded border p-4"><h3 className="font-semibold">Phản hồi từ phòng khám</h3><p className="whitespace-pre-wrap">{mine.reply}</p>{mine.repliedAt && <p className="text-sm text-muted-foreground">{formatDateTime(mine.repliedAt)}</p>}</div>}
    </section>
  );
}

/** FE-07 for the clinic: what patients said about their visits. */
export const FeedbackList = () => {
  const [rating, setRating] = useState(0);
  const { term: q, inputProps } = useSearchOnEnter();
  const { data, isLoading } = useQuery({
    queryKey: ["feedback", rating, q],
    queryFn: () => {
      const searchParams = new URLSearchParams({ _end: "500" });
      if (rating) searchParams.append("rating", String(rating));
      if (q.trim()) searchParams.append("q", q.trim());
      return kyInstance.get("feedback", { searchParams }).json<PatientFeedback[]>();
    },
  });
  const rows = data ?? [];
  const activeRows = rows.filter((f) => !f.deleted);
  const average = activeRows.length ? activeRows.reduce((s, f) => s + f.rating, 0) / activeRows.length : null;

  return (
    <ListView>
      <ListViewHeader resource="feedback" title="Góp ý của bệnh nhân" canCreate={false} />
      <div className="flex flex-wrap items-center gap-3">
        <Input
          aria-label="Tìm theo bệnh nhân hoặc nội dung"
          placeholder="Tìm theo bệnh nhân hoặc nội dung"
          className="max-w-xs"
          {...inputProps}
        />
        <div className="flex gap-1" role="group" aria-label="Số sao">
          {[0, 5, 4, 3, 2, 1].map((n) => (
            <Button key={n} size="sm" variant={rating === n ? "default" : "outline"} onClick={() => setRating(n)}>
              {n ? `${n} sao` : "Tất cả"}
            </Button>
          ))}
        </div>
        {average != null && (
          <span className="text-muted-foreground text-sm" data-testid="feedback-average">
            Trung bình {average.toLocaleString("vi-VN", { maximumFractionDigits: 1 })}/5 · {activeRows.length} góp ý chưa xóa
          </span>
        )}
      </div>
      {!isLoading && rows.length === 0 ? (
        <Card className="text-muted-foreground px-6 py-8 text-center text-sm">Chưa có góp ý nào.</Card>
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map((f) => (
            <Card key={f.id} className="gap-2 px-5 py-4" data-testid={`feedback-${f.id}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium">{f.customerName}</span>
                {f.deleted && <span className="rounded bg-muted px-3 py-1 text-sm text-muted-foreground">Đã xóa{f.deletedAt ? ` · ${formatDateTime(f.deletedAt)}` : ""}</span>}
                <Stars value={f.rating} size="size-4" />
              </div>
              <p className="text-muted-foreground text-xs">
                Lượt khám {formatLocalDate(f.appointmentDate)}
                {f.doctorName ? ` · BS ${f.doctorName}` : ""} · gửi {formatDateTime(f.createdAt)}
              </p>
              {f.comment && <p className="text-sm whitespace-pre-line">{f.comment}</p>}
              <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">{f.reply ? "Đã phản hồi" : "Chưa phản hồi"}</span><Button asChild variant="outline" size="sm"><Link to={`/feedback/show/${f.id}`}>Xem chi tiết</Link></Button></div>
            </Card>
          ))}
        </div>
      )}
    </ListView>
  );
};

export function FeedbackShow() {
  const { id } = useParams();
  const navigate = useNavigate();
  const cache = useQueryClient();
  const { open: notify } = useNotification();
  const { data: write } = useCan({ resource: "feedback", action: "edit" });
  const { data: remove } = useCan({ resource: "feedback", action: "delete" });
  const [reply, setReply] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const { data, isLoading, isError } = useQuery({ queryKey: ["feedback", id], queryFn: () => kyInstance.get(`feedback/${id}`).json<PatientFeedback>() });
  const action = useMutation({
    mutationFn: (deleting: boolean) => send(deleting ? "delete" : "put", deleting ? `feedback/${id}` : `feedback/${id}/reply`, deleting ? { reason: reason.trim() } : { reply: (reply ?? data?.reply ?? "").trim() }),
    onSuccess: (_, deleting) => {
      void cache.invalidateQueries({ queryKey: ["feedback"] });
      void cache.invalidateQueries({ queryKey: ["my_feedback"] });
      setError("");
      notify?.({ type: "success", message: deleting ? "Đã xóa góp ý không phù hợp" : "Đã lưu phản hồi cho bệnh nhân" });
      if (deleting) navigate("/feedback");
    },
    onError: () => setError("Không thực hiện được thao tác. Vui lòng kiểm tra quyền và thử lại."),
  });
  return <ListView>
    <div className="flex items-center gap-3"><Button variant="ghost" aria-label="Quay lại danh sách" onClick={() => navigate("/feedback")}>←</Button><h1 className="text-3xl font-bold">Chi tiết góp ý</h1></div>
    {isLoading ? <p>Đang tải...</p> : isError || !data ? <p role="alert">Không tìm thấy góp ý hoặc bạn không có quyền xem.</p> : <>
      <Card className="gap-3 p-6"><h2 className="text-xl font-semibold">{data.customerName}</h2><Stars value={data.rating} /><p>Lượt khám: {formatLocalDate(data.appointmentDate)} · Bác sĩ: {data.doctorName ?? "—"}</p><p className="text-sm text-muted-foreground">Gửi lúc {formatDateTime(data.createdAt)}</p><p className="whitespace-pre-wrap">{data.comment || "Không có nội dung nhận xét."}</p></Card>
      {data.deleted && <Card className="gap-2 p-6"><h2 className="font-semibold">Đã xóa{data.deletedAt ? ` · ${formatDateTime(data.deletedAt)}` : ""}</h2><p className="whitespace-pre-wrap">Lý do: {data.removalReason || "—"}</p><p className="text-sm text-muted-foreground">Góp ý này chỉ có thể xem chi tiết.</p></Card>}
      <Card className="gap-3 p-6"><Label htmlFor="feedback-reply">Phản hồi của phòng khám</Label>
        {write?.can && !data.deleted ? <><Textarea id="feedback-reply" placeholder="Nhập phản hồi cho bệnh nhân..." maxLength={2000} value={reply ?? data.reply ?? ""} onChange={(e) => setReply(e.target.value)} /><Button className="w-fit" disabled={action.isPending || !(reply ?? data.reply ?? "").trim()} onClick={() => action.mutate(false)}>Lưu phản hồi</Button></> : <p className="whitespace-pre-wrap">{data.reply || "Chưa có phản hồi."}</p>}
        {data.repliedAt && <p className="text-sm text-muted-foreground">Phản hồi lúc {formatDateTime(data.repliedAt)}</p>}
      </Card>
      {remove?.can && !data.deleted && <Card className="gap-3 p-6">{!confirmDelete ? <Button variant="outline" className="w-fit text-destructive" onClick={() => setConfirmDelete(true)}>Xóa góp ý không phù hợp</Button> : <><Label htmlFor="feedback-reason">Lý do xóa <span className="text-destructive">*</span></Label><Textarea id="feedback-reason" required maxLength={500} placeholder="Nhập lý do góp ý không phù hợp..." value={reason} onChange={(e) => setReason(e.target.value)} /><p className="text-sm">Góp ý vẫn hiển thị trong danh sách quản lý với trạng thái Đã xóa và chỉ cho xem chi tiết.</p><div className="flex gap-2"><Button variant="destructive" disabled={action.isPending || !reason.trim()} onClick={() => action.mutate(true)}>Xác nhận xóa</Button><Button variant="outline" disabled={action.isPending} onClick={() => setConfirmDelete(false)}>Hủy</Button></div></>}</Card>}
      {error && <p role="alert" className="text-destructive">{error}</p>}
    </>}
  </ListView>;
}
