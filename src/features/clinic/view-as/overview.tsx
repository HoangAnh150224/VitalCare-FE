import { useOne, useSelect } from "@refinedev/core";
import { useCallback, useMemo, useState } from "react";
import { useParams } from "react-router";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import type { Appointment } from "@/domains/appointment/types";
import type { Employee } from "@/domains/employee/types";
import { isClinicalStaff, STAFF_TYPE_LABELS } from "@/domains/employee/types";
import { AppointmentList } from "../appointments/list";
import { useClinicOptions } from "../clinics/use-clinic-options";
import { CustomerList } from "../customers/list";
import { DeviceList } from "../devices/list";
import { MyAppointmentList } from "../my-appointments/list";
import { MyPatientList } from "../my-patients/list";
import { ViewAsBanner } from "./view-as-banner";

/*
 * Each role's own screens with nobody's data left out — what an administrator
 * sees from that role's side. The person-by-person screens (`screens.tsx`) are
 * the same screens narrowed to exactly what one person sees.
 */

/** Every customer's appointments, as customers see theirs, with whose each one is. */
export const ViewAsAllAppointments = () => {
  const slipPath = useCallback(
    (appointment: Appointment) => `/view-as/customers/${appointment.customer.id}/appointments/${appointment.id}`,
    [],
  );
  return (
    <div className="flex flex-col gap-4">
      <ViewAsBanner role="Khách hàng" name="tất cả khách hàng" />
      <MyAppointmentList
        title="Lịch hẹn của tôi"
        description="Lịch hẹn của mọi khách hàng, ở dạng khách nhìn thấy (không có ghi chú nội bộ). Mở phiếu để xem đúng như khách đó."
        resource="appointments"
        showCustomer
        slipPath={slipPath}
      />
    </div>
  );
};

/** Every patient being followed, with their whole care team; narrowed to one doctor or nurse on demand. */
export const ViewAsAllPatients = () => {
  const [employeeId, setEmployeeId] = useState("all");
  const { query } = useSelect<Employee>({
    resource: "employees",
    filters: [{ field: "status", operator: "eq", value: "active" }],
    pagination: { pageSize: 200 },
  });
  const clinicalStaff = useMemo(
    () => (query.data?.data ?? []).filter((employee) => isClinicalStaff(employee.staffType)),
    [query.data?.data],
  );
  const patientPath = useCallback((id: number) => `/customers/show/${id}`, []);
  const narrowedTo = employeeId === "all" ? undefined : Number(employeeId);

  return (
    <div className="flex flex-col gap-4">
      <ViewAsBanner role="Bác sĩ / Điều dưỡng" name="tất cả bệnh nhân đang theo dõi" />
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground text-sm">Người phụ trách</span>
        <Select value={employeeId} onValueChange={setEmployeeId}>
          <SelectTrigger className="w-72">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả</SelectItem>
            {clinicalStaff.map((employee) => (
              <SelectItem key={employee.id} value={String(employee.id)}>
                {employee.fullName} · {STAFF_TYPE_LABELS[employee.staffType]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <MyPatientList
        key={employeeId}
        title="Bệnh nhân của tôi"
        description="Mọi bệnh nhân đang được theo dõi, kèm nhóm chăm sóc. Chọn một người phụ trách để thu hẹp."
        resource="view_as/patients"
        employeeId={narrowedTo}
        showCareTeam
        patientPath={patientPath}
      />
    </div>
  );
};

/**
 * The front desk's screens: every clinic's data, or — for one receptionist —
 * exactly their clinic's, as they see it. Read-only either way.
 */
export const ViewAsFrontDesk = () => {
  const { employeeId } = useParams();
  const clinics = useClinicOptions();
  const { result: receptionist, query } = useOne<Employee>({
    resource: "employees",
    id: employeeId ?? "",
    queryOptions: { enabled: Boolean(employeeId) },
  });

  // One receptionist: wait for their record, then lock every list to their clinic.
  if (employeeId && query.isLoading) {
    return <ViewAsBanner role="Lễ tân" />;
  }
  const clinicId = employeeId ? (receptionist?.clinicId ?? undefined) : undefined;
  const name = employeeId
    ? `${receptionist?.fullName ?? ""} (${clinics.nameOf(clinicId)})`
    : "tất cả phòng khám";

  return (
    <div className="flex flex-col gap-4">
      <ViewAsBanner role="Lễ tân" name={name} />
      <Tabs defaultValue="appointments" key={clinicId ?? "all"}>
        <TabsList>
          <TabsTrigger value="appointments">Lịch hẹn</TabsTrigger>
          <TabsTrigger value="customers">Khách hàng</TabsTrigger>
          <TabsTrigger value="devices">Thiết bị</TabsTrigger>
        </TabsList>
        <TabsContent value="appointments">
          <AppointmentList clinicId={clinicId} readOnly />
        </TabsContent>
        <TabsContent value="customers">
          <CustomerList clinicId={clinicId} readOnly />
        </TabsContent>
        <TabsContent value="devices">
          <DeviceList clinicId={clinicId} readOnly />
        </TabsContent>
      </Tabs>
    </div>
  );
};
