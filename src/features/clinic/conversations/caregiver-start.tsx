import { useNotification } from "@refinedev/core";
import { useQuery } from "@tanstack/react-query";
import { MessageCircleIcon } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";

import { kyInstance } from "@/shared/api/data";
import { publicGet } from "@/shared/api/public";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Textarea } from "@/shared/ui/textarea";
import type { ChatThread, OwnConversation } from "@/domains/chat/types";
import { CHAT_TEXT_MAX, chatErrorText } from "@/domains/chat/types";
import type { PublicClinic } from "@/domains/public-site/types";

/**
 * BF-06 on a shared patient's page: the caregiver writes to a clinic that
 * looks after them. The conversation is the caregiver's, about this patient,
 * and lasts only as long as the patient keeps sharing.
 */
export function CaregiverStart({ customerId, name }: { customerId: number; name: string }) {
  const navigate = useNavigate();
  const { open } = useNotification();
  const { data: ids } = useQuery({
    queryKey: ["my-conversations", "clinics", customerId],
    queryFn: () =>
      kyInstance
        .get("my_conversations/clinics", { searchParams: { aboutCustomerId: String(customerId) } })
        .json<string[]>(),
  });
  const { data: all } = useQuery({
    queryKey: ["public", "clinics"],
    queryFn: () => publicGet<PublicClinic[]>("clinics"),
    staleTime: 60_000,
  });
  const clinics = (all ?? []).filter((c) => ids?.includes(c.id));
  const [clinicId, setClinicId] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const chosen = clinicId || (clinics.length === 1 ? clinics[0].id : "");

  const start = async () => {
    if (!chosen || !text.trim()) return;
    setBusy(true);
    try {
      const thread = await kyInstance
        .post("my_conversations", { json: { clinicId: chosen, text: text.trim(), aboutCustomerId: customerId } })
        .json<ChatThread<OwnConversation>>();
      navigate(`/my-conversations/${thread.conversation.id}`);
    } catch (error) {
      open?.({ type: "error", message: chatErrorText(error as { message?: string }) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="gap-3 px-5 py-4" data-testid="caregiver-start">
      <h2 className="flex items-center gap-2 font-semibold">
        <MessageCircleIcon className="size-4" />
        Nhắn phòng khám về {name}
      </h2>
      {ids && clinics.length === 0 ? (
        <p className="text-muted-foreground text-sm">Chưa có phòng khám nào đang khám hoặc theo dõi người này.</p>
      ) : (
        <>
          <Select value={chosen} onValueChange={setClinicId}>
            <SelectTrigger className="w-full" aria-label="Phòng khám">
              <SelectValue placeholder="Chọn phòng khám" />
            </SelectTrigger>
            <SelectContent>
              {clinics.map((clinic) => (
                <SelectItem key={clinic.id} value={clinic.id}>
                  {clinic.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={3}
            maxLength={CHAT_TEXT_MAX}
            placeholder={`Bạn muốn hỏi phòng khám gì về ${name}?`}
            aria-label="Nội dung tin nhắn"
          />
          <Button className="w-fit" onClick={() => void start()} disabled={busy || !chosen || !text.trim()}>
            Gửi tin nhắn
          </Button>
        </>
      )}
    </Card>
  );
}
