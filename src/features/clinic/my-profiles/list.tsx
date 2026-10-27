import { useList } from "@refinedev/core";
import { ChevronRightIcon, PlusIcon, TriangleAlertIcon } from "lucide-react";
import { Link } from "react-router";

import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Skeleton } from "@/shared/ui/skeleton";
import { GENDER_LABELS } from "@/domains/customer/types";
import type { Profile } from "@/domains/profile/types";
import { profileKind } from "@/domains/profile/types";
import { initials } from "@/shared/lib/format";

/** Whole years since a `YYYY-MM-DD` birth date, as of today. */
function ageOf(dateOfBirth: string): number {
  const [year, month, day] = dateOfBirth.split("-").map(Number);
  const now = new Date();
  const hadBirthday = now.getMonth() + 1 > month || (now.getMonth() + 1 === month && now.getDate() >= day);
  return now.getFullYear() - year - (hadBirthday ? 0 : 1);
}

/** "34 tuổi · Nữ", leaving out whichever is not filled in. */
function summary(profile: Profile): string {
  const parts = [
    profile.dateOfBirth ? `${ageOf(profile.dateOfBirth)} tuổi` : null,
    profile.gender ? GENDER_LABELS[profile.gender] : null,
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : "Chưa có ngày sinh, giới tính";
}

/**
 * The people visits are registered for: the account owner first, then the
 * relatives they bring. One short card each — who it is and whether it is
 * ready for a visit; the full record is one tap away, on the form.
 */
export const MyProfileList = () => {
  const { result, query } = useList<Profile>({ resource: "my_profiles", pagination: { mode: "off" } });
  const profiles = result?.data ?? [];

  return (
    <div className="screen-enter screen-enter-stagger flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          {/* Styled for the staff shell too (an account with staff rights that also registers);
              the portal restyles every h1 its own way. */}
          <h1 className="text-3xl font-bold tracking-tight">Hồ sơ</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Bạn và người thân. Mỗi lượt đăng ký khám là cho một người trong danh sách này.
          </p>
        </div>
        <Button asChild variant="outline" className="rounded-xl">
          <Link to="/my-profiles/create">
            <PlusIcon />
            Thêm người thân
          </Link>
        </Button>
      </div>

      {query.isLoading ? (
        <div className="grid gap-3 md:grid-cols-2">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {profiles.map((profile) => (
            <li key={profile.id}>
              <Link
                to={`/my-profiles/edit/${profile.id}`}
                className="bg-card text-foreground hover:border-primary/40 flex h-full flex-col gap-3 rounded-2xl border border-border p-4 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="bg-primary/10 text-primary font-display flex size-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold">
                    {initials(profile.fullName)}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="truncate font-semibold">{profile.fullName}</span>
                      <Badge variant={profile.self ? "info" : "secondary"}>{profileKind(profile)}</Badge>
                    </span>
                    <span className="text-muted-foreground text-sm">
                      {summary(profile)} · <span className="tabular-nums">{profile.phone}</span>
                    </span>
                  </span>
                  <ChevronRightIcon className="text-muted-foreground size-5 shrink-0" />
                </div>
                {!profile.complete && (
                  <p className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                    <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" />
                    Cần bổ sung ngày sinh, giới tính và số CCCD trước khi đăng ký khám. Bấm để bổ sung.
                  </p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
