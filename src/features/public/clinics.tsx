import { useIsAuthenticated } from "@refinedev/core";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeftIcon,
  CalendarPlusIcon,
  ClockIcon,
  MailIcon,
  MapPinIcon,
  MessageCircleIcon,
  PhoneIcon,
  StethoscopeIcon,
} from "lucide-react";
import { Link, useParams } from "react-router";

import { publicGet, publicRetry } from "@/shared/api/public";
import { openGuestChat } from "@/shared/components/chat/guest-chat";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import { Skeleton } from "@/shared/ui/skeleton";
import type {
  Opening,
  PublicClinic,
  PublicClinicDetail,
} from "@/domains/public-site/types";
import {
  displayPhone,
  openingLines,
  WEEKDAY_LABELS,
} from "@/domains/public-site/types";
import { PublicPageHeader } from "./layout";
import { usePublicClinics } from "./emergency";

/** Where a visit is registered from: the portal for somebody signed in, the sign-up form for anybody else. */
function useRegisterLink() {
  const { data: auth } = useIsAuthenticated();
  return auth?.authenticated ? "/my-appointments/create" : "/register";
}

/** SRS UC "View Clinic Information": every operating clinic, how to reach it, when it opens. */
export function PublicClinics() {
  const { data: clinics, isLoading, error } = usePublicClinics();
  return (
    <>
      <PublicPageHeader
        title="Cơ sở khám"
        description="Địa chỉ, giờ làm việc và cách liên hệ các cơ sở của VitalCare. Đăng ký khám trực tuyến, nhận số thứ tự ngay."
      />
      <div className="mx-auto grid max-w-6xl gap-4 px-4 pb-12 sm:px-6 md:grid-cols-2">
        {isLoading &&
          [0, 1].map((key) => (
            <Skeleton key={key} className="h-56 rounded-2xl" />
          ))}
        {error && (
          <p className="text-destructive">{(error as Error).message}</p>
        )}
        {clinics?.length === 0 && (
          <p className="text-muted-foreground">
            Hiện chưa có cơ sở nào nhận khám.
          </p>
        )}
        {clinics?.map((clinic) => (
          <ClinicCard key={clinic.id} clinic={clinic} />
        ))}
      </div>
    </>
  );
}

function ClinicCard({ clinic }: { clinic: PublicClinic }) {
  const registerLink = useRegisterLink();
  return (
    <Card className="rounded-2xl">
      <CardContent className="flex h-full flex-col gap-4">
        <h2 className="text-xl font-semibold tracking-tight">{clinic.name}</h2>
        <ContactLines clinic={clinic} />
        <OpeningHours hours={clinic.openingHours} />
        <div className="mt-auto flex flex-wrap gap-2 pt-2">
          <Button asChild>
            <Link to={`/locations/${clinic.id}`}>Xem chi tiết</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to={registerLink}>
              <CalendarPlusIcon />
              Đăng ký khám
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ContactLines({ clinic }: { clinic: PublicClinic }) {
  return (
    <ul className="flex flex-col gap-2 text-sm">
      {clinic.address && (
        <li className="flex items-start gap-2">
          <MapPinIcon className="text-primary mt-0.5 size-4 shrink-0" />
          {clinic.address}
        </li>
      )}
      {clinic.phone && (
        <li className="flex items-center gap-2">
          <PhoneIcon className="text-primary size-4 shrink-0" />
          <a
            href={`tel:${clinic.phone}`}
            className="font-medium tabular-nums hover:underline"
          >
            {displayPhone(clinic.phone)}
          </a>
        </li>
      )}
      {clinic.email && (
        <li className="flex items-center gap-2">
          <MailIcon className="text-primary size-4 shrink-0" />
          <a href={`mailto:${clinic.email}`} className="hover:underline">
            {clinic.email}
          </a>
        </li>
      )}
    </ul>
  );
}

function OpeningHours({ hours }: { hours: Opening[] }) {
  const lines = openingLines(hours);
  return (
    <div className="bg-muted/50 rounded-xl p-3 text-sm">
      <p className="mb-1 flex items-center gap-2 font-medium">
        <ClockIcon className="text-primary size-4" />
        Giờ làm việc
      </p>
      {lines.length === 0 ? (
        <p className="text-muted-foreground">
          Liên hệ cơ sở để biết giờ làm việc.
        </p>
      ) : (
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-0.5">
          {lines.map((line) => (
            <div key={line.days} className="contents">
              <dt className="text-muted-foreground">{line.days}</dt>
              <dd className="tabular-nums">{line.times}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

/** One clinic with its doctors and the days each sees patients. */
export function PublicClinicShow() {
  const { id } = useParams();
  const registerLink = useRegisterLink();
  const {
    data: clinic,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["public", "clinics", id],
    retry: publicRetry,
    queryFn: () => publicGet<PublicClinicDetail>(`clinics/${id}`),
    enabled: Boolean(id),
  });

  return (
    <div className="mx-auto max-w-6xl px-4 pt-6 pb-12 sm:px-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/locations">
          <ArrowLeftIcon />
          Tất cả cơ sở
        </Link>
      </Button>
      {isLoading && <Skeleton className="mt-4 h-64 rounded-2xl" />}
      {error && (
        <p className="text-destructive mt-4">{(error as Error).message}</p>
      )}
      {clinic && (
        <>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
            <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
              {clinic.name}
            </h1>
            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <Link to={registerLink}>
                  <CalendarPlusIcon />
                  Đăng ký khám
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/services">Bảng giá dịch vụ</Link>
              </Button>
              <Button
                variant="outline"
                onClick={() => openGuestChat(clinic.id)}
              >
                <MessageCircleIcon />
                Chat với phòng khám
              </Button>
            </div>
          </div>
          <div className="mt-6 grid gap-4 lg:grid-cols-[22rem_minmax(0,1fr)] lg:items-start">
            <Card className="rounded-2xl">
              <CardContent className="flex flex-col gap-4">
                <h2 className="font-semibold">Thông tin liên hệ</h2>
                <ContactLines clinic={clinic} />
                <OpeningHours hours={clinic.openingHours} />
              </CardContent>
            </Card>
            <Card className="rounded-2xl">
              <CardContent className="flex flex-col gap-4">
                <h2 className="flex items-center gap-2 font-semibold">
                  <StethoscopeIcon className="text-primary size-4" />
                  Bác sĩ ({clinic.doctors.length})
                </h2>
                {clinic.doctors.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    Chưa có bác sĩ nhận khám tại cơ sở này.
                  </p>
                ) : (
                  <ul className="grid gap-3 sm:grid-cols-2">
                    {clinic.doctors.map((doctor) => (
                      <li
                        key={doctor.id}
                        className="flex flex-col gap-2 rounded-xl border p-3"
                      >
                        <div>
                          <p className="font-medium">{doctor.fullName}</p>
                          <p className="text-muted-foreground text-sm">
                            {[doctor.professionalTitle, doctor.specialty]
                              .filter(Boolean)
                              .join(" · ") || "Bác sĩ"}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {doctor.workingDays.length === 0 ? (
                            <span className="text-muted-foreground text-xs">
                              Chưa có lịch khám
                            </span>
                          ) : (
                            doctor.workingDays.map((day) => (
                              <Badge key={day} variant="secondary">
                                {WEEKDAY_LABELS[day]}
                              </Badge>
                            ))
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
