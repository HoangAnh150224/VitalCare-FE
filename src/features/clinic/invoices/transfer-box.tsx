import { CheckIcon, CopyIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/shared/ui/button";
import type { TransferInstructions } from "@/domains/billing/types";
import { formatMoney } from "@/shared/lib/format";

/**
 * Paying by bank transfer: a VietQR code any banking app can scan, with the
 * amount and the content already filled in, and the same details to copy for
 * whoever types them. The content is what ties the money to this bill.
 */
export function TransferBox({ transfer }: { transfer: TransferInstructions }) {
  const qr =
    `https://img.vietqr.io/image/${encodeURIComponent(transfer.bank)}-${encodeURIComponent(transfer.accountNumber)}-compact2.png` +
    `?amount=${transfer.amount}&addInfo=${encodeURIComponent(transfer.content)}&accountName=${encodeURIComponent(transfer.accountName)}`;
  const rows: [string, string, boolean][] = [
    ["Ngân hàng", transfer.bankName ?? transfer.bank, false],
    ["Số tài khoản", transfer.accountNumber, true],
    ["Chủ tài khoản", transfer.accountName, false],
    ["Số tiền", formatMoney(transfer.amount), false],
    ["Nội dung", transfer.content, true],
  ];

  return (
    <div className="flex flex-col gap-3 rounded-2xl border p-4">
      <div className="flex flex-col gap-0.5">
        <span className="font-semibold">Chuyển khoản bằng mã QR</span>
        <span className="text-muted-foreground text-xs">
          Mở app ngân hàng, quét mã. Giữ đúng nội dung <strong>{transfer.content}</strong>; hóa đơn tự xác nhận sau vài
          giây khi nhận đủ tiền.
        </span>
      </div>
      <img
        src={qr}
        alt={`Mã VietQR chuyển ${formatMoney(transfer.amount)} tới ${transfer.accountNumber}, nội dung ${transfer.content}`}
        className="mx-auto w-full max-w-60 rounded-xl bg-white"
        loading="lazy"
        referrerPolicy="no-referrer"
      />
      <dl className="grid grid-cols-[auto_1fr_auto] items-center gap-x-3 gap-y-1.5 text-sm">
        {rows.map(([label, value, copyable]) => (
          <div key={label} className="contents">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="font-medium tabular-nums break-all">{value}</dd>
            <dd>{copyable ? <CopyButton value={value} label={label} /> : null}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-7 px-2"
      aria-label={`Sao chép ${label.toLowerCase()}`}
      onClick={() =>
        void navigator.clipboard?.writeText(value).then(() => {
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1500);
        })
      }
    >
      {copied ? <CheckIcon /> : <CopyIcon />}
    </Button>
  );
}
