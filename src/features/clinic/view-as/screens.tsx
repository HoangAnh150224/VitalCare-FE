import { useOne } from "@refinedev/core";
import { useCallback } from "react";
import { useParams } from "react-router";

import type { Customer } from "@/domains/customer/types";
import type { Employee } from "@/domains/employee/types";
import { STAFF_TYPE_LABELS } from "@/domains/employee/types";
import { MyAppointmentList } from "../my-appointments/list";
import { MyAppointmentShow } from "../my-appointments/show";
import { MyPatientList } from "../my-patients/list";
import { MyPatientShow } from "../my-patients/show";
import { ViewAsBanner } from "./view-as-banner";

/*
 * Each screen is the person's own screen, pointed at `view_as` instead of at
 * the signed-in account, under a banner that says so. The API behind
 * `view_as` is GET only, so read-only holds whatever the page renders.
 */

const CustomerBanner = ({ customerId }: { customerId: string }) => {
  const { result: customer } = useOne<Customer>({ resource: "customers", id: customerId });
  return <ViewAsBanner role="Khách hàng" name={customer?.fullName} />;
};

const EmployeeBanner = ({ employeeId }: { employeeId: string }) => {
  const { result: employee } = useOne<Employee>({ resource: "employees", id: employeeId });
  return (
    <ViewAsBanner
      role={employee ? STAFF_TYPE_LABELS[employee.staffType] : "Nhân viên y tế"}
      name={employee?.fullName}
    />
  );
};

export const ViewAsCustomerAppointments = () => {
  const { customerId = "" } = useParams();
  const slipPath = useCallback(
    (appointment: { id: number }) => `/view-as/customers/${customerId}/appointments/${appointment.id}`,
    [customerId],
  );
  return (
    <div className="flex flex-col gap-4">
      <CustomerBanner customerId={customerId} />
      <MyAppointmentList
        key={customerId}
        title="Lịch hẹn của tôi"
        resource={`view_as/customers/${customerId}/appointments`}
        slipPath={slipPath}
      />
    </div>
  );
};

export const ViewAsCustomerAppointment = () => {
  const { customerId = "", id = "" } = useParams();
  return (
    <div className="flex flex-col gap-4">
      <CustomerBanner customerId={customerId} />
      <MyAppointmentShow resource={`view_as/customers/${customerId}/appointments`} id={id} readOnly />
    </div>
  );
};

export const ViewAsEmployeePatients = () => {
  const { employeeId = "" } = useParams();
  const patientPath = useCallback(
    (id: number) => `/view-as/employees/${employeeId}/patients/${id}`,
    [employeeId],
  );
  return (
    <div className="flex flex-col gap-4">
      <EmployeeBanner employeeId={employeeId} />
      <MyPatientList
        key={employeeId}
        title="Bệnh nhân của tôi"
        resource={`view_as/employees/${employeeId}/patients`}
        patientPath={patientPath}
      />
    </div>
  );
};

export const ViewAsEmployeePatient = () => {
  const { employeeId = "", customerId = "" } = useParams();
  return (
    <div className="flex flex-col gap-4">
      <EmployeeBanner employeeId={employeeId} />
      <MyPatientShow resource={`view_as/employees/${employeeId}/patients`} id={customerId} title="Bệnh nhân" />
    </div>
  );
};
