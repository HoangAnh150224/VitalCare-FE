import { gsap } from "gsap";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { type ReactNode, useLayoutEffect, useRef, useState } from "react";

import { Button } from "@/shared/ui/button";

import { ALERT_NOTE, SCENES } from "../data";
import { AlertSteps } from "./captions";
import { AlertCard, DashboardMock, SPO2_CARD_CENTRE } from "./dashboard-mock";
import { DataFlow, PARTICLE_COUNT } from "./data-flow";
import { Devices } from "./devices";
import { PhoneMock } from "./phone-mock";

gsap.registerPlugin(ScrollTrigger, MotionPathPlugin);

/** Scroll length of the film, in viewport heights, on top of the pinned screen itself. */
const FILM_SCREENS = 7;

/** Where each scene starts on the timeline, which runs from 0 to 100. */
const SCENE_AT = [0, 14, 30, 50, 64, 82];

/** The two stage sizes everything is drawn at, then scaled to fit the screen. */
const STAGE = {
  wide: { w: 1600, h: 900 },
  tall: { w: 720, h: 1360 },
} as const;
type Layout = keyof typeof STAGE;

function measure(): { layout: Layout; scale: number } {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const layout: Layout = vw < 768 || vw / vh < 0.8 ? "tall" : "wide";
  const { w, h } = STAGE[layout];
  return { layout, scale: Math.min(vw / w, vh / h) };
}

/**
 * The film: one pinned screen and one timeline scrubbed by the scroll
 * position, so scrolling back plays it backwards and nothing runs on its own.
 *
 * Every layer is drawn at a fixed stage size (`STAGE`) and the whole stage is
 * scaled to the screen, so the scenes line up the same way at any size. The
 * layers render their final state; the timeline sets where each one starts.
 */
