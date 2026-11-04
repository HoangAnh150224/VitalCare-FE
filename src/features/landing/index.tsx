import "@fontsource/be-vietnam-pro/vietnamese-600.css";
import "@fontsource/be-vietnam-pro/latin-600.css";
import "@fontsource/be-vietnam-pro/vietnamese-800.css";
import "@fontsource/be-vietnam-pro/latin-800.css";
import "lenis/dist/lenis.css";
import { useIsAuthenticated } from "@refinedev/core";
import { Link } from "react-router";

import "./landing.css";

import { Button } from "@/shared/ui/button";
import { GuestChatLauncher } from "@/shared/components/chat/guest-chat";

import { AiAssist, Features, FinalCall, HowItWorks, Platform } from "./sections";
import { CinematicStory } from "./story/cinematic-story";
import { useSmoothScroll } from "./use-smooth-scroll";

/**
 * The page everybody opens on: a film, scrubbed by the scroll, of one reading
 * going from a patient's finger to the clinic's screen and back to the
 * family's phone; then what VitalCare does and the ways in. Static: nothing
 * here calls the API, which answers nobody who is not signed in.
 */
export function Landing() {
  // Somebody already signed in goes on to the app instead of signing in again.
  const { data: auth } = useIsAuthenticated();
  const signedIn = auth?.authenticated ?? false;
  // The film plays for everybody, "reduce motion" or not: it only moves as the
  // visitor scrolls, and a still page was being mistaken for a broken one on
  // machines with Windows' animation effects off (the user's decision).
  const scrollTo = useSmoothScroll(true);
  const explore = () => scrollTo("#tinh-nang");

  const header = (
    <header className="absolute inset-x-0 top-0 z-20 mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-5 sm:px-8">
      <Link to="/" className="landing-display flex items-center gap-2.5 rounded-md text-lg text-white">
        <img src="/vitalcare-mark.png" alt="" className="size-9 rounded-lg bg-white p-1" />
        VitalCare
      </Link>
      <nav className="flex items-center gap-2">
        {/* The public pages, for anybody: where to go, what it costs, what to do in an emergency. */}
        <div className="mr-2 hidden items-center gap-1 lg:flex">
          {[
            { to: "/locations", label: "Cơ sở" },
            { to: "/services", label: "Dịch vụ & giá" },
            { to: "/first-aid", label: "Sơ cứu" },
          ].map((item) => (
            <Button key={item.to} asChild variant="ghost" className="text-white hover:bg-white/10 hover:text-white">
              <Link to={item.to}>{item.label}</Link>
            </Button>
          ))}
        </div>
        {signedIn ? (
          <Button asChild variant="secondary">
            <Link to="/dashboard">Vào trang của tôi</Link>
          </Button>
        ) : (
          <>
            <Button asChild variant="ghost" className="text-white hover:bg-white/10 hover:text-white">
              <Link to="/login">Đăng nhập</Link>
            </Button>
            <Button asChild variant="secondary" className="hidden sm:inline-flex">
              <Link to="/register">Tạo tài khoản</Link>
            </Button>
          </>
        )}
      </nav>
    </header>
  );

  return (
    <div className="landing min-h-svh">
      <main>
        <CinematicStory header={header} onExplore={explore} />
        <Features />
        <HowItWorks animate />
        <Platform />
        <AiAssist />
        <FinalCall signedIn={signedIn} />
      </main>

      <footer className="landing-rule">
        <div className="landing-muted mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm sm:px-8">
          <span>© 2026 VitalCare · Số liệu trên trang là dữ liệu mô phỏng.</span>
          <Link to="/login" className="landing-link rounded-sm">
            Nhân viên phòng khám đăng nhập tại đây
          </Link>
        </div>
      </footer>
      <GuestChatLauncher />
    </div>
  );
}
