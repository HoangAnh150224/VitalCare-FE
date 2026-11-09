import { PhoneCallIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Outlet, useLocation } from "react-router";

import { Button } from "@/shared/ui/button";
import { SiteNavbar } from "@/features/landing/navbar";
import { NOT_AN_EMERGENCY_SERVICE } from "@/domains/first-aid/types";
import { GuestChatLauncher } from "@/shared/components/chat/guest-chat";
import { EmergencyDialog } from "./emergency";
import { PageArrival } from "./page-loader";

/**
 * The frame of the public pages: what a visitor reads before signing in —
 * clinics, prices, first aid. Reachable signed in too; the header then leads
 * back into the app instead of to the sign-in form.
 */
export function PublicLayout({ children }: { children?: ReactNode }) {
  const { pathname } = useLocation();
  return (
    <div className="bg-background flex min-h-svh flex-col">
      <SiteNavbar />

      {/* Room for the pinned bar. */}
      <main className="flex-1 pt-20">
        {/* Keyed by the page, so each one arrives afresh: the loader, then heading and list lifting in. */}
        <PageArrival key={pathname}>{children ?? <Outlet />}</PageArrival>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-6 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="text-muted-foreground">{NOT_AN_EMERGENCY_SERVICE}</p>
          <EmergencyDialog
            trigger={
              <Button variant="destructive" size="sm" className="shrink-0">
                <PhoneCallIcon />
                Số khẩn cấp
              </Button>
            }
          />
        </div>
      </footer>
      <GuestChatLauncher />
    </div>
  );
}

/** The page's own heading block, the same on every public page. */
export function PublicPageHeader({
  title,
  description,
  children,
}: {
  title: string;
  description?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-8 pb-4 sm:px-6">
      <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
        {title}
      </h1>
      {description && (
        <p className="text-muted-foreground mt-2 max-w-2xl">{description}</p>
      )}
      {children}
    </div>
  );
}
