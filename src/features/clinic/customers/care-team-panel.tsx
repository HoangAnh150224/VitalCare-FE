import { useState } from "react";
import {
  useCan,
  useCustom,
  useCustomMutation,
  useList,
  useNotification,
  type HttpError,
} from "@refinedev/core";
import { UserPlusIcon, UsersIcon } from "lucide-react";

import { API_URL } from "@/shared/api/constants";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { DetailPanel } from "@/shared/components/views/record-detail";
import { formatDate } from "@/shared/lib/format";
import type { Customer } from "@/domains/customer/types";
import type { CareTeamMember } from "@/domains/assignment/types";
import type { Employee } from "@/domains/employee/types";
import { isClinicalStaff, STAFF_TYPE_LABELS } from "@/domains/employee/types";

const JSON_HEADERS = { headers: { "Content-Type": "application/json" } };

/**
 * The people following a patient: who is on the team now, adding somebody,
 * taking somebody off, and who used to be.
 *
 * Only for a patient — a neutral customer has not been taken on, so the panel
 * says so instead of offering an action the API would refuse.
 */
export function CareTeamPanel({ customer }: { customer: Customer }) {
  const { open } = useNotification();
  const { data: access } = useCan({ resource: "customers", action: "assign" });
  const canAssign = access?.can ?? false;
  const isPatient = customer.status === "patient";

  const { result, query } = useCustom<CareTeamMember[]>({
    url: `${API_URL}/customers/${customer.id}/care-team`,
    method: "get",
    queryOptions: { enabled: isPatient },
  });
  const rows = Array.isArray(result?.data) ? result.data : [];
  const current = rows.filter((row) => row.status === "active");
  const past = rows.filter((row) => row.status === "ended");

  const { result: staff } = useList<Employee>({
    resource: "employees",
    filters: [{ field: "status", operator: "eq", value: "active" }],
    pagination: { pageSize: 200 },
    queryOptions: { enabled: isPatient && canAssign },
  });
  const onTeam = new Set(current.map((row) => row.employeeId));
  const candidates = (staff?.data ?? []).filter(
    (employee) => isClinicalStaff(employee.staffType) && !onTeam.has(employee.id),
  );

  const [chosen, setChosen] = useState("");
  const { mutate, mutation } = useCustomMutation<CareTeamMember>();

  const run = (url: string, values: object, message: string) =>
    mutate(
      { url, method: "post", values, config: JSON_HEADERS, successNotification: false },
      {
        onSuccess: () => {
          setChosen("");
          void query.refetch();
          open?.({ type: "success", message });
        },
        onError: (error: HttpError) =>
          open?.({ type: "error", message: error.message ?? "Không thực hiện được" }),
      }
    );

  return (
    <DetailPanel
      title="Nhóm chăm sóc"
      action={<UsersIcon className="text-muted-foreground size-4" />}
      bodyClassName="p-4"
    >
      {!isPatient ? (
        <p className="text-muted-foreground text-sm">
          Khách hàng chưa là bệnh nhân. Kích hoạt hồ sơ bệnh nhân trước khi gán nhân viên theo dõi.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {current.length === 0 && (
            <p className="text-muted-foreground text-sm">Chưa có nhân viên nào theo dõi bệnh nhân này.</p>
          )}
          {current.map((member) => (
            <div key={member.id} className="flex items-center justify-between gap-2 rounded-md border p-3">
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-medium">{member.fullName}</span>
                <span className="text-muted-foreground text-xs">
                  {STAFF_TYPE_LABELS[member.staffType]}
                  {member.specialty ? ` · ${member.specialty}` : ""} · từ {formatDate(member.assignedAt)}
                </span>
              </div>
              {canAssign && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={mutation.isPending}
                  onClick={() =>
                    run(
                      `${API_URL}/customers/${customer.id}/care-team/${member.id}/end`,
                      {},
                      `Đã gỡ ${member.fullName} khỏi nhóm chăm sóc`
                    )
                  }
                >
                  Kết thúc
                </Button>
              )}
            </div>
          ))}

          {canAssign && (
            <div className="flex gap-2">
              <Select value={chosen} onValueChange={setChosen}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={candidates.length ? "Chọn nhân viên" : "Không còn nhân viên để thêm"} />
                </SelectTrigger>
                <SelectContent>
                  {candidates.map((employee) => (
                    <SelectItem key={employee.id} value={String(employee.id)}>
                      {employee.fullName} · {STAFF_TYPE_LABELS[employee.staffType]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                disabled={!chosen || mutation.isPending}
                onClick={() =>
                  run(
                    `${API_URL}/customers/${customer.id}/care-team`,
                    { employeeId: Number(chosen) },
                    "Đã thêm nhân viên vào nhóm chăm sóc"
                  )
                }
              >
                <UserPlusIcon />
                Thêm
              </Button>
            </div>
          )}

          {past.length > 0 && (
            <details className="text-sm">
              <summary className="text-muted-foreground cursor-pointer">Đã từng theo dõi ({past.length})</summary>
              <ul className="mt-2 flex flex-col gap-1">
                {past.map((member) => (
                  <li key={member.id} className="text-muted-foreground flex items-center justify-between">
                    <span>{member.fullName}</span>
                    <Badge variant="neutral">
                      {formatDate(member.assignedAt)} – {formatDate(member.endedAt)}
                    </Badge>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </DetailPanel>
  );
}
