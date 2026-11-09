import "@fontsource/be-vietnam-pro/vietnamese-800.css";
import "@fontsource/be-vietnam-pro/latin-800.css";
import { useIsAuthenticated } from "@refinedev/core";
import { MenuIcon } from "lucide-react";
import { useState } from "react";
import { Link, NavLink } from "react-router";

import { Button, buttonVariants } from "@/shared/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/shared/ui/sheet";
import { cn } from "@/shared/lib/utils";

/** Each item is a section of the landing and a page of its own. */
const NAV = [
  { id: "co-so", to: "/locations", label: "Cơ sở" },
  { id: "dich-vu", to: "/services", label: "Dịch vụ & giá" },
  { id: "so-cuu", to: "/first-aid", label: "Sơ cứu" },
];

// The bar's ink and hover tint: the film's medical blue, deepened for text.
const quiet = "text-[#0b2f4a] hover:bg-[#e8f2f8] hover:text-[#0a5a8c]";
const current = "bg-[#e8f2f8] text-[#0a5a8c]";
// The site's call to action, a little depth from left to right.
const primary =
  "bg-gradient-to-r from-[#0a599a] to-[#0a6eb4] text-white shadow-sm hover:from-[#084c84] hover:to-[#085c98]";

/**
 * The one header of the public site, the landing and the clinic, price and first-aid pages alike:
 * a floating bar of frosted white pinned over the page. On the landing, `onSection` scrolls to the
 * item's section; elsewhere each item opens its page. The bar is fixed, so a page under it leaves
 * room at its top.
 */
export function SiteNavbar({ onSection }: { onSection?: (id: string) => void }) {
  const { data: auth } = useIsAuthenticated();
  const signedIn = auth?.authenticated ?? false;
  const [menuOpen, setMenuOpen] = useState(false);

  const items = (inSheet: boolean) =>
    NAV.map((item) => {
      const className = cn(inSheet && "justify-start");
      if (onSection) {
        return (
          <Button
            key={item.id}
            variant="ghost"
            className={cn(quiet, className)}
            onClick={() => {
              setMenuOpen(false);
              onSection(item.id);
            }}
          >
            {item.label}
          </Button>
        );
      }
      return (
        <NavLink
          key={item.id}
          to={item.to}
          onClick={() => setMenuOpen(false)}
          className={({ isActive }) => cn(buttonVariants({ variant: "ghost" }), isActive ? current : quiet, className)}
        >
          {item.label}
        </NavLink>
      );
    });

  return (
    <header className="fixed inset-x-0 top-3 z-40 px-3 sm:px-6">
      <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 rounded-2xl border border-[#d6e6ef] bg-white/90 px-3 py-2 shadow-lg shadow-[#12568c]/20 backdrop-blur-md sm:px-5">
        <Link
          to="/"
          className="flex items-center gap-2.5 rounded-md text-lg font-extrabold tracking-tight text-[#0b2f4a]"
          style={{ fontFamily: '"Be Vietnam Pro", var(--font-sans)' }}
        >
          <img src="/vitalcare-mark.png" alt="" className="size-9 rounded-lg border border-[#d6e6ef] bg-white p-1" />
          VitalCare
        </Link>
        {/* One even gap between every item, links and buttons alike. */}
        <nav className="flex items-center gap-2">
          <div className="hidden items-center gap-1 lg:flex">{items(false)}</div>
          {signedIn ? (
            <Button asChild className={primary}>
              <Link to="/dashboard">Vào trang của tôi</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" className={quiet}>
                <Link to="/login">Đăng nhập</Link>
              </Button>
              <Button asChild className={cn("hidden sm:inline-flex", primary)}>
                <Link to="/register">Tạo tài khoản</Link>
              </Button>
            </>
          )}
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className={cn("lg:hidden", quiet)} aria-label="Mở menu">
                <MenuIcon />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetHeader>
                <SheetTitle>VitalCare</SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-1 px-4">{items(true)}</div>
            </SheetContent>
          </Sheet>
        </nav>
      </div>
    </header>
  );
}
