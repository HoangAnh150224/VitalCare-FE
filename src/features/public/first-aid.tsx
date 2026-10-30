import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeftIcon,
  ChevronRightIcon,
  PhoneCallIcon,
  SearchIcon,
} from "lucide-react";
import { useDeferredValue, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router";

import { publicGet, publicRetry } from "@/shared/api/public";
import {
  EmergencyWarning,
  GuidanceBody,
  GuidanceDisclaimer,
} from "@/shared/components/first-aid/guidance";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Skeleton } from "@/shared/ui/skeleton";
import { cn } from "@/shared/lib/utils";
import type {
  FirstAidCategory,
  PublishedFirstAid,
} from "@/domains/first-aid/types";
import {
  FIRST_AID_CATEGORY_LABELS,
  FIRST_AID_CATEGORY_OPTIONS,
} from "@/domains/first-aid/types";
import { PublicPageHeader } from "./layout";
import { EmergencyDialog } from "./emergency";

const EmergencyButton = ({ className }: { className?: string }) => (
  <EmergencyDialog
    trigger={
      <Button
        variant="destructive"
        size="lg"
        className={cn("h-12 w-full text-base", className)}
      >
        <PhoneCallIcon />
        Liên hệ khẩn cấp
      </Button>
    }
  />
);

/** SRS 3.17.1: published guidance, searched and filtered by category; the emergency button always in reach. */
export function PublicFirstAid() {
  const [params, setParams] = useSearchParams();
  const category = (params.get("category") as FirstAidCategory | null) ?? null;
  const [query, setQuery] = useState(params.get("q") ?? "");
  const term = useDeferredValue(query.trim());

  const {
    data: articles,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["public", "first_aid", term, category],
    retry: publicRetry,
    queryFn: () => {
      const search = new URLSearchParams();
      if (term) search.set("q", term);
      if (category) search.set("category", category);
      return publicGet<PublishedFirstAid[]>(`first_aid?${search}`);
    },
  });

  const pick = (next: FirstAidCategory | null) => {
    const copy = new URLSearchParams(params);
    if (next) copy.set("category", next);
    else copy.delete("category");
    setParams(copy, { replace: true });
  };

  return (
    <>
      <PublicPageHeader
        title="Sơ cứu"
        description="Hướng dẫn xử trí ban đầu đã được nhân viên y tế duyệt. Đây là thông tin tham khảo, không thay thế chăm sóc y tế."
      />
      <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 pb-12 sm:px-6">
        <div className="relative">
          <SearchIcon className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm hướng dẫn sơ cứu"
            aria-label="Tìm hướng dẫn sơ cứu"
            className="h-11 pl-9"
          />
        </div>
        <div
          className="flex flex-wrap gap-2"
          role="group"
          aria-label="Danh mục"
        >
          <CategoryChip active={category === null} onClick={() => pick(null)}>
            Tất cả
          </CategoryChip>
          {FIRST_AID_CATEGORY_OPTIONS.map((option) => (
            <CategoryChip
              key={option.value}
              active={category === option.value}
              onClick={() => pick(option.value)}
            >
              {option.label}
            </CategoryChip>
          ))}
        </div>
        <EmergencyButton />

        {isLoading &&
          [0, 1, 2].map((key) => (
            <Skeleton key={key} className="h-20 rounded-xl" />
          ))}
        {error && (
          <p className="text-destructive">{(error as Error).message}</p>
        )}
        {articles?.length === 0 && (
          <p className="text-muted-foreground py-6 text-center">
            Không có hướng dẫn nào khớp. Thử từ khoá khác.
          </p>
        )}
        <ul className="flex flex-col gap-3">
          {articles?.map((article) => (
            <li key={article.id}>
              <Link
                to={`/first-aid/${article.id}`}
                className="hover:border-primary/50 hover:bg-muted/40 flex items-center gap-3 rounded-xl border p-4 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-lg font-semibold">{article.title}</p>
                  <p className="text-muted-foreground text-sm">
                    {article.summary}
                  </p>
                </div>
                <span className="text-muted-foreground hidden text-xs sm:inline">
                  {FIRST_AID_CATEGORY_LABELS[article.category]}
                </span>
                <ChevronRightIcon className="text-muted-foreground size-5 shrink-0" />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}

function CategoryChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "hover:bg-muted"
      )}
    >
      {children}
    </button>
  );
}

/** SRS 3.17.2: one article as published, with the emergency button at its foot. */
export function PublicFirstAidShow() {
  const { id } = useParams();
  const {
    data: article,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["public", "first_aid", id],
    retry: publicRetry,
    queryFn: () => publicGet<PublishedFirstAid>(`first_aid/${id}`),
    enabled: Boolean(id),
  });

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 pt-6 pb-12 sm:px-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2 self-start">
        <Link to="/first-aid">
          <ArrowLeftIcon />
          Tất cả hướng dẫn
        </Link>
      </Button>
      {isLoading && <Skeleton className="h-96 rounded-2xl" />}
      {error && <p className="text-destructive">{(error as Error).message}</p>}
      {article && (
        <article className="flex flex-col gap-4">
          <header>
            <p className="text-primary text-sm font-medium">
              {FIRST_AID_CATEGORY_LABELS[article.category]}
            </p>
            <h1 className="font-display text-3xl font-extrabold tracking-tight">
              {article.title}
            </h1>
            <GuidanceDisclaimer className="mt-2" />
          </header>
          <EmergencyWarning text={article.emergencyWarning} />
          <GuidanceBody body={article.body} />
        </article>
      )}
      <EmergencyButton className="mt-4" />
    </div>
  );
}
