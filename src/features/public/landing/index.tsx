import "@fontsource/be-vietnam-pro/vietnamese-600.css";
import "@fontsource/be-vietnam-pro/latin-600.css";
import "@fontsource/be-vietnam-pro/vietnamese-800.css";
import "@fontsource/be-vietnam-pro/latin-800.css";
import "lenis/dist/lenis.css";
import { useIsAuthenticated } from "@refinedev/core";
import { Link } from "react-router";

import "./landing.css";

import { GuestChatLauncher } from "@/shared/components/chat/guest-chat";

import { Features, FinalCall, HowItWorks, Platform } from "./sections";
import { ClinicsSection, FirstAidSection, ServicesSection } from "./public-sections";
import { SiteNavbar } from "./navbar";
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

  return (
    <div className="landing min-h-svh">
      <SiteNavbar onSection={(id) => scrollTo(`#${id}`)} />
      <main>
        <CinematicStory onExplore={explore} />
        <Features />
        <HowItWorks animate />
        <ClinicsSection />
        <ServicesSection />
        <Platform />
        <FirstAidSection />
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
