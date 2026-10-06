import { EyeIcon, XIcon } from "lucide-react";
import { Link } from "react-router";

import { Alert, AlertDescription } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";

type ViewAsBannerProps = {
  /** Who is being viewed as; `undefined` while their record loads. */
  name?: string;
  /** What they are: "Khách hàng", "Bác sĩ", "Điều dưỡng". */
  role: string;
};

/**
 * Says, on every view-as screen, whose eyes these are and that nothing here
 * can be changed — so a screen that looks exactly like somebody else's own
 * cannot be mistaken for the administrator's.
 */
export const ViewAsBanner = ({ name, role }: ViewAsBannerProps) => (
  <Alert data-print="hide" className="flex items-center gap-3">
    <EyeIcon className="size-4 shrink-0" />
    <AlertDescription className="flex-1 text-sm">
      <span>
        Đang xem dưới vai trò <span className="font-semibold">{role}</span>
        {name ? (
          <>
            : <span className="font-semibold">{name}</span>
          </>
        ) : null}{" "}
        — chỉ đọc, không thao tác thay người này.
      </span>
    </AlertDescription>
    <Button asChild size="sm" variant="outline">
      <Link to="/view-as">
        <XIcon />
        Thoát
      </Link>
    </Button>
  </Alert>
);
