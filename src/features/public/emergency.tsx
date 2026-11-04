import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { publicGet, publicRetry } from "@/shared/api/public";
import { CallButton } from "@/shared/components/first-aid/guidance";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/ui/dialog";
import {
  NATIONAL_EMERGENCY_NUMBERS,
  NOT_AN_EMERGENCY_SERVICE,
} from "@/domains/first-aid/types";
import type { PublicClinic } from "@/domains/public-site/types";
import { displayPhone } from "@/domains/public-site/types";

/** The clinics, shared by every public page that lists or picks one. */
export function usePublicClinics() {
  return useQuery({
    queryKey: ["public", "clinics"],
    retry: publicRetry,
    queryFn: () => publicGet<PublicClinic[]>("clinics"),
    staleTime: 60_000,
  });
}

/**
 * Emergency contacts (SRS 3.17.3): the national numbers first, then each
 * clinic's line. Every entry is a `tel:` link. Says plainly that VitalCare is
 * not an emergency service.
 */
export function EmergencyContacts() {
  const { data: clinics } = usePublicClinics();
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-2 sm:grid-cols-3">
        {NATIONAL_EMERGENCY_NUMBERS.map((entry) => (
          <CallButton
            key={entry.number}
            number={entry.number}
            label={entry.label}
          />
        ))}
      </div>
      {clinics && clinics.some((clinic) => clinic.phone) && (
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold">
            Đường dây của phòng khám (giờ làm việc)
          </h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {clinics
              .filter((clinic) => clinic.phone)
              .map((clinic) => (
                <a
                  key={clinic.id}
                  href={`tel:${clinic.phone}`}
                  className="hover:bg-muted flex flex-col rounded-xl border p-3 transition-colors"
                >
                  <span className="font-medium">{clinic.name}</span>
                  <span className="text-primary font-semibold tabular-nums">
                    {displayPhone(clinic.phone)}
                  </span>
                </a>
              ))}
          </div>
        </div>
      )}
      <p className="text-muted-foreground text-sm">
        {NOT_AN_EMERGENCY_SERVICE}
      </p>
    </div>
  );
}

export function EmergencyDialog({ trigger }: { trigger: ReactNode }) {
  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Liên hệ khẩn cấp</DialogTitle>
          <DialogDescription>Bấm vào số để gọi ngay.</DialogDescription>
        </DialogHeader>
        <EmergencyContacts />
      </DialogContent>
    </Dialog>
  );
}
