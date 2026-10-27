import "@fontsource/be-vietnam-pro/vietnamese-600.css";
import "@fontsource/be-vietnam-pro/latin-600.css";
import "@fontsource/be-vietnam-pro/vietnamese-800.css";
import "@fontsource/be-vietnam-pro/latin-800.css";

import type { PropsWithChildren } from "react";
import { useGetIdentity, useLogout } from "@refinedev/core";
import {
  CalendarCheck2Icon,
  CircleUserRoundIcon,
  FileHeartIcon,
  HouseIcon,
  LogOutIcon,
  UsersRoundIcon,
  type LucideIcon,
} from "lucide-react";
import { Link, useLocation } from "react-router";

import { ShellVariantContext } from "@/shared/components/layout/shell-variant";
import { Avatar, AvatarFallback } from "@/shared/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { cn } from "@/shared/lib/utils";
import { initials } from "@/shared/lib/format";

type NavItem = { to: string; label: string; icon: LucideIcon };

/** The portal's whole map: a customer has these screens and nothing else. */
const NAV: NavItem[] = [
  { to: "/dashboard", label: "Trang chủ", icon: HouseIcon },
  { to: "/my-appointments", label: "Lượt khám", icon: CalendarCheck2Icon },
  { to: "/my-results", label: "Kết quả", icon: FileHeartIcon },
  { to: "/my-profiles", label: "Hồ sơ", icon: UsersRoundIcon },
];

/** The phone's tab bar adds the account, which the desktop keeps behind the avatar. */
const TABS: NavItem[] = [...NAV, { to: "/profile", label: "Tài khoản", icon: CircleUserRoundIcon }];

type Identity = { fullName?: string; phone?: string };

/**
 * The shell for customers and patients: a light bar on top, the page in one
 * readable column, and on a phone a tab bar at the bottom — the layout the
 * SRS draws for the patient side (3.2.1), rather than the staff console with
 * its sidebar, command search and breadcrumbs.
 *
 * Staff never see it; `ShellLayout` in `app/router` picks it only for an
 * account whose permissions are all about its own records.
 */
export function PortalLayout({ children }: PropsWithChildren) {
  const { pathname } = useLocation();
  const isActive = (to: string) => pathname === to || pathname.startsWith(`${to}/`);

  return (
    <ShellVariantContext.Provider value="portal">
      <div className="portal-shell bg-background relative flex min-h-svh flex-col">
        {/* One soft wash of the brand behind the top of the page, and nothing else decorative. */}
        <div
          aria-hidden
          className="from-primary/8 pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b to-transparent"
        />

        <a
          href="#main-content"
          className={cn(
            "sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50",
            "focus:bg-primary focus:text-primary-foreground focus:rounded-lg focus:px-4 focus:py-2 focus:text-sm"
          )}
        >
          Chuyển đến nội dung chính
        </a>

        <header data-print="hide" className="bg-card/90 sticky top-0 z-30 shadow-[0_1px_0_color-mix(in_oklab,var(--foreground)_8%,transparent)] backdrop-blur-lg">
          <div className="mx-auto flex h-16 w-full max-w-5xl items-center gap-6 px-4 sm:px-6">
            <Link to="/dashboard" className="flex items-center gap-2.5">
              <img src="/vitalcare-mark.png" alt="" className="size-9 rounded-xl bg-white p-1 shadow-sm" />
              <span className="font-display text-lg font-extrabold tracking-tight">VitalCare</span>
            </Link>

            <nav aria-label="Điều hướng chính" className="hidden items-center gap-1 md:flex">
              {NAV.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  aria-current={isActive(item.to) ? "page" : undefined}
                  className={cn(
                    "rounded-full px-4 py-2 text-sm font-semibold transition-colors",
                    isActive(item.to)
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-card hover:text-foreground"
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="ms-auto">
              <AccountMenu />
            </div>
          </div>
        </header>

        <main
          id="main-content"
          className={cn(
            "relative mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8",
            // Room for the tab bar, which sits over the bottom of the page on a phone.
            "pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-10"
          )}
        >
          {children}
        </main>

        <nav
          data-print="hide"
          aria-label="Điều hướng"
          className={cn(
            "bg-card/90 fixed inset-x-0 bottom-0 z-30 rounded-t-3xl shadow-[0_-8px_24px_-12px_rgb(0_60_60/0.2)] backdrop-blur-lg md:hidden",
            "pb-[env(safe-area-inset-bottom)]"
          )}
        >
          <ul className="grid grid-cols-5">
            {TABS.map((item) => {
              const active = isActive(item.to);
              return (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex flex-col items-center gap-1 pt-2 pb-2 text-[11px]",
                      active ? "text-primary font-semibold" : "text-muted-foreground font-medium"
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-8 w-14 items-center justify-center rounded-full transition-colors",
                        active && "bg-primary text-primary-foreground shadow-sm shadow-primary/30"
                      )}
                    >
                      <item.icon className="size-5" strokeWidth={active ? 2.25 : 1.75} />
                    </span>
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </ShellVariantContext.Provider>
  );
}

PortalLayout.displayName = "PortalLayout";

function AccountMenu() {
  const { data: user } = useGetIdentity<Identity>();
  const { mutate: logout, isPending } = useLogout();
  const name = user?.fullName ?? "";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Tài khoản"
        className="focus-visible:ring-ring rounded-full focus-visible:outline-none focus-visible:ring-2"
      >
        <Avatar className="size-9">
          <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">{initials(name)}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-56">
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          <span className="truncate text-sm font-medium">{name}</span>
          {user?.phone && <span className="text-muted-foreground truncate text-xs font-normal">{user.phone}</span>}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/profile">
            <CircleUserRoundIcon className="size-4" />
            Tài khoản
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => logout()} className="text-destructive focus:text-destructive">
          <LogOutIcon className="size-4" />
          {isPending ? "Đang đăng xuất…" : "Đăng xuất"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
