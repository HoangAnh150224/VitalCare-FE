import "@fontsource/be-vietnam-pro/vietnamese-600.css";
import "@fontsource/be-vietnam-pro/latin-600.css";
import "@fontsource/be-vietnam-pro/vietnamese-800.css";
import "@fontsource/be-vietnam-pro/latin-800.css";
import "lenis/dist/lenis.css";
import { useIsAuthenticated } from "@refinedev/core";
import { Link } from "react-router";

import "./landing.css";

import { Button } from "@/shared/ui/button";

import { AiAssist, Features, FinalCall, HowItWorks, Platform } from "./sections";
import { CinematicStory } from "./story/cinematic-story";
import { StillStory } from "./story/still-story";
import { useReducedMotion, useSmoothScroll } from "./use-smooth-scroll";

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
  const reduced = useReducedMotion();
  const scrollTo = useSmoothScroll(!reduced);
  const explore = () => scrollTo("#tinh-nang");

  const header = (
    <header className="absolute inset-x-0 top-0 z-20 mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-5 sm:px-8">
      <Link to="/" className="landing-display flex items-center gap-2.5 rounded-md text-lg text-white">
        <img src="/vitalcare-mark.png" alt="" className="size-9 rounded-lg bg-white p-1" />
        VitalCare
      </Link>
      <nav className="flex items-center gap-2">
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
        {reduced ? (
          <StillStory header={header} onExplore={explore} />
        ) : (
          <CinematicStory header={header} onExplore={explore} />
        )}
        <Features />
        <HowItWorks animate={!reduced} />
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
    </div>
  );
}
