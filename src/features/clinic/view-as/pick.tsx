import { useSelect } from "@refinedev/core";
import { CalendarCheckIcon, ConciergeBellIcon, HeartPulseIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router";

import { ListView, ListViewHeader } from "@/shared/components/views/list-view";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import type { Customer } from "@/domains/customer/types";
import type { Employee } from "@/domains/employee/types";
import { isClinicalStaff, STAFF_TYPE_LABELS } from "@/domains/employee/types";
import { useClinicOptions } from "../clinics/use-clinic-options";

type RoleCardProps = {
  title: string;
  description: string;
  icon: React.ReactNode;
  /** The whole-role view: everybody's data, from this role's side. */
  allLabel: string;
  onViewAll: () => void;
  /** Narrowing to one person: exactly what they see. */
  placeholder: string;
  options: { label: string; value: string | number }[];
  onSearch: (value: string) => void;
  onView: (id: string) => void;
};

const RoleCard = ({ title, description, icon, allLabel, onViewAll, placeholder, options, onSearch, onView }: RoleCardProps) => {
  const [selected, setSelected] = useState("");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Button variant="secondary" className="self-start" onClick={onViewAll}>
          {allLabel}
        </Button>
        <div className="text-muted-foreground text-xs">hoặc xem đúng như một người thấy:</div>
        <Input placeholder="Tìm theo tên, số điện thoại hoặc mã" onChange={(e) => onSearch(e.target.value)} />
        <Select value={selected} onValueChange={setSelected}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={String(option.value)} value={String(option.value)}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button className="self-start" disabled={!selected} onClick={() => onView(selected)}>
          Xem
        </Button>
      </CardContent>
    </Card>
  );
};

/**
 * Where an administrator picks a role to look from: all of its data at once,
 * or exactly what one person in it sees. Searched through each list's quick
 * filter (`q`), which matches name, phone number and code at once.
 */
export const ViewAsPick = () => {
  const navigate = useNavigate();
  const clinics = useClinicOptions();

  const customers = useSelect<Customer>({
    resource: "customers",
    optionLabel: (customer) => `${customer.fullName} · ${customer.phone} · ${customer.customerCode}`,
    optionValue: "id",
    onSearch: (value) => [{ field: "q", operator: "eq", value }],
  });

  // Doctors and nurses who still work here: somebody who left has no
  // caseload, and the front desk has a card of its own.
  const staff = useSelect<Employee>({
    resource: "employees",
    filters: [{ field: "status", operator: "eq", value: "active" }],
    pagination: { pageSize: 200 },
    onSearch: (value) => [{ field: "q", operator: "eq", value }],
  });
  const clinicalOptions = useMemo(
    () =>
      (staff.query.data?.data ?? [])
        .filter((employee) => isClinicalStaff(employee.staffType))
        .map((employee) => ({
          label: `${employee.fullName} · ${STAFF_TYPE_LABELS[employee.staffType]} · ${employee.employeeCode}`,
          value: employee.id,
        })),
    [staff.query.data?.data],
  );

  const receptionists = useSelect<Employee>({
    resource: "employees",
    filters: [
      { field: "status", operator: "eq", value: "active" },
      { field: "staffType", operator: "eq", value: "receptionist" },
    ],
    optionLabel: (employee) => `${employee.fullName} · ${clinics.nameOf(employee.clinicId)}`,
    optionValue: "id",
    onSearch: (value) => [{ field: "q", operator: "eq", value }],
  });

  return (
    <ListView>
      <ListViewHeader
        canCreate={false}
        description="Xem từ phía từng vai trò: toàn bộ dữ liệu của vai trò đó, hoặc đúng những gì một người thấy. Chỉ đọc: không đặt, huỷ hay thay đổi gì thay họ."
      />
      <div className="grid gap-4 lg:grid-cols-3">
        <RoleCard
          title="Lễ tân"
          description="Lịch hẹn, khách hàng và thiết bị. Mỗi lễ tân chỉ thấy phòng khám của mình."
          icon={<ConciergeBellIcon className="size-4" />}
          allLabel="Xem tất cả phòng khám"
          onViewAll={() => navigate("/view-as/front-desk")}
          placeholder="Chọn lễ tân"
          options={receptionists.options}
          onSearch={receptionists.onSearch}
          onView={(id) => navigate(`/view-as/front-desk/${id}`)}
        />
        <RoleCard
          title="Bác sĩ / Điều dưỡng"
          description="Màn “Bệnh nhân của tôi”. Mỗi người chỉ thấy bệnh nhân mình phụ trách."
          icon={<HeartPulseIcon className="size-4" />}
          allLabel="Xem tất cả bệnh nhân"
          onViewAll={() => navigate("/view-as/patients")}
          placeholder="Chọn nhân viên y tế"
          options={clinicalOptions}
          onSearch={staff.onSearch}
          onView={(id) => navigate(`/view-as/employees/${id}`)}
        />
        <RoleCard
          title="Khách hàng"
          description="Màn “Lịch hẹn của tôi” và phiếu khám. Mỗi khách chỉ thấy lịch của mình."
          icon={<CalendarCheckIcon className="size-4" />}
          allLabel="Xem tất cả lịch hẹn"
          onViewAll={() => navigate("/view-as/appointments")}
          placeholder="Chọn khách hàng"
          options={customers.options}
          onSearch={customers.onSearch}
          onView={(id) => navigate(`/view-as/customers/${id}`)}
        />
      </div>
    </ListView>
  );
};
