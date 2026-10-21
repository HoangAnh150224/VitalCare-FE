import { type ReactNode, useLayoutEffect, useRef, useState } from "react";

import { Button } from "@/shared/ui/button";

import { ALERT_NOTE, SCENES } from "../data";
import { AlertSteps } from "./captions";
import { AlertCard, DashboardMock } from "./dashboard-mock";
import { DataFlow } from "./data-flow";
import { Devices } from "./devices";
import { PhoneMock } from "./phone-mock";

/**
 * The film for somebody who asked for less motion: the same scenes, in their
 * final state, one under another, scrolled normally. Nothing pins, nothing
 * moves.
 */
export function StillStory({ header, onExplore }: { header: ReactNode; onExplore: () => void }) {
  const visuals: ReactNode[] = [
    <img
      key="photo"
      src="/landing/wrist-monitor.webp"
      alt="Thiết bị theo dõi sức khỏe đeo trên cổ tay"
      className="size-full rounded-3xl object-cover"
    />,
    <Fit key="devices" w={940} h={640}>
      <Devices />
    </Fit>,
    <Fit key="flow" w={940} h={640}>
      <DataFlow />
    </Fit>,
    <Fit key="dash" w={940} h={640}>
      <DashboardMock />
    </Fit>,
    <Fit key="alert" w={340} h={300}>
      <AlertCard />
    </Fit>,
    <Fit key="phone" w={300} h={620}>
      <PhoneMock />
    </Fit>,
  ];

  return (
    <section className="cine cine-still relative" aria-label="Hành trình của một lần đo">
      <div className="relative h-20">{header}</div>
      {SCENES.map((scene, i) => (
        <div key={scene.nav} className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:px-8 lg:grid-cols-[1fr_1.4fr]">
          <div>
            {i === 0 ? (
              <h1 className="landing-display cine-title-hero text-white">{scene.title}</h1>
            ) : (
              <h2 className="landing-display cine-title text-white">{scene.title}</h2>
            )}
            <p className="cine-body mt-5 text-[#cfe9e6]">{scene.body}</p>
            {i === 4 && (
              <>
                <AlertSteps />
                <p className="mt-5 text-[14px] leading-6 text-[#8fb9b5]">{ALERT_NOTE}</p>
              </>
            )}
            {i === 5 && (
              <Button size="lg" variant="secondary" className="mt-8" onClick={onExplore}>
                Khám phá VitalCare
              </Button>
            )}
          </div>
          <div className={i === 4 || i === 5 ? "mx-auto w-full max-w-[340px]" : ""}>
            {/* The drawings are made-up screens; the caption beside them says what they show. */}
            <div aria-hidden={i > 0}>{visuals[i]}</div>
          </div>
        </div>
      ))}
    </section>
  );
}

/** Shows a fixed-size drawing at whatever width its column has. */
function Fit({ w, h, children }: { w: number; h: number; children: ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setScale(Math.min(1, entry.contentRect.width / w)));
    observer.observe(el);
    return () => observer.disconnect();
  }, [w]);

  return (
    <div ref={box} className="relative w-full" style={{ height: h * scale }}>
      <div className="absolute top-0 left-0 origin-top-left" style={{ width: w, height: h, transform: `scale(${scale})` }}>
        {children}
      </div>
    </div>
  );
}
