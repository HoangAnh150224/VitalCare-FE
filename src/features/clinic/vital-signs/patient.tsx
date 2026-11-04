import { useCan } from "@refinedev/core";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router";

import { kyInstance } from "@/shared/api/data";
import { ShowView, ShowViewHeader } from "@/shared/components/views/show-view";
import { Button } from "@/shared/ui/button";
import { VitalMonitor } from "./vital-parts";
import { PatientAlertHistory } from "../alerts/patient-alerts";

type Patient = { customerId: number; customerCode: string; fullName: string };

/**
 * One patient's vital signs for staff (FE-04 Vital Sign History, Trend &
 * Visualization): latest values, trends over 24 hours to 30 days, every reading.
 * A doctor reads patients through "Bệnh nhân của tôi", the desk through the
 * customer records: the link back goes to whichever the caller has.
 */
export const PatientVitalSigns = () => {
  const customerId = Number(useParams().customerId);
  const { data: patient, isError } = useQuery({
    queryKey: ["vital_signs", "patient", customerId],
    queryFn: () =>
      kyInstance.get(`vital_signs/patients/${customerId}`).json<Patient>(),
    enabled: Number.isFinite(customerId),
    retry: false,
  });
  const { data: customers } = useCan({ resource: "customers", action: "show" });
  const { data: mine } = useCan({ resource: "my_patients", action: "show" });
  const { data: canWriteRules } = useCan({
    resource: "alert_rules",
    action: "create",
  });
  const record = customers?.can
    ? `/customers/show/${customerId}`
    : mine?.can
    ? `/my-patients/show/${customerId}`
    : null;

  return (
    <ShowView>
      <ShowViewHeader
        resource="vital_signs"
        title={`Sinh hiệu · ${patient?.fullName ?? ""}`}
        canEdit={false}
      />
      <p className="text-muted-foreground -mt-2 text-sm">
        {record ? (
          <Link to={record} className="hover:underline">
            Hồ sơ bệnh nhân
          </Link>
        ) : (
          "Bệnh nhân"
        )}
        {patient?.customerCode ? ` · ${patient.customerCode}` : ""}
      </p>
      {isError || !Number.isFinite(customerId) ? (
        <p className="text-muted-foreground text-sm">
          Không tìm thấy bệnh nhân này, hoặc bạn không có quyền xem.
        </p>
      ) : (
        <>
          <VitalMonitor
            scope={{ kind: "staff", customerId }}
            detailHref={(id) => `/vital-signs/show/${id}`}
          />
          <PatientAlertHistory customerId={customerId} />
          {canWriteRules?.can && (
            <Button asChild variant="outline" size="sm" className="self-start">
              <Link to={`/alert-rules/create?customerId=${customerId}`}>
                Thêm quy tắc cảnh báo riêng
              </Link>
            </Button>
          )}
        </>
      )}
    </ShowView>
  );
};
