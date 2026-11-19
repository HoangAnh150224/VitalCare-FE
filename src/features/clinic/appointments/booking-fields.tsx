import { useEffect, useMemo } from "react";
import { useList } from "@refinedev/core";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router";
import { useFormContext, useWatch, type Control } from "react-hook-form";

import { Input } from "@/shared/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/ui/form";
import type { PublicClinic } from "@/domains/public-site/types";
import { publicGet, publicRetry } from "@/shared/api/public";
import { SPECIALTY_OPTIONS } from "@/domains/employee/types";
import type { Profile } from "@/domains/profile/types";
import { profileKind, relativesFull } from "@/domains/profile/types";
import type { BookingFormValues } from "./booking";
import { clinicToday } from "./clinic-day";
import { OpenDayChoices, closedDayReason, useClinicDay, useClinicDoctors } from "./doctor-day";

/**
 * Which day and why (and, for the front desk, with whom) — the part of a
 * registration both the front desk and a customer fill in. A customer picks no
 * doctor: the clinic places the visit with one of its doctors working that day.
 * No time is chosen: the visit gets the doctor's next queue number for the
 * day, shown on the slip once it is registered.
 *
 * `forOwnAccount` is the customer's side: it asks first who the visit is for,
 * among the profiles under the account — the owner or a relative. The front
 * desk picks the person another way and leaves it off.
 */
