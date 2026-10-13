import { useEffect, useMemo } from "react";
import { useList, useSelect } from "@refinedev/core";
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
import type { Clinic } from "@/domains/clinic/types";
import type { Profile } from "@/domains/profile/types";
import { profileKind } from "@/domains/profile/types";
import type { BookingFormValues } from "./booking";
import { clinicToday } from "./clinic-day";
import { DoctorDayHint, doctorLabel, useClinicDoctors } from "./doctor-day";

/**
 * With whom, which day and why — the part of a registration both the front
 * desk and a customer fill in. No time is chosen: the visit gets the doctor's
 * next queue number for the day, and the hint under the fields says which.
 *
 * `forOwnAccount` is the customer's side: it asks first who the visit is for,
 * among the profiles under the account — the owner or a relative. The front
 * desk picks the person another way and leaves it off.
 */
export function BookingFields({
  control,
  forOwnAccount = false,
}: {
  control: Control<BookingFormValues>;
  forOwnAccount?: boolean;
}) {
  const { setValue, getValues } = useFormContext<BookingFormValues>();
  const clinicId = useWatch({ control, name: "clinicId" });
  const employeeId = useWatch({ control, name: "employeeId" });
  const date = useWatch({ control, name: "appointmentDate" });

  const patientId = useWatch({ control, name: "patientId" });
  const { result: profilesResult } = useList<Profile>({
    resource: "my_profiles",
    pagination: { mode: "off" },
    queryOptions: { enabled: forOwnAccount },
  });
  const profiles = useMemo(() => profilesResult?.data ?? [], [profilesResult?.data]);
  const patient = profiles.find((profile) => String(profile.id) === patientId);

  // The owner themselves until somebody chooses otherwise.
  useEffect(() => {
    const own = profiles.find((profile) => profile.self);
    if (forOwnAccount && own && !getValues("patientId")) {
      setValue("patientId", String(own.id));
    }
  }, [forOwnAccount, profiles, getValues, setValue]);

  const { options: clinicOptions } = useSelect<Clinic>({
    resource: "clinics",
    optionLabel: "name",
    optionValue: "id",
    pagination: { mode: "off" },
  });

  // Most deployments have one clinic; asking somebody to choose from a list
  // of one is a step for nothing.
  useEffect(() => {
    if (clinicOptions.length === 1 && !getValues("clinicId")) {
      setValue("clinicId", String(clinicOptions[0].value));
    }
  }, [clinicOptions, getValues, setValue]);

  // A doctor belongs to one clinic; change it and the choice means nothing.
  useEffect(() => {
    setValue("employeeId", "");
  }, [clinicId, setValue]);

  const { doctors } = useClinicDoctors(clinicId, date);
  const doctor = doctors.find((candidate) => String(candidate.id) === employeeId);

  return (
    <>
      {forOwnAccount && (
        <FormField
          control={control}
          name="patientId"
          rules={{
            required: "Vui lòng chọn người tới khám",
            validate: () => patient?.complete !== false || "Hồ sơ này chưa có ngày sinh và giới tính",
          }}
          render={({ field }) => (
            <FormItem className="md:col-span-8">
              <FormLabel>Người tới khám</FormLabel>
              <Select onValueChange={field.onChange} value={field.value ?? ""}>
                <FormControl>
                  <SelectTrigger className="w-full">
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
                {patient && !patient.complete ? (
                  <>
                    Hồ sơ này chưa có ngày sinh và giới tính.{" "}
                    <Link to={`/my-profiles/edit/${patient.id}`} className="text-foreground underline">
                      Bổ sung hồ sơ
                    </Link>{" "}
                    rồi quay lại đăng ký.
                  </>
                ) : (
                  <>
                    Khám cho người thân?{" "}
                    <Link to="/my-profiles/create" className="text-foreground underline">
                      Thêm người thân
                    </Link>
                  </>
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
              <FormLabel>Phòng khám</FormLabel>
              <Select onValueChange={field.onChange} value={field.value ?? ""}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Chọn phòng khám" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {clinicOptions.map((option) => (
                    <SelectItem key={String(option.value)} value={String(option.value)}>
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
        name="employeeId"
        rules={{ required: "Vui lòng chọn bác sĩ" }}
        render={({ field }) => (
          <FormItem className="md:col-span-5">
            <FormLabel>Bác sĩ</FormLabel>
            <Select onValueChange={field.onChange} value={field.value ?? ""} disabled={!clinicId}>
              <FormControl>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={clinicId ? "Chọn bác sĩ" : "Chọn phòng khám trước"} />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {doctors.map((option) => (
                  <SelectItem key={option.id} value={String(option.id)}>
                    {doctorLabel(option)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="appointmentDate"
        rules={{ required: "Vui lòng chọn ngày" }}
        render={({ field }) => (
          <FormItem className="md:col-span-3">
            <FormLabel>Ngày khám</FormLabel>
            <FormControl>
              <Input {...field} type="date" min={clinicToday()} value={field.value ?? ""} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <div className="md:col-span-8">
        <DoctorDayHint doctor={doctor} date={date} />
      </div>
      <FormField
        control={control}
        name="reason"
        rules={{
          validate: (value) => value.trim() !== "" || "Vui lòng nhập lý do khám",
          maxLength: { value: 255, message: "Tối đa 255 ký tự" },
        }}
        render={({ field }) => (
          <FormItem className="md:col-span-8">
            <FormLabel>Lý do khám</FormLabel>
            <FormControl>
              <Input {...field} value={field.value ?? ""} placeholder="Theo dõi sức khỏe định kỳ" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}
