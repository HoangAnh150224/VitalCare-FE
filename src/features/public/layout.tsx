import { useIsAuthenticated } from "@refinedev/core";
import { MenuIcon, PhoneCallIcon } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Link, NavLink, Outlet } from "react-router";

import { Button } from "@/shared/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/shared/ui/sheet";
import { cn } from "@/shared/lib/utils";
import { NOT_AN_EMERGENCY_SERVICE } from "@/domains/first-aid/types";
import { EmergencyDialog } from "./emergency";

const NAV = [
  { to: "/locations", label: "Cơ sở" },
  { to: "/services", label: "Dịch vụ & giá" },
  { to: "/first-aid", label: "Sơ cứu" },
];

/**
 * The frame of the public pages: what a visitor reads before signing in —
 * clinics, prices, first aid. Reachable signed in too; the header then leads
 * back into the app instead of to the sign-in form.
 */
export function PublicLayout({ children }: { children?: ReactNode }) {
  const { data: auth } = useIsAuthenticated();
  const signedIn = auth?.authenticated ?? false;
  const [menuOpen, setMenuOpen] = useState(false);

  const links = (onPick?: () => void) =>
    NAV.map((item) => (
      <NavLink
        key={item.to}
        to={item.to}
        onClick={onPick}
        className={({ isActive }) =>
          cn(
            "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
            isActive
              ? "bg-primary/10 text-primary"
              : "text-foreground/80 hover:bg-muted hover:text-foreground"
          )
        }
      >
        {item.label}
      </NavLink>
    ));

  return (
    <div className="bg-background flex min-h-svh flex-col">
      <header className="bg-background/90 sticky top-0 z-30 border-b backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
          <Link
            to="/"
            className="font-display flex items-center gap-2 rounded-md text-lg font-extrabold"
          >
            <img
              src="/vitalcare-mark.png"
              alt=""
              className="size-8 rounded-lg"
            />
            VitalCare
          </Link>
          <nav className="ml-4 hidden items-center gap-1 md:flex">
            {links()}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            {signedIn ? (
              <Button asChild size="sm">
                <Link to="/dashboard">Vào trang của tôi</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm">
                  <Link to="/login">Đăng nhập</Link>
                </Button>
                <Button asChild size="sm" className="hidden sm:inline-flex">
                  <Link to="/register">Tạo tài khoản</Link>
                </Button>
              </>
            )}
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden"
                  aria-label="Mở menu"
                >
                  <MenuIcon />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72">
                <SheetHeader>
                  <SheetTitle>VitalCare</SheetTitle>
                </SheetHeader>
                <nav className="flex flex-col gap-1 px-4">
                  {links(() => setMenuOpen(false))}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <main className="flex-1">{children ?? <Outlet />}</main>

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
