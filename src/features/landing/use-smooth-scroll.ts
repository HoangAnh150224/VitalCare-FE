import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";

gsap.registerPlugin(ScrollTrigger);

const REDUCED = "(prefers-reduced-motion: reduce)";

/** Whether the visitor asked for less motion, kept current if they change it. */
export function useReducedMotion() {
  return useSyncExternalStore(subscribeReduced, () => window.matchMedia(REDUCED).matches);
}

function subscribeReduced(notify: () => void) {
  const query = window.matchMedia(REDUCED);
  query.addEventListener("change", notify);
  return () => query.removeEventListener("change", notify);
}

/**
 * Smooth (Lenis) scrolling for the landing page only, driving ScrollTrigger
 * from the same frames, and a `scrollTo` that goes through it.
 *
 * Torn down when the page unmounts — the sign-in screen and the app scroll
 * natively — and never started for somebody who asked for less motion.
 */
export function useSmoothScroll(enabled: boolean) {
  const lenis = useRef<Lenis | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const instance = new Lenis({ lerp: 0.09, wheelMultiplier: 0.9 });
    lenis.current = instance;
    instance.on("scroll", ScrollTrigger.update);
    const tick = (time: number) => instance.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(tick);
      gsap.ticker.lagSmoothing(500, 33);
      // destroy() leaves this 400 ms timer running (lenis 1.3.26); when it
      // fires it puts the `lenis` class back on <html> of whatever page is
      // open by then. Private, hence the cast.
      clearTimeout((instance as unknown as { _resetVelocityTimeout: number | null })._resetVelocityTimeout ?? undefined);
      instance.destroy();
      lenis.current = null;
    };
  }, [enabled]);

  return useCallback((target: string) => {
    const el = document.querySelector<HTMLElement>(target);
    if (!el) return;
    if (lenis.current) lenis.current.scrollTo(el, { duration: 1.6 });
    else el.scrollIntoView({ behavior: "auto", block: "start" });
  }, []);
}