export function CinematicStory({ header, onExplore }: { header: ReactNode; onExplore: () => void }) {
  const root = useRef<HTMLElement>(null);
  const [{ layout, scale }, setFit] = useState(measure);

  useLayoutEffect(() => {
    let width = window.innerWidth;
    const onResize = () => {
      // A phone's address bar showing and hiding changes only the height;
      // re-scaling for that would make the stage jump in mid-scroll.
      if (window.innerWidth === width && window.matchMedia("(pointer: coarse)").matches) return;
      width = window.innerWidth;
      setFit(measure());
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;

    const ctx = gsap.context(() => {
      const q = gsap.utils.selector(el);
      const tl = gsap.timeline({ defaults: { ease: "none", duration: 1 } });

      // --- starting states -------------------------------------------------
      gsap.set(q(".cine-caption"), { autoAlpha: 0, y: 40 });
      gsap.set(q(".cine-caption[data-scene='0']"), { autoAlpha: 1, y: 0 });
      gsap.set(q(".cine-photo"), { scale: 1.06, transformOrigin: "30% 40%" });
      gsap.set(q(".cine-layer-devices"), { autoAlpha: 0, scale: 0.5 });
      gsap.set(q(".cine-devices-rig"), { rotateY: -38, rotateX: 14 });
      gsap.set(q(".cine-ring"), { scale: 0.6, autoAlpha: 0, transformOrigin: "50% 50%", transformBox: "fill-box" });
      gsap.set(q(".cine-leader, .cine-pulse, .cine-route, .cine-spo2-line, .cine-spo2-dip, .cine-spark, .cine-link-path"), {
        strokeDasharray: 1,
        strokeDashoffset: 1,
      });
      gsap.set(q(".cine-label"), { autoAlpha: 0, y: 16 });
      gsap.set(q(".cine-layer-flow"), { autoAlpha: 0 });
      gsap.set(q(".cine-node"), { autoAlpha: 0, scale: 0.7 });
      gsap.set(q(".cine-layer-dash"), { autoAlpha: 0 });
      gsap.set(q(".cine-dash-rig"), {
        transformOrigin: SPO2_CARD_CENTRE,
        rotateX: 52,
        rotateZ: -10,
        y: 140,
        scale: 0.7,
      });
      gsap.set(q(".cine-card"), { autoAlpha: 0, y: 24 });
      gsap.set(q(".cine-threshold, .cine-dip-zone, .cine-alert-row, .cine-alerted"), { autoAlpha: 0 });
      gsap.set(q(".cine-calm"), { autoAlpha: 1 });
      gsap.set(q(".cine-dip-dot, .cine-bell"), { scale: 0, transformOrigin: "50% 50%", transformBox: "fill-box" });
      gsap.set(q(".cine-alert"), { autoAlpha: 0, x: 60 });
      gsap.set(q(".cine-ack"), { autoAlpha: 0, y: 10 });
      gsap.set(q(".cine-step"), { autoAlpha: 0.3 });
      gsap.set(q(".cine-phone-rig"), { autoAlpha: 0, x: 140, rotateY: -32 });
      gsap.set(q(".cine-phone-item"), { autoAlpha: 0, y: 14 });

      const caption = (from: number, to: number, at: number) => {
        tl.to(q(`.cine-caption[data-scene='${from}']`), { autoAlpha: 0, y: -40, duration: 3 }, at);
        tl.to(q(`.cine-caption[data-scene='${to}']`), { autoAlpha: 1, y: 0, duration: 3 }, at + 2);
      };

      // --- 1. at home: the camera moves in on the device on the finger ------
      tl.to(q(".cine-photo"), { scale: 2.6, duration: 13 }, 1);
      tl.to(q(".cine-photo-wrap"), { autoAlpha: 0, duration: 4 }, 10);
      tl.to(q(".cine-scroll-hint"), { autoAlpha: 0, duration: 2 }, 0);
      caption(0, 1, 9);

      // --- 2. the reading: devices in the round, numbers counting up --------
      tl.to(q(".cine-layer-devices"), { autoAlpha: 1, scale: 1, duration: 7, ease: "power2.out" }, 11);
      tl.to(q(".cine-devices-rig"), { rotateY: 8, rotateX: 4, duration: 19 }, 11);
      tl.to(q(".cine-ring"), { scale: 1, autoAlpha: 1, duration: 5, stagger: 0.6 }, 16);
      tl.to(q(".cine-leader"), { strokeDashoffset: 0, duration: 4, stagger: 1 }, 19);
      tl.to(q(".cine-label"), { autoAlpha: 1, y: 0, duration: 3, stagger: 1 }, 20);
      tl.to(q(".cine-pulse"), { strokeDashoffset: 0, duration: 12 }, 18);
      q(".cine-num").forEach((node: HTMLElement) => {
        const to = Number(node.dataset.to);
        const decimals = Number(node.dataset.decimals ?? 0);
        const proxy = { value: 0 };
        node.textContent = format(0, decimals);
        tl.to(proxy, { value: to, duration: 6, onUpdate: () => (node.textContent = format(proxy.value, decimals)) }, 20);
      });

      // --- 3. on its way: the device becomes the first node of the route ----
      tl.to(q(".cine-label, .cine-ring, .cine-leader, .cine-pulse"), { autoAlpha: 0, duration: 3 }, 30);
      tl.to(q(".cine-layer-devices"), { x: -360, y: 10, scale: 0.26, duration: 6, ease: "power1.inOut" }, 30);
      tl.to(q(".cine-layer-devices"), { autoAlpha: 0, duration: 2 }, 35);
      caption(1, 2, 30);
      tl.to(q(".cine-layer-flow"), { autoAlpha: 1, duration: 2 }, 33);
      tl.to(q(".cine-node"), { autoAlpha: 1, scale: 1, duration: 2.5, stagger: 3 }, 34);
      tl.to(q(".cine-route"), { strokeDashoffset: 0, duration: 10 }, 35);
      const route = el.querySelector<SVGPathElement>("#cine-flow-route");
      q(".cine-particle").forEach((dot: Element, i: number) => {
        tl.fromTo(
          dot,
          { autoAlpha: 0 },
          {
            autoAlpha: 1,
            duration: 7,
            motionPath: { path: route!, align: route!, alignOrigin: [0.5, 0.5] },
          },
          36 + (i * 8) / PARTICLE_COUNT,
        );
      });

      // --- 4. the dashboard assembles where the data arrives ---------------
      caption(2, 3, 48);
      tl.to(q(".cine-particle"), { autoAlpha: 0, duration: 2 }, 50);
      tl.to(q(".cine-layer-flow"), { autoAlpha: 0, scale: 0.86, duration: 4 }, 50);
      tl.to(q(".cine-layer-dash"), { autoAlpha: 1, duration: 3 }, 50);
      tl.to(q(".cine-dash-rig"), { rotateX: 0, rotateZ: 0, y: 0, scale: 1, duration: 8, ease: "power2.out" }, 50);
      tl.to(q(".cine-card"), { autoAlpha: 1, y: 0, duration: 3, stagger: 0.45 }, 53);
      tl.to(q(".cine-spo2-line, .cine-spark"), { strokeDashoffset: 0, duration: 6 }, 56);

      // --- 5. the dip, the alert, and who picks it up ----------------------
      caption(3, 4, 63);
      tl.to(q(".cine-dash-rig"), { scale: 1.55, duration: 6, ease: "power1.inOut" }, 64);
      tl.to(q(".cine-threshold, .cine-dip-zone"), { autoAlpha: 1, duration: 2 }, 66);
      tl.to(q(".cine-spo2-dip"), { strokeDashoffset: 0, duration: 4 }, 67);
      tl.to(q(".cine-dip-dot, .cine-bell"), { scale: 1, duration: 1.5, ease: "back.out(3)" }, 70.5);
      tl.to(q(".cine-calm"), { autoAlpha: 0, duration: 1 }, 70);
      tl.to(q(".cine-alerted, .cine-alert-row"), { autoAlpha: 1, duration: 1 }, 70);
      tl.to(q(".cine-alert"), { autoAlpha: 1, x: 0, duration: 3, ease: "power2.out" }, 71);
      tl.to(q(".cine-step"), { autoAlpha: 1, duration: 1, stagger: 2 }, 73);
      tl.to(q(".cine-ack"), { autoAlpha: 1, y: 0, duration: 2 }, 77);

      // --- 6. step back: the clinic's screen and the family's phone --------
      caption(4, 5, 82);
      tl.to(q(".cine-alert"), { autoAlpha: 0, x: 40, duration: 3 }, 82);
      tl.to(q(".cine-dash-rig"), { scale: 0.6, x: -193, rotateY: 14, duration: 7, ease: "power1.inOut" }, 83);
      tl.to(q(".cine-phone-rig"), { autoAlpha: 1, x: 0, rotateY: -10, duration: 6, ease: "power2.out" }, 86);
      tl.to(q(".cine-link-path"), { strokeDashoffset: 0, duration: 4 }, 88);
      tl.to(q(".cine-phone-item"), { autoAlpha: 1, y: 0, duration: 2, stagger: 0.8 }, 89);
      tl.to({}, { duration: 4 }, 96);

      // Which scene is on screen, for the dots at the side.
      const dots = q(".cine-progress-dot");
      const mark = () => {
        const time = tl.time();
        const active = SCENE_AT.findLastIndex((at) => time >= at - 0.01);
        dots.forEach((dot: HTMLElement, i: number) => dot.toggleAttribute("data-active", i === active));
      };

      ScrollTrigger.create({
        trigger: el,
        start: "top top",
        end: () => `+=${window.innerHeight * FILM_SCREENS}`,
        pin: true,
        scrub: 0.8,
        animation: tl,
        invalidateOnRefresh: true,
        onUpdate: mark,
        onRefresh: mark,
      });
    }, el);

    return () => ctx.revert();
  }, []);

  const { w, h } = STAGE[layout];

  return (
    <section ref={root} className="cine relative h-svh overflow-hidden" data-layout={layout} aria-label="Hành trình của một lần đo">
      {/* The opening shot, full bleed behind the stage. */}
      <div className="cine-photo-wrap absolute inset-0">
        <img
          src="/landing/oximeter-home.webp"
          alt="Máy đo SpO₂ kẹp trên ngón tay một bệnh nhân"
          className="cine-photo size-full object-cover"
          style={{ objectPosition: "30% 40%" }}
          fetchPriority="high"
        />
        <div className="cine-photo-shade absolute inset-0" />
      </div>
      <div className="cine-glow pointer-events-none absolute inset-0" aria-hidden="true" />

      {header}

      <div
        className="cine-stage absolute top-1/2 left-1/2"
        style={{ width: w, height: h, transform: `translate(-50%, -50%) scale(${scale})` }}
      >
        {SCENES.map((scene, i) => (
          <div key={scene.nav} className="cine-caption absolute" data-scene={i}>
            {i === 0 ? (
              <h1 className="landing-display cine-title-hero text-white">{scene.title}</h1>
            ) : (
              <h2 className="landing-display cine-title text-white">{scene.title}</h2>
            )}
            <p className="cine-body mt-5 text-[#cfe9e6]">{scene.body}</p>
            {i === 4 && (
              <>
                <AlertSteps />
                <p className="mt-5 max-w-[460px] text-[14px] leading-6 text-[#8fb9b5]">{ALERT_NOTE}</p>
              </>
            )}
            {i === 5 && (
              <Button size="lg" variant="secondary" className="mt-8" onClick={onExplore}>
                Khám phá VitalCare
              </Button>
            )}
          </div>
        ))}

        {/* A picture of the product, with made-up people in it: the captions say what it shows. */}
        <div className="cine-visual absolute h-[640px] w-[940px]" aria-hidden="true">
          <div className="cine-layer cine-layer-devices absolute inset-0">
            <Devices />
          </div>
          <div className="cine-layer cine-layer-flow absolute inset-0">
            <DataFlow />
          </div>
          <div className="cine-layer cine-layer-dash absolute inset-0">
            <div className="cine-dash-rig absolute inset-0">
              <DashboardMock />
            </div>
          </div>
          <div className="absolute top-[330px] left-[590px]">
            <AlertCard />
          </div>
          <svg className="pointer-events-none absolute inset-0 size-full overflow-visible" viewBox="0 0 940 640" aria-hidden="true">
            <path
              className="cine-link-path"
              pathLength={1}
              d="M560 300 C590 300 600 260 640 260"
              fill="none"
              stroke="#5fd4c7"
              strokeWidth="2.5"
              strokeDasharray="1"
            />
          </svg>
          <div className="cine-phone-rig absolute top-[10px] left-[630px]">
            <PhoneMock />
          </div>
        </div>
      </div>

      <div className="cine-progress absolute top-1/2 right-6 hidden -translate-y-1/2 flex-col gap-3 md:flex" aria-hidden="true">
        {SCENES.map((scene) => (
          <span key={scene.nav} className="cine-progress-dot flex items-center justify-end gap-3 text-[12px]">
            <span className="cine-progress-mark" />
          </span>
        ))}
      </div>

      <p className="cine-scroll-hint absolute bottom-14 left-1/2 -translate-x-1/2 whitespace-nowrap text-[13px] sm:bottom-8 text-[#cfe9e6]">
        Cuộn để xem hành trình của một lần đo
      </p>
      <p className="absolute bottom-4 left-4 rounded-full bg-black/30 px-3 py-1 text-[11px] text-[#cfe9e6] sm:left-6">
        Minh họa · dữ liệu mô phỏng
      </p>
    </section>
  );
}

function format(value: number, decimals: number) {
  return value.toLocaleString("vi-VN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}
