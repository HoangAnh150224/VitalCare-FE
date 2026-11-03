import { useNotification } from "@refinedev/core";
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
    </section>
  );
}

/** FE-07 for the clinic: what patients said about their visits. */
export const FeedbackList = () => {
  const [rating, setRating] = useState(0);
  const [q, setQ] = useState("");
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
  const average = rows.length ? rows.reduce((s, f) => s + f.rating, 0) / rows.length : null;

  return (
    <ListView>
      <ListViewHeader resource="feedback" title="Góp ý của bệnh nhân" canCreate={false} />
      <div className="flex flex-wrap items-center gap-3">
        <Input
          aria-label="Tìm theo bệnh nhân hoặc nội dung"
          placeholder="Tìm theo bệnh nhân hoặc nội dung"
          className="max-w-xs"
          value={q}
          onChange={(e) => setQ(e.target.value)}
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
            Trung bình {average.toLocaleString("vi-VN", { maximumFractionDigits: 1 })}/5 · {rows.length} góp ý
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
                <Stars value={f.rating} size="size-4" />
              </div>
              <p className="text-muted-foreground text-xs">
                Lượt khám {formatLocalDate(f.appointmentDate)}
                {f.doctorName ? ` · BS ${f.doctorName}` : ""} · gửi {formatDateTime(f.createdAt)}
              </p>
              {f.comment && <p className="text-sm whitespace-pre-line">{f.comment}</p>}
            </Card>
          ))}
        </div>
      )}
    </ListView>
  );
};
