import { useList } from "@refinedev/core";
import { PencilIcon, PlusIcon } from "lucide-react";
import { Link } from "react-router";

import { ListView, ListViewHeader } from "@/shared/components/views/list-view";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { GENDER_LABELS } from "@/domains/customer/types";
import type { Profile } from "@/domains/profile/types";
import { fullAddress, ID_TYPE_LABELS, profileKind } from "@/domains/profile/types";
import { formatLocalDate } from "@/shared/lib/format";

/**
 * The patient profiles under the account: the owner's own first, then the
 * relatives they register visits for. A visit is always registered for one of
 * these, and only for one that says a date of birth and a gender.
 */
export const MyProfileList = () => {
  const { result } = useList<Profile>({ resource: "my_profiles", pagination: { mode: "off" } });
  const profiles = result?.data ?? [];

  return (
    <ListView>
      <ListViewHeader
        resource="my_profiles"
        canCreate={false}
        description="Hồ sơ của bạn và người thân, dùng khi đăng ký khám. Mỗi lượt đăng ký khám gắn với một hồ sơ."
        actions={
          <Button asChild>
            <Link to="/my-profiles/create">
              <PlusIcon />
              Thêm người thân
            </Link>
          </Button>
        }
      />
      <div className="grid gap-4 md:grid-cols-2">
        {profiles.map((profile) => (
          <Card key={profile.id} className="flex flex-col gap-3 p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-base font-semibold">{profile.fullName}</span>
                  <Badge variant={profile.self ? "info" : "secondary"}>{profileKind(profile)}</Badge>
                </div>
                <span className="text-muted-foreground font-mono text-xs">{profile.customerCode}</span>
              </div>
              <Button asChild size="sm" variant="outline">
                <Link to={`/my-profiles/edit/${profile.id}`}>
                  <PencilIcon />
                  {profile.complete ? "Sửa" : "Bổ sung"}
                </Link>
              </Button>
            </div>
            <dl className="grid grid-cols-[7rem_minmax(0,1fr)] gap-y-1 text-sm">
              <dt className="text-muted-foreground">Ngày sinh</dt>
              <dd>{profile.dateOfBirth ? formatLocalDate(profile.dateOfBirth) : "—"}</dd>
              <dt className="text-muted-foreground">Giới tính</dt>
              <dd>{profile.gender ? GENDER_LABELS[profile.gender] : "—"}</dd>
              <dt className="text-muted-foreground">Điện thoại</dt>
              <dd className="font-mono">{profile.phone}</dd>
              <dt className="text-muted-foreground">{ID_TYPE_LABELS[profile.nationalIdType ?? "cccd"]}</dt>
              <dd className="font-mono">{profile.nationalId ?? "—"}</dd>
              <dt className="text-muted-foreground">Ngày cấp</dt>
              <dd>{profile.nationalIdIssuedOn ? formatLocalDate(profile.nationalIdIssuedOn) : "—"}</dd>
              <dt className="text-muted-foreground">Dân tộc</dt>
              <dd>{profile.ethnicity ?? "—"}</dd>
              <dt className="text-muted-foreground">Quốc tịch</dt>
              <dd>{profile.nationality ?? "—"}</dd>
              <dt className="text-muted-foreground">Nghề nghiệp</dt>
              <dd>{profile.occupation ?? "—"}</dd>
              <dt className="text-muted-foreground">Địa chỉ</dt>
              <dd>{fullAddress(profile) ?? "—"}</dd>
            </dl>
            {!profile.complete && (
              <p className="text-destructive text-sm">
                Cần bổ sung ngày sinh, giới tính và số CCCD trước khi đăng ký khám cho hồ sơ này.
              </p>
            )}
          </Card>
        ))}
      </div>
    </ListView>
  );
};
