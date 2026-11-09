import { useQuery } from "@tanstack/react-query";
import { ArrowRightIcon, ChevronRightIcon, PhoneCallIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router";

import { publicGet, publicRetry } from "@/shared/api/public";
import { Button } from "@/shared/ui/button";
import { Skeleton } from "@/shared/ui/skeleton";
import { FIRST_AID_CATEGORY_LABELS, type PublishedFirstAid } from "@/domains/first-aid/types";
import { ClinicGrid } from "@/features/public/clinics";
import { EmptyState } from "@/features/public/empty-state";
import { EmergencyDialog } from "@/features/public/emergency";
import { ServicePriceList } from "@/features/public/services";

/** The public pages, shown in place on the landing; each still has its own page for the whole of it. */
function PublicSection({
  id,
  title,
  lead,
  more,
  band = false,
  children,
}: {
  id: string;
  title: string;
  lead: string;
  more: { to: string; label: string };
  band?: boolean;
  children: ReactNode;
}) {
  return (
    <section id={id} className={band ? "landing-band scroll-mt-28" : "scroll-mt-28"}>
      <div className="mx-auto max-w-6xl px-4 py-24 sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl">
            <h2 className="landing-display landing-section-title">{title}</h2>
            <p className="landing-muted mt-4 leading-7">{lead}</p>
          </div>
          <Button asChild variant="outline">
            <Link to={more.to}>
              {more.label}
              <ArrowRightIcon />
            </Link>
          </Button>
        </div>
        <div className="mt-10">{children}</div>
      </div>
    </section>
  );
}

export function ClinicsSection() {
  return (
    <PublicSection
      id="co-so"
      title="Cơ sở khám"
      lead="Địa chỉ, giờ làm việc và cách liên hệ các cơ sở của VitalCare. Đăng ký khám trực tuyến, nhận số thứ tự ngay."
      more={{ to: "/locations", label: "Tất cả cơ sở" }}
    >
      <ClinicGrid />
    </PublicSection>
  );
}

export function ServicesSection() {
  return (
    <PublicSection
      id="dich-vu"
      band
      title="Dịch vụ & bảng giá"
      lead="Áp dụng như nhau tại mọi cơ sở. Phí khám tính một lần cho mỗi lượt khám; xét nghiệm và thủ thuật chỉ làm khi bác sĩ chỉ định."
      more={{ to: "/services", label: "Xem bảng giá" }}
    >
      <ServicePriceList className="grid md:grid-cols-2" />
    </PublicSection>
  );
}

export function FirstAidSection() {
  // The same query as the first-aid page with no search, so the two share the cache.
  const { data: articles, isLoading, error } = useQuery({
    queryKey: ["public", "first_aid", "", null],
    retry: publicRetry,
    queryFn: () => publicGet<PublishedFirstAid[]>("first_aid?"),
  });

  return (
    <PublicSection
      id="so-cuu"
      band
      title="Sơ cứu"
      lead="Hướng dẫn xử trí ban đầu đã được nhân viên y tế duyệt. Đây là thông tin tham khảo, không thay thế chăm sóc y tế."
      more={{ to: "/first-aid", label: "Tất cả hướng dẫn" }}
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading && [0, 1, 2].map((key) => <Skeleton key={key} className="h-24 rounded-xl" />)}
        {error && <EmptyState tone="error" message={(error as Error).message} />}
        {articles?.length === 0 && <EmptyState message="Chưa có hướng dẫn sơ cứu nào được đăng." />}
        {articles?.slice(0, 6).map((article) => (
          <Link
            key={article.id}
            to={`/first-aid/${article.id}`}
            className="hover:border-primary/50 flex items-center gap-3 rounded-xl border bg-white p-4 transition-colors"
          >
            <div className="min-w-0 flex-1">
              <p className="text-primary text-xs font-medium">{FIRST_AID_CATEGORY_LABELS[article.category]}</p>
              <p className="landing-ink font-semibold">{article.title}</p>
              <p className="landing-muted line-clamp-2 text-sm">{article.summary}</p>
            </div>
            <ChevronRightIcon className="text-muted-foreground size-5 shrink-0" />
          </Link>
        ))}
      </div>
      <EmergencyDialog
        trigger={
          <Button variant="destructive" size="lg" className="mt-6 h-12 w-full text-base sm:w-auto">
            <PhoneCallIcon />
            Liên hệ khẩn cấp
          </Button>
        }
      />
    </PublicSection>
  );
}
