import { Link } from "react-router";

import { Button } from "@/shared/ui/button";

type RecordNotFoundProps = {
  /** What is missing, in Vietnamese: "Không tìm thấy nội dung sơ cứu." */
  message: string;
  /** The list this record would have been on. */
  listPath: string;
  listLabel?: string;
};

/**
 * What a detail, edit or history screen draws in place of its body when its
 * record cannot be read (an id edited in the URL, a record of another clinic):
 * the reason, and a way back to the list — never the empty layout.
 */
export function RecordNotFound({
  message,
  listPath,
  listLabel = "Về danh sách",
}: RecordNotFoundProps) {
  return (
    <div
      role="alert"
      className="bg-card flex flex-col items-center gap-3 rounded-xl border px-6 py-12 text-center"
    >
      <p className="text-muted-foreground text-sm">{message}</p>
      <Button asChild variant="outline">
        <Link to={listPath}>{listLabel}</Link>
      </Button>
    </div>
  );
}
