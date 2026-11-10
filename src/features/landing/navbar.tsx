import "@fontsource/be-vietnam-pro/vietnamese-800.css";
import "@fontsource/be-vietnam-pro/latin-800.css";
import { useIsAuthenticated } from "@refinedev/core";
import { MenuIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router";

import { Button, buttonVariants } from "@/shared/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/shared/ui/sheet";
import { cn } from "@/shared/lib/utils";

/** Each item is a section of the landing and a page of its own. */
const NAV = [
  { id: "co-so", to: "/locations", label: "Cơ sở" },
  { id: "dich-vu", to: "/services", label: "Dịch vụ & giá" },
  { id: "so-cuu", to: "/first-aid", label: "Sơ cứu" },
];

// The bar's ink and hover tint: the landing's teal, deepened for text.
const quiet = "text-[#0f3d3f] hover:bg-[#e3f4f1] hover:text-[#0b5f63]";
const current = "bg-[#e3f4f1] text-[#0b5f63]";
// The site's call to action, a little depth from left to right.
const primary =
  "bg-gradient-to-r from-[#0b5f63] to-[#008c91] text-white shadow-sm hover:from-[#094f52] hover:to-[#007c80]";
// Over the landing's dark film: white text, as the header has always been there.
const onDark = "text-white hover:bg-white/10 hover:text-white";

/**
 * The one header of the public site, the landing and the clinic, price and first-aid pages alike:
 * a floating bar of frosted white pinned over the page. On the landing, `onSection` scrolls to the
 * item's section, and while the film is on screen the bar is see-through with white text, sitting
 * on the film as the header always did; elsewhere each item opens its page. The bar is fixed, so a
 * page under it leaves room at its top.
 */
export function SiteNavbar({ onSection }: { onSection?: (id: string) => void }) {
  const { data: auth } = useIsAuthenticated();
  const signedIn = auth?.authenticated ?? false;
  const [menuOpen, setMenuOpen] = useState(false);
  // On the landing, the item whose section crosses the middle of the screen is lit.
  const [inView, setInView] = useState<string | null>(null);
  const spying = Boolean(onSection);
  // On the landing: whether the dark film is still behind the bar, i.e. the first section below it
  // has not reached the bar yet.
  const [onFilm, setOnFilm] = useState(spying);
  const dark = spying && onFilm;

  useEffect(() => {
    if (!spying) return;
    const check = () => {
      const below = document.getElementById("tinh-nang");
      setOnFilm(below ? below.getBoundingClientRect().top > 96 : window.scrollY < window.innerHeight);
    };
    check();
    window.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check);
    return () => {
      window.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
    };
  }, [spying]);

  useEffect(() => {
    if (!spying) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = entry.target.id;
          if (entry.isIntersecting) setInView(id);
          else setInView((now) => (now === id ? null : now));
        }
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    for (const { id } of NAV) {
      const section = document.getElementById(id);
      if (section) observer.observe(section);
    }
    return () => observer.disconnect();
  }, [spying]);

  const { pathname } = useLocation();

  const items = (inSheet: boolean) =>
    NAV.map((item) => {
      const className = cn(inSheet && "justify-start");
      if (onSection) {
        return (
          <Button
            key={item.id}
            variant="ghost"
            aria-current={inView === item.id ? "location" : undefined}
            className={cn(inView === item.id ? current : dark && !inSheet ? onDark : quiet, className)}
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
      <div
        className={cn(
          "mx-auto flex max-w-[1600px] items-center justify-between gap-4 rounded-2xl border px-3 py-2 transition-[background-color,border-color,box-shadow] duration-300 sm:px-5",
          dark
            ? "border-transparent bg-transparent shadow-none"
            : "border-[#d3e8e4] bg-white/90 shadow-lg shadow-[#06282a]/20 backdrop-blur-md",
        )}
      >
        <Link
          to="/"
          onClick={(event) => {
            // Already on the landing page: the link would go nowhere, so it goes to the top.
            if (pathname !== "/") return;
            event.preventDefault();
            const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
            window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
          }}
          className={cn(
            "ml-2 flex flex-col items-center gap-0.5 rounded-md text-sm leading-none font-extrabold tracking-tight transition-colors duration-300 sm:ml-6",
            dark ? "text-white" : "text-[#0f3d3f]",
          )}
          style={{ fontFamily: '"Be Vietnam Pro", var(--font-sans)' }}
        >
          <img src="/vitalcare-mark.png" alt="" className="size-12 rounded-xl border border-[#d3e8e4] bg-white p-1" />
          VitalCare
        </Link>
        {/* One even gap between every item, links and buttons alike. */}
        <nav className="flex items-center gap-2">
          <div className="hidden items-center gap-1 lg:flex">{items(false)}</div>
          {signedIn ? (
            <Button asChild variant={dark ? "secondary" : "default"} className={dark ? undefined : primary}>
              <Link to="/dashboard">Vào trang của tôi</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" className={dark ? onDark : quiet}>
                <Link to="/login">Đăng nhập</Link>
              </Button>
              <Button asChild variant={dark ? "secondary" : "default"} className={cn("hidden sm:inline-flex", !dark && primary)}>
                <Link to="/register">Tạo tài khoản</Link>
              </Button>
            </>
          )}
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className={cn("lg:hidden", dark ? onDark : quiet)} aria-label="Mở menu">
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
