import { useList } from "@refinedev/core";
import { useState } from "react";
import { Link } from "react-router";

import { cn } from "@/shared/lib/utils";
import type { Profile } from "@/domains/profile/types";
import { VitalMonitor } from "./vital-parts";
import { PatientAlertHistory } from "../alerts/patient-alerts";

/**
 * The portal's "Sức khỏe" (FE-04 on the patient side): the account's own vital
 * signs and those of the relatives it manages, one profile at a time.
 */
export const MyHealth = () => {
  const { result } = useList<Profile>({
    resource: "my_profiles",
    pagination: { mode: "off" },
  });
  const profiles = result?.data ?? [];
  const [chosen, setChosen] = useState<number | null>(null);
  const own = profiles.find((p) => p.self);
  const current = chosen ?? own?.id ?? null;

  return (
    <div className="screen-enter flex flex-col gap-5">
      <div>
        <h1>Sức khỏe</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Nhịp tim, SpO₂ và nhiệt độ da đo từ thiết bị theo dõi phòng khám giao
          cho bạn.
        </p>
        <Link to="/my-sharing" className="text-primary mt-1 inline-block text-sm hover:underline">
          Chia sẻ với người chăm sóc →
        </Link>
      </div>
      {profiles.length > 1 && (
        <div
          role="group"
          aria-label="Chọn người"
          className="flex flex-wrap gap-2"
        >
          {profiles.map((p) => (
            <button
              key={p.id}
              type="button"
              aria-pressed={current === p.id}
              onClick={() => setChosen(p.id)}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-medium transition-colors",
                current === p.id
                  ? "bg-primary text-primary-foreground"
                  : "card-soft text-muted-foreground hover:text-foreground"
              )}
            >
              {p.fullName}
            </button>
          ))}
        </div>
      )}
      {current != null && (
        <>
          <VitalMonitor
            key={current}
            scope={{ kind: "own", profileId: current }}
          />
          <PatientAlertHistory
            key={`alerts-${current}`}
            customerId={current}
            own
          />
        </>
      )}
    </div>
  );
};