export function BookingFields({
  control,
  forOwnAccount = false,
  todayOnly = false,
}: {
  control: Control<BookingFormValues>;
  forOwnAccount?: boolean;
  /** A walk-in: the day is today and cannot be changed. */
  todayOnly?: boolean;
}) {
  const { setValue, getValues, trigger } = useFormContext<BookingFormValues>();
  const clinicId = useWatch({ control, name: "clinicId" });
  const date = useWatch({ control, name: "appointmentDate" });

  const patientId = useWatch({ control, name: "patientId" });
  const { result: profilesResult } = useList<Profile>({
    resource: "my_profiles",
    pagination: { mode: "off" },
    queryOptions: { enabled: forOwnAccount },
  });
  const profiles = useMemo(
    () => profilesResult?.data ?? [],
    [profilesResult?.data]
  );
  const patient = profiles.find((profile) => String(profile.id) === patientId);
  // KAN-69: the API's `complete` now also asks for the ID number; checked here too so the
  // form says it before the API has to.
  const patientIncomplete = Boolean(patient) && (!patient?.complete || !patient?.nationalId?.trim());

  // The owner themselves until somebody chooses otherwise.
  useEffect(() => {
    const own = profiles.find((profile) => profile.self);
    if (forOwnAccount && own && !getValues("patientId")) {
      setValue("patientId", String(own.id));
    }
  }, [forOwnAccount, profiles, getValues, setValue]);

  const { data: activeClinics = [], isSuccess: clinicsLoaded } = useQuery({
    queryKey: ["public", "clinics"],
    queryFn: () => publicGet<PublicClinic[]>("clinics"),
    retry: publicRetry,
    staleTime: 0,
    refetchInterval: 10_000,
  });
  const clinicOptions = useMemo(
    () => activeClinics.map((clinic) => ({ label: clinic.name, value: clinic.id })),
    [activeClinics],
  );

  // Most deployments have one clinic; asking somebody to choose from a list
  // of one is a step for nothing.
  useEffect(() => {
    if (clinicOptions.length === 1 && !getValues("clinicId")) {
      setValue("clinicId", String(clinicOptions[0].value));
    }
  }, [clinicOptions, getValues, setValue]);

  // A clinic may stop operating while this booking form is already open.
  // Drop its selection and date as soon as the active-only list refreshes.
  useEffect(() => {
    if (!clinicId || !clinicsLoaded) return;
    if (!activeClinics.some((clinic) => clinic.id === clinicId)) {
      setValue("clinicId", "", { shouldValidate: true });
      setValue("appointmentDate", "", { shouldValidate: true });
    }
  }, [activeClinics, clinicId, clinicsLoaded, setValue]);


  const { doctors, isLoading: doctorsLoading, isError: doctorsError } = useClinicDoctors(
    clinicId,
    date
  );
  // Whether the day can be had at all, counted as the API will count it when the visit is registered.
  const clinicDay = useClinicDay(clinicId || undefined, date || undefined);
  // A lookup that failed says nothing about the day: it is not "no doctor".
  const dayFailed = Boolean(date && clinicId) && (doctorsError || clinicDay.isError);
  const dayKnown = Boolean(date && clinicId) && !dayFailed && !doctorsLoading && !clinicDay.isLoading;
  const dayClosed = dayFailed
    ? "Chưa tải được lịch khám của ngày này. Vui lòng thử lại sau."
    : dayKnown && !clinicDay.open
      ? closedDayReason(doctors, date, clinicToday())
      : null;
  // Said on the date field as soon as it is known, not first on pressing the button.
  useEffect(() => {
    if (dayKnown || dayFailed) {
      void trigger("appointmentDate");
    }
  }, [dayKnown, dayFailed, dayClosed, trigger]);

  return (
    <>
      {forOwnAccount && (
        <FormField
          control={control}
          name="patientId"
          rules={{
            required: "Vui lòng chọn người tới khám",
            validate: () =>
              !patientIncomplete ||
              "Hồ sơ này chưa có đủ ngày sinh, giới tính và số CCCD",
          }}
          render={({ field }) => (
            <FormItem className="md:col-span-8">
              <FormLabel>
                Người tới khám <span className="text-destructive" aria-hidden="true">*</span>
              </FormLabel>
              <Select onValueChange={field.onChange} value={field.value ?? ""}>
                <FormControl>
                  <SelectTrigger className="w-full" aria-required="true">
                    <SelectValue placeholder="Chọn người tới khám" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {profiles.map((profile) => (
                    <SelectItem key={profile.id} value={String(profile.id)}>
                      {profile.fullName} · {profileKind(profile)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-muted-foreground text-sm">
                {patient && patientIncomplete ? (
                  <>
                    Hồ sơ này chưa có đủ ngày sinh, giới tính và số CCCD.{" "}
                    <Link
                      to={`/my-profiles/edit/${patient.id}`}
                      className="text-foreground underline"
                    >
                      Bổ sung hồ sơ
                    </Link>{" "}
                    rồi quay lại đăng ký.
                  </>
                ) : (
                  !relativesFull(profiles) && (
                    <>
                      Khám cho người thân?{" "}
                      <Link
                        to="/my-profiles/create"
                        className="text-foreground underline"
                      >
                        Thêm người thân
                      </Link>
                    </>
                  )
                )}
              </p>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
      {clinicOptions.length > 1 && (
        <FormField
          control={control}
          name="clinicId"
          rules={{ required: "Vui lòng chọn phòng khám" }}
          render={({ field }) => (
            <FormItem className="md:col-span-8">
              <FormLabel>
                Phòng khám <span className="text-destructive" aria-hidden="true">*</span>
              </FormLabel>
              <Select onValueChange={field.onChange} value={field.value ?? ""}>
                <FormControl>
                  <SelectTrigger className="w-full" aria-required="true">
                    <SelectValue placeholder="Chọn phòng khám" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {clinicOptions.map((option) => (
                    <SelectItem
                      key={String(option.value)}
                      value={String(option.value)}
                    >
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
      <FormField
        control={control}
        name="department"
        rules={{ required: "Vui lòng chọn khoa khám" }}
        render={({ field }) => (
          <FormItem className="md:col-span-8">
            <FormLabel>
              Khám khoa <span className="text-destructive" aria-hidden="true">*</span>
            </FormLabel>
            <Select onValueChange={field.onChange} value={field.value ?? ""}>
              <FormControl>
                <SelectTrigger className="w-full" aria-label="Khám khoa" aria-required="true">
                  <SelectValue placeholder="Chọn khoa khám" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {SPECIALTY_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-muted-foreground text-sm">Bệnh nhân được gọi vào một phòng của khoa này.</p>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="appointmentDate"
        rules={{ required: "Vui lòng chọn ngày", validate: () => dayClosed ?? true }}
        render={({ field }) => (
          <FormItem className="md:col-span-3">
            <FormLabel>
              Ngày khám <span className="text-destructive" aria-hidden="true">*</span>
            </FormLabel>
            <FormControl>
              <Input
                {...field}
                type="date"
                required
                min={clinicToday()}
                value={field.value ?? ""}
                readOnly={todayOnly}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      {/* Only when the day cannot be had; it takes no row otherwise. */}
      {dayClosed && !dayFailed && (
        <OpenDayChoices
          days={clinicDay.others}
          onPick={
            todayOnly
              ? undefined
              : (day) => setValue("appointmentDate", day, { shouldValidate: true })
          }
        />
      )}
      {forOwnAccount && (
        <p className="text-muted-foreground text-sm md:col-span-8">
          Phòng khám sẽ xếp bạn vào một bác sĩ khám trong ngày; tên bác sĩ và số
          khám hiện trên phiếu sau khi đăng ký.
        </p>
      )}
      <FormField
        control={control}
        name="reason"
        rules={{
          validate: (value) =>
            value.trim() !== "" || "Vui lòng nhập lý do khám",
          maxLength: { value: 255, message: "Tối đa 255 ký tự" },
        }}
        render={({ field }) => (
          <FormItem className="md:col-span-8">
            <FormLabel>
              Lý do khám <span className="text-destructive" aria-hidden="true">*</span>
            </FormLabel>
            <FormControl>
              <Input
                {...field}
                required
                value={field.value ?? ""}
                placeholder="Theo dõi sức khỏe định kỳ"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}